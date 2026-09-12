"""FirstHandMarket — HTTP wrapper around the agent.

Run:
    uvicorn agent.server:app --reload --host 0.0.0.0 --port 8000

Endpoints:
    GET  /health              → {"ok": true, "model": "..."}
    POST /ask                 → {"question": "..."}          → agent runs, returns full trace
    POST /queries             → {"question","topic_tags",...} → bypass agent, direct DB write
    GET  /informants          → list all verified informants
    POST /rpc/match           → {"topic_tags":[...],"city":"..."} → direct match, no LLM

The frontend can call /ask for the full agent experience, or the raw
endpoints for lighter interactions.
"""
import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from agent import (  # noqa: E402
    chat, extract_json, expand_tags,
    INTENT_PROMPT, ANSWER_PROMPT, SYNTH_PROMPT, MODEL, BASE_URL,
)
from db import match_informants, post_query, post_answer, get_answers_for_query  # noqa: E402

app = FastAPI(title="FirstHandMarket Agent", version="0.1.0")

# CORS — open for hackathon demo. Tighten to your frontend origin in prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskBody(BaseModel):
    question: str
    seeker_name: Optional[str] = None


class MatchBody(BaseModel):
    topic_tags: list[str]
    city: Optional[str] = None
    country: Optional[str] = None
    limit: int = 3


class QueryBody(BaseModel):
    question: str
    topic_tags: list[str] = []
    seeker_name: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    freshness: str = "now"


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL, "endpoint": BASE_URL}


@app.post("/ask")
def ask(body: AskBody):
    """Full agent flow: intent → log query → match → synthesize."""
    try:
        raw = chat([
            {"role": "system", "content": INTENT_PROMPT},
            {"role": "user", "content": body.question},
        ])
        intent = extract_json(raw)
    except Exception as e:
        raise HTTPException(500, f"intent extraction failed: {e}")

    logged = post_query(
        question=body.question,
        topic_tags=intent.get("topic_tags", []),
        seeker_name=body.seeker_name,
        location_city=intent.get("city"),
        location_country=intent.get("country"),
        freshness=intent.get("freshness", "now"),
    )

    tags = expand_tags(intent.get("topic_tags", []), intent.get("city"))
    matches = match_informants(
        topic_tags=tags, city=intent.get("city"),
        country=intent.get("country"), limit=3,
    )
    if not matches and intent.get("city"):
        matches = match_informants(topic_tags=tags, limit=3)

    answers = []
    reply = None
    if matches:
        for m in matches:
            try:
                voice = chat([
                    {"role": "system", "content": ANSWER_PROMPT},
                    {"role": "user", "content":
                        f"You are {m['display_name']} from {m['location_city']}, {m['location_country']}.\n"
                        f"Bio: {m['bio']}\n"
                        f"Expertise: {', '.join(m['expertise_tags'])}\n\n"
                        f"The seeker asked: {body.question}"},
                ]).strip()
            except Exception as e:
                voice = f"(answer generation failed: {e})"
            try:
                post_answer(logged["id"], m["id"], voice)
            except Exception:
                pass
            answers.append({
                "informant_id": m["id"],
                "display_name": m["display_name"],
                "city": m["location_city"],
                "avatar_url": m.get("avatar_url"),
                "trust_score": m.get("trust_score"),
                "answer": voice,
            })

        try:
            reply = chat([
                {"role": "system", "content": SYNTH_PROMPT},
                {"role": "user", "content":
                    f"Seeker asked: {body.question}\n\nAnswers from informants:\n{json.dumps(answers)}"},
            ]).strip()
        except Exception as e:
            reply = f"(synthesis failed: {e})"
    else:
        reply = "No matching informants yet. Try broadening your topic or dropping the location."

    return {
        "query_id": logged["id"],
        "intent": intent,
        "matches": matches,
        "answers": answers,
        "reply": reply,
    }


@app.post("/rpc/match")
def match(body: MatchBody):
    """Direct Supabase match, no LLM. For lightweight lookups."""
    tags = expand_tags(body.topic_tags, body.city)
    matches = match_informants(
        topic_tags=tags, city=body.city, country=body.country, limit=body.limit,
    )
    if not matches and body.city:
        matches = match_informants(topic_tags=tags, limit=body.limit)
    return {"matches": matches}


@app.post("/queries")
def create_query(body: QueryBody):
    """Direct query insert. No LLM, no matching. Use when the frontend
    already knows the tags."""
    return post_query(**body.model_dump())


@app.get("/queries/{query_id}/answers")
def answers_for_query(query_id: str):
    return {"answers": get_answers_for_query(query_id)}
