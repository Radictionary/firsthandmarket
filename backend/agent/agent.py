"""FirstHandMarket — minimal test agent.

Two-shot pattern that works with ANY OpenAI-compatible chat model
(including reasoning models like gpt-6-astra that don't support native tools).

Step 1: model extracts structured intent (JSON) from the seeker's question.
Step 2: we call Supabase to match informants.
Step 3: model synthesizes a warm reply naming matched informants.

Run:
    python agent/agent.py "What is a global hackathon like on day 2?"
"""
import json
import os
import re
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from db import match_informants, post_query, post_answer  # noqa: E402

API_KEY = os.environ.get("OXEN_API_KEY") or os.environ.get("OPENAI_API_KEY")
BASE_URL = (
    os.environ.get("OXEN_BASE_URL")
    or os.environ.get("OPENAI_BASE_URL")
    or "https://api.openai.com/v1"
)
MODEL = (
    os.environ.get("OXEN_MODEL")
    or os.environ.get("OPENAI_MODEL")
    or "gpt-4.1-mini"
)
IS_ASTRA = MODEL.startswith("gpt-6") or "astra" in MODEL

if not API_KEY or "PASTE_YOUR" in API_KEY:
    raise SystemExit("Set OXEN_API_KEY (or OPENAI_API_KEY) in .env")


def chat(messages, temperature=None):
    body = {"model": MODEL, "messages": messages}
    if IS_ASTRA:
        body["reasoning_effort"] = "none"
    if temperature is not None and not IS_ASTRA:
        body["temperature"] = temperature
    r = requests.post(
        f"{BASE_URL}/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        json=body,
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"{r.status_code}: {r.text}")
    return r.json()["choices"][0]["message"]["content"]


def expand_tags(tags, city=None):
    """Include city-prefixed variants (e.g. 'nightlife' + 'Manila'
    → also search 'manila-nightlife') to match seed tag shapes."""
    expanded = list(tags)
    if city:
        prefix = city.lower().replace(" ", "-")
        for t in tags:
            variant = f"{prefix}-{t}"
            if variant not in expanded:
                expanded.append(variant)
    return expanded


def extract_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).rstrip("`").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"no JSON object found in: {text[:200]}")
    return json.loads(match.group(0))


INTENT_PROMPT = """You extract search intent from a seeker's question.
Reply with ONLY a JSON object, no prose, no code fences:

{
  "topic_tags": ["lowercase", "tags"],
  "city": null | "Manila",
  "country": null | "Philippines",
  "freshness": "now" | "this_week" | "evergreen"
}

Rules:
- topic_tags: short lowercase tags describing WHAT is being asked about
  (activity, topic, domain). Never put a city or country in topic_tags.
- city / country: extract WHENEVER the question mentions a place —
  "in Berlin", "Manila nightlife", "Bangalore food", "Sydney surfing".
  Use proper case ("Berlin", not "berlin").
- freshness: "now" for live/current conditions, "this_week" for recent,
  "evergreen" for timeless knowledge.

Examples:
Q: "What's the food scene like in Bangalore right now?"
A: {"topic_tags": ["food"], "city": "Bangalore", "country": "India", "freshness": "now"}

Q: "How's Manila nightlife on a Tuesday?"
A: {"topic_tags": ["nightlife"], "city": "Manila", "country": "Philippines", "freshness": "now"}

Q: "Anyone in Berlin who can tell me about the design community?"
A: {"topic_tags": ["design", "community"], "city": "Berlin", "country": "Germany", "freshness": "evergreen"}

Q: "What is a global hackathon like on day 2?"
A: {"topic_tags": ["hackathons"], "city": null, "country": null, "freshness": "evergreen"}

Q: "What's the surfing like in Sydney?"
A: {"topic_tags": ["surfing"], "city": "Sydney", "country": "Australia", "freshness": "now"}
"""

ANSWER_PROMPT = """You are the informant named below. You are a real person
who lives in the city listed. The seeker asked a question. Answer in your OWN
first-person voice — 2-3 sentences, casual, specific, grounded in real detail.

Do NOT say "as an AI" or hedge. Speak from your bio and expertise.
No lists. No disclaimers. No greeting. Just the answer.
"""

SYNTH_PROMPT = """You are FirstHandMarket's matchmaker.

You have a seeker's question and short answers from 1-3 verified locals.
Write a single tight reply that:

- Opens with the takeaway in one sentence (the ground truth).
- Names each informant in the format: **Display Name** (City) — quotes or paraphrases their point.
- Flags any disagreement between informants.
- No preamble, no "I hope this helps", no sign-off. Under 90 words total.
- Only use the informants provided. Do not invent anyone or anything.
"""


def run(question):
    print(f"❓ Seeker: {question}")
    print(f"🧠 Model: {MODEL} @ {BASE_URL}\n")

    print("🔎 Step 1 — extracting intent…")
    raw = chat([
        {"role": "system", "content": INTENT_PROMPT},
        {"role": "user", "content": question},
    ])
    intent = extract_json(raw)
    print(f"   {intent}")

    logged = post_query(
        question=question,
        topic_tags=intent.get("topic_tags", []),
        location_city=intent.get("city"),
        location_country=intent.get("country"),
        freshness=intent.get("freshness", "now"),
    )
    print(f"📝 Step 2 — logged query id={logged['id']}")

    tags = expand_tags(intent.get("topic_tags", []), intent.get("city"))
    matches = match_informants(
        topic_tags=tags,
        city=intent.get("city"),
        country=intent.get("country"),
        limit=3,
    )
    if not matches and intent.get("city"):
        matches = match_informants(topic_tags=tags, limit=3)

    print(f"📊 Step 3 — matched {len(matches)} informants:")
    for m in matches:
        print(f"   • {m['display_name']} ({m['location_city']}) "
              f"— trust {m['trust_score']} — tags {m['expertise_tags']}")

    if not matches:
        print("\n💬 Agent: no informants match those tags yet.")
        return

    # 4. Each matched informant "answers" in their own voice (LLM-simulated
    #    for the demo — real informants would answer via app in production).
    print("\n🎙️  Step 4 — collecting informant answers…")
    answers = []
    for m in matches:
        voice = chat([
            {"role": "system", "content": ANSWER_PROMPT},
            {"role": "user", "content":
                f"You are {m['display_name']} from {m['location_city']}, {m['location_country']}.\n"
                f"Bio: {m['bio']}\n"
                f"Expertise: {', '.join(m['expertise_tags'])}\n\n"
                f"The seeker asked: {question}"},
        ]).strip()
        try:
            post_answer(logged["id"], m["id"], voice)
        except Exception as e:
            print(f"   (couldn't post answer for {m['display_name']}: {e})")
        answers.append({
            "informant": m["display_name"],
            "city": m["location_city"],
            "answer": voice,
        })
        print(f"   • {m['display_name']}: {voice[:120]}{'…' if len(voice) > 120 else ''}")

    # 5. Synthesize
    print("\n✍️  Step 5 — synthesizing final reply…")
    reply = chat([
        {"role": "system", "content": SYNTH_PROMPT},
        {"role": "user", "content":
            f"Seeker asked: {question}\n\nAnswers from informants:\n{json.dumps(answers, indent=2)}"},
    ])
    print(f"\n💬 Agent: {reply.strip()}")


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "What is a global hackathon like on day 2?"
    run(question)
