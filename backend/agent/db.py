"""Minimal Supabase client for FirstHandMarket.

No SDK — just raw requests, so it works anywhere and is easy to port.
"""
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env from repo root regardless of where the script is invoked from.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def match_informants(topic_tags, city=None, country=None, limit=3):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_informants",
        headers=_HEADERS,
        json={
            "p_topic_tags": topic_tags,
            "p_city": city,
            "p_country": country,
            "p_limit": limit,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def post_query(question, topic_tags, seeker_name=None,
               location_city=None, location_country=None, freshness="now"):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/queries",
        headers={**_HEADERS, "Prefer": "return=representation"},
        json={
            "seeker_name": seeker_name,
            "question": question,
            "topic_tags": topic_tags,
            "location_city": location_city,
            "location_country": location_country,
            "freshness": freshness,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()[0]


def post_answer(query_id, informant_id, content, media_url=None):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/answers",
        headers={**_HEADERS, "Prefer": "return=representation"},
        json={
            "query_id": query_id,
            "informant_id": informant_id,
            "content": content,
            "media_url": media_url,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()[0]


def get_answers_for_query(query_id):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/answers",
        headers=_HEADERS,
        params={
            "select": "content,created_at,informants(display_name,location_city,trust_score)",
            "query_id": f"eq.{query_id}",
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()
