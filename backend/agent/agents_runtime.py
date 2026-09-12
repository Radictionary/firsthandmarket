"""Two role-facing Agents SDK agents backed by Oxen.

The requester and provider agents never hand off to one another. Their shared
protocol is the validated request contract and offer record owned by the
deterministic application layer.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Callable

from agents import (
    Agent,
    ModelSettings,
    OpenAIChatCompletionsModel,
    RunContextWrapper,
    Runner,
    function_tool,
    set_tracing_disabled,
)
from openai import AsyncOpenAI

from offers import OfferStore

MatchFunction = Callable[..., list[dict[str, Any]]]
PostQueryFunction = Callable[..., dict[str, Any]]

DELIVERABLES = {"photo", "video", "text", "audio", "file", "other"}


@dataclass
class RequesterContext:
    requester_name: str
    approved: bool
    idempotency_key: str
    match_function: MatchFunction
    post_query_function: PostQueryFunction
    offers: OfferStore
    draft: dict[str, Any] | None = None
    ready_for_approval: bool = False
    matches: list[dict[str, Any]] = field(default_factory=list)
    selected_provider: dict[str, Any] | None = None
    offer: dict[str, Any] | None = None
    query_id: str | None = None


@dataclass
class ProviderContext:
    provider: dict[str, Any]
    offer: dict[str, Any]
    response_draft: str = ""


def _clean_list(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def _expand_match_tags(values: list[str], city: str | None) -> list[str]:
    """Normalize small model wording differences before exact-array matching."""

    normalized: list[str] = []
    for value in _clean_list(values):
        tag = value.lower().replace(" ", "-")
        normalized.append(tag)
        if tag.endswith("s") and len(tag) > 3:
            normalized.append(tag[:-1])
        elif len(tag) > 2:
            normalized.append(tag + "s")

    if city:
        prefix = city.lower().strip().replace(" ", "-")
        normalized.extend(prefix + "-" + tag for tag in list(normalized))
    return _clean_list(normalized)


@function_tool
def save_request_contract(
    context: RunContextWrapper[RequesterContext],
    objective: str,
    deliverable: str,
    subject: str,
    location_city: str,
    location_country: str,
    topic_tags: list[str],
    required_affiliations: list[str],
    required_access: list[str],
    deadline: str,
    acceptance_criteria: list[str],
    restrictions: list[str],
    freshness: str,
) -> str:
    """Save the complete structured request draft after collecting its details."""

    if deliverable not in DELIVERABLES:
        return f"Invalid deliverable. Choose one of: {', '.join(sorted(DELIVERABLES))}."
    context.context.draft = {
        "objective": objective.strip(),
        "deliverable": deliverable,
        "subject": subject.strip(),
        "location_city": location_city.strip() or None,
        "location_country": location_country.strip() or None,
        "topic_tags": _clean_list(topic_tags),
        "required_affiliations": _clean_list(required_affiliations),
        "required_access": _clean_list(required_access),
        "deadline": deadline.strip() or None,
        "acceptance_criteria": _clean_list(acceptance_criteria),
        "restrictions": _clean_list(restrictions),
        "freshness": freshness if freshness in {"now", "this_week", "evergreen"} else "now",
    }
    context.context.ready_for_approval = False
    return json.dumps(context.context.draft)


@function_tool
def mark_request_ready_for_approval(
    context: RunContextWrapper[RequesterContext],
) -> str:
    """Mark a complete request draft ready for the requester's explicit approval."""

    draft = context.context.draft
    if not draft:
        return "Save a request contract before marking it ready."
    required = ["objective", "deliverable", "subject", "topic_tags", "acceptance_criteria"]
    missing = [key for key in required if not draft.get(key)]
    if missing:
        return f"The request is missing: {', '.join(missing)}."
    context.context.ready_for_approval = True
    return "The contract is ready. Ask the requester to review and approve it in the UI."


@function_tool
def find_matching_provider(
    context: RunContextWrapper[RequesterContext],
) -> str:
    """Find one eligible provider and create their private offer notification."""

    state = context.context
    if not state.approved:
        return "Matching is blocked until the requester explicitly approves the contract."
    if not state.draft:
        return "No request contract is available."

    prior = state.offers.by_idempotency_key(state.idempotency_key)
    if prior:
        state.offer = prior
        state.selected_provider = prior["provider"]
        state.query_id = prior["query_id"]
        return json.dumps(prior)

    draft = state.draft
    tags = _expand_match_tags(
        list(draft.get("topic_tags") or []),
        draft.get("location_city"),
    )
    city = draft.get("location_city")

    matches = state.match_function(
        topic_tags=tags,
        city=city,
        country=draft.get("location_country"),
        limit=3,
    )
    if not matches and city:
        matches = state.match_function(topic_tags=tags, limit=3)
    state.matches = matches
    if not matches:
        return "No eligible provider is currently available. Suggest broadening the request."

    selected = matches[0]
    logged = state.post_query_function(
        question=draft["objective"],
        topic_tags=draft["topic_tags"],
        seeker_name=state.requester_name,
        location_city=draft.get("location_city"),
        location_country=draft.get("location_country"),
        freshness=draft.get("freshness", "now"),
    )
    reasons = [
        f"Expertise overlaps {', '.join(draft['topic_tags'])}",
        f"Trust score {selected.get('trust_score', 'not rated')}",
    ]
    if draft.get("location_city"):
        reasons.append(f"Current location matches {draft['location_city']}")

    offer = state.offers.create(
        idempotency_key=state.idempotency_key,
        query_id=logged["id"],
        requester_name=state.requester_name,
        provider=selected,
        contract=draft,
        reasons=reasons,
    )
    state.selected_provider = selected
    state.offer = offer
    state.query_id = logged["id"]
    return json.dumps(offer)


@function_tool
def save_provider_response_draft(
    context: RunContextWrapper[ProviderContext],
    response: str,
) -> str:
    """Save a polished response draft only after the provider supplies the facts."""

    context.context.response_draft = response.strip()
    return context.context.response_draft


REQUESTER_INSTRUCTIONS = """You are the private Requester Agent for FirstHandMarket.

Your job is to turn a real-world information need into a precise request and,
only after explicit approval, route it to one suitable human provider.

Rules:
- Ask only the smallest useful follow-up question. Collect the objective,
  deliverable, subject, place/access needs, deadline, acceptance
  criteria, restrictions, freshness, and short matching tags.
- Never invent a missing detail. Empty location or access lists are valid when
  they are genuinely unnecessary.
- This hackathon demo is completely free. Never ask about budget, credits,
  price, rewards, payment, or compensation, and never add those to a contract.
- Once complete, call save_request_contract, then
  mark_request_ready_for_approval. Summarize the contract and tell the user to
  approve it in the UI.
- If the system says the contract is approved, call find_matching_provider.
- Select one provider only. The provider receives an offer notification and
  chooses whether to accept or decline.
- Never claim the provider answered, accepted, or submitted unless
  the application data says so.
- You cannot access provider email, calendars, files, or raw MCP output.
"""

PROVIDER_INSTRUCTIONS = """You are the private Provider Agent for FirstHandMarket.

You help one human provider understand an incoming request, decide whether it
fits, clarify constraints, and improve a response using only facts the provider
actually supplies.

Rules:
- Explain the offer's objective, deliverable, deadline, acceptance criteria,
  and restrictions clearly.
- Never accept or decline the offer. The provider must use the explicit UI
  buttons.
- Never fabricate firsthand experience. Ask for the missing real detail.
- If asked to improve a draft, preserve the provider's meaning and call
  save_provider_response_draft with the improved response.
- MCP connections may be added later. Do not claim Gmail, Calendar, Drive, or
  another source is connected unless the application explicitly says it is.
- Never expose provider-private context to the requester.
- This demo is free. Do not mention credits, prices, rewards, or compensation.
"""


class FirstHandAgents:
    def __init__(self, *, api_key: str, base_url: str, model_name: str) -> None:
        if not api_key:
            raise ValueError("OXEN_API_KEY is required")
        set_tracing_disabled(True)
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        model = OpenAIChatCompletionsModel(model=model_name, openai_client=client)
        settings = ModelSettings(parallel_tool_calls=False)
        self.model_name = model_name
        self.base_url = base_url
        self.requester = Agent[RequesterContext](
            name="FirstHand Requester Agent",
            instructions=REQUESTER_INSTRUCTIONS,
            model=model,
            model_settings=settings,
            tools=[
                save_request_contract,
                mark_request_ready_for_approval,
                find_matching_provider,
            ],
        )
        self.provider = Agent[ProviderContext](
            name="FirstHand Provider Agent",
            instructions=PROVIDER_INSTRUCTIONS,
            model=model,
            model_settings=settings,
            tools=[save_provider_response_draft],
        )

    @classmethod
    def from_env(cls) -> "FirstHandAgents":
        return cls(
            api_key=os.environ.get("OXEN_API_KEY") or os.environ.get("OPENAI_API_KEY", ""),
            base_url=os.environ.get("OXEN_BASE_URL")
            or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            model_name=os.environ.get("OXEN_MODEL")
            or os.environ.get("OPENAI_MODEL", "gemini-3-8-flash"),
        )

    async def requester_turn(
        self,
        *,
        message: str,
        history: list[dict[str, str]],
        context: RequesterContext,
    ) -> str:
        transcript = _transcript(history, message)
        if context.approved:
            transcript += "\n\nSYSTEM STATE: The requester explicitly approved the displayed contract. Match now."
        result = await Runner.run(self.requester, transcript, context=context, max_turns=7)
        return str(result.final_output)

    async def provider_turn(
        self,
        *,
        message: str,
        history: list[dict[str, str]],
        context: ProviderContext,
    ) -> str:
        private_state = json.dumps(
            {
                "provider": context.provider,
                "offer": context.offer,
                "current_response_draft": context.response_draft,
            },
            default=str,
        )
        transcript = (
            f"PRIVATE APPLICATION STATE:\n{private_state}\n\n"
            + _transcript(history, message)
        )
        result = await Runner.run(self.provider, transcript, context=context, max_turns=5)
        return str(result.final_output)


def _transcript(history: list[dict[str, str]], message: str) -> str:
    lines = ["Conversation so far:"]
    for item in history[-12:]:
        role = "REQUESTER" if item.get("role") == "user" else "AGENT"
        lines.append(f"{role}: {item.get('content', '')[:3000]}")
    lines.append(f"CURRENT USER MESSAGE: {message[:4000]}")
    return "\n".join(lines)
