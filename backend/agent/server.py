"""FastAPI integration for the two FirstHandMarket role agents."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from agents_runtime import FirstHandAgents, ProviderContext, RequesterContext  # noqa: E402
from demo_data import DEMO_PROVIDERS, make_demo_answer, match_demo_providers  # noqa: E402
from db import get_answers_for_query, match_informants, post_answer, post_query  # noqa: E402
from offers import OfferNotFoundError, offer_store  # noqa: E402

app = FastAPI(title="FirstHandMarket Agents", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

_agents: FirstHandAgents | None = None


def agents() -> FirstHandAgents:
    global _agents
    if _agents is None:
        _agents = FirstHandAgents.from_env()
    return _agents


def match_available_providers(**criteria):
    """Prefer the explicit UCLA fixture, then fall back to database people."""

    demo_matches = match_demo_providers(**criteria)
    if demo_matches:
        return demo_matches

    try:
        matches = match_informants(**criteria)
    except Exception:
        matches = []
    return matches


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4_000)


class RequesterTurnBody(BaseModel):
    requester_name: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=4_000)
    turn_id: str = Field(min_length=1, max_length=160)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)
    draft: dict[str, Any] | None = None
    ready_for_approval: bool = False
    approved: bool = False


class ProviderTurnBody(BaseModel):
    provider_id: str
    offer_id: str
    message: str = Field(min_length=1, max_length=4_000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)
    response_draft: str = Field(default="", max_length=8_000)


class OfferDecisionBody(BaseModel):
    provider_id: str
    decision: Literal["accept", "decline"]


class AnswerBody(BaseModel):
    provider_id: str
    content: str = Field(min_length=1, max_length=8_000)
    media_url: str | None = None


@app.get("/health")
def health():
    configured = bool(os.environ.get("OXEN_API_KEY") or os.environ.get("OPENAI_API_KEY"))
    return {
        "ok": True,
        "agents_sdk": True,
        "model": os.environ.get("OXEN_MODEL", "gemini-3-8-flash"),
        "endpoint": os.environ.get("OXEN_BASE_URL", "https://hub.oxen.ai/api/ai"),
        "model_configured": configured,
        "offer_store": "memory-demo",
    }


@app.post("/agent/requester/turn")
async def requester_turn(body: RequesterTurnBody):
    """Refine a request; after explicit approval, match and notify one provider."""

    context = RequesterContext(
        requester_name=body.requester_name.strip(),
        approved=body.approved,
        idempotency_key=f"requester:{body.requester_name.strip()}:{body.turn_id}",
        match_function=match_available_providers,
        post_query_function=post_query,
        offers=offer_store,
        draft=body.draft,
        ready_for_approval=body.ready_for_approval,
    )
    try:
        reply = await agents().requester_turn(
            message=body.message,
            history=[item.model_dump() for item in body.history],
            context=context,
        )
    except Exception as error:
        raise HTTPException(502, f"Requester agent failed: {error}") from error

    return {
        "reply": reply,
        "draft": context.draft,
        "ready_for_approval": context.ready_for_approval,
        "approved": body.approved,
        "matches": context.matches,
        "selected_provider": context.selected_provider,
        "offer": context.offer,
        "query_id": context.query_id,
    }


@app.get("/providers/demo")
def demo_providers():
    """Expose fake demo identities so their provider workspace can receive offers."""

    return {"providers": DEMO_PROVIDERS}


@app.get("/providers/{provider_id}/offers")
def provider_offers(provider_id: str):
    """Polling endpoint that powers the provider's in-app notifications."""

    return {"offers": offer_store.list_for_provider(provider_id)}


@app.get("/offers/{offer_id}")
def get_offer(offer_id: str):
    """Return current demo status so both role workspaces can stay in sync."""

    try:
        return offer_store.get(offer_id)
    except OfferNotFoundError as error:
        raise HTTPException(404, str(error)) from error


@app.post("/offers/{offer_id}/respond")
def respond_to_offer(offer_id: str, body: OfferDecisionBody):
    """Explicit provider decision; this action is never exposed as an agent tool."""

    try:
        return offer_store.respond(
            provider_id=body.provider_id,
            offer_id=offer_id,
            decision=body.decision,
        )
    except OfferNotFoundError as error:
        raise HTTPException(404, str(error)) from error
    except ValueError as error:
        raise HTTPException(409, str(error)) from error


@app.post("/agent/provider/turn")
async def provider_turn(body: ProviderTurnBody):
    """Let the provider privately discuss an offer with their own agent."""

    try:
        offer = offer_store.get(body.offer_id)
    except OfferNotFoundError as error:
        raise HTTPException(404, str(error)) from error
    if offer["provider_id"] != body.provider_id:
        raise HTTPException(403, "Offer does not belong to this provider")

    context = ProviderContext(
        provider=offer["provider"],
        offer=offer,
        response_draft=body.response_draft,
    )
    try:
        reply = await agents().provider_turn(
            message=body.message,
            history=[item.model_dump() for item in body.history],
            context=context,
        )
    except Exception as error:
        raise HTTPException(502, f"Provider agent failed: {error}") from error
    return {"reply": reply, "response_draft": context.response_draft, "offer": offer}


@app.post("/offers/{offer_id}/answer")
def answer_offer(offer_id: str, body: AnswerBody):
    """Submit the provider's real answer after they accepted the offer."""

    try:
        offer = offer_store.get(offer_id)
    except OfferNotFoundError as error:
        raise HTTPException(404, str(error)) from error
    if offer["provider_id"] != body.provider_id:
        raise HTTPException(403, "Offer does not belong to this provider")
    if offer["status"] != "accepted":
        raise HTTPException(409, "Accept the offer before submitting an answer")
    if offer["provider"].get("is_demo"):
        answer = make_demo_answer(offer["contract"], offer["provider"])
        answer["content"] = body.content.strip()
        answer["media_url"] = body.media_url
        completed_offer = offer_store.complete_demo(offer_id=offer_id, answer=answer)
        answer = completed_offer["demo_answer"]
    else:
        try:
            answer = post_answer(
                offer["query_id"],
                body.provider_id,
                body.content.strip(),
                body.media_url,
            )
        except Exception as error:
            raise HTTPException(502, f"Answer could not be stored: {error}") from error
        completed_offer = offer_store.complete(
            provider_id=body.provider_id,
            offer_id=offer_id,
        )
    return {"answer": answer, "offer": completed_offer}


@app.get("/queries/{query_id}/answers")
def answers_for_query(query_id: str):
    demo_answers = offer_store.demo_answers_for_query(query_id)
    try:
        return {"answers": demo_answers + get_answers_for_query(query_id)}
    except Exception as error:
        if demo_answers:
            return {"answers": demo_answers}
        raise HTTPException(502, f"Answers could not be loaded: {error}") from error


@app.get("/integrations/mcp")
def mcp_connector_catalog():
    """Advertise the provider connection surface without claiming OAuth is live."""

    return {
        "enabled": False,
        "message": "MCP connection UI is ready; OAuth transports are not configured for this demo.",
        "connectors": [
            {"id": "gmail", "name": "Gmail", "status": "not_configured"},
            {"id": "google-calendar", "name": "Google Calendar", "status": "not_configured"},
            {"id": "google-drive", "name": "Google Drive", "status": "not_configured"},
        ],
    }
