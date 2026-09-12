"""Minimal Supabase client for FirstHandMarket.

No SDK — just raw requests, so it works anywhere and is easy to port.
"""
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env from repo root regardless of where the script is invoked from.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

def _config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY are required for database operations")
    return url.rstrip("/"), key


def _headers():
    _, key = _config()
    headers = {"apikey": key, "Content-Type": "application/json"}
    if not key.startswith("sb_publishable_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


def match_informants(topic_tags, city=None, country=None, limit=3):
    url, _ = _config()
    r = requests.post(
        f"{url}/rest/v1/rpc/match_informants",
        headers=_headers(),
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
    url, _ = _config()
    r = requests.post(
        f"{url}/rest/v1/queries",
        headers={**_headers(), "Prefer": "return=representation"},
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
    url, _ = _config()
    r = requests.post(
        f"{url}/rest/v1/answers",
        headers={**_headers(), "Prefer": "return=representation"},
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
    url, _ = _config()
    r = requests.get(
        f"{url}/rest/v1/answers",
        headers=_headers(),
        params={
            "select": "content,created_at,informants(display_name,location_city,trust_score)",
            "query_id": f"eq.{query_id}",
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def get_informant(informant_id):
    url, _ = _config()
    r = requests.get(
        f"{url}/rest/v1/informants",
        headers=_headers(),
        params={"select": "*", "id": f"eq.{informant_id}", "limit": 1},
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    if not rows:
        raise LookupError("Provider was not found")
    return rows[0]
