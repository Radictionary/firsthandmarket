"""FirstHandMarket — batch test for the agent.

Runs a suite of seeker questions and prints pass/fail.

Run:
    python agent/test_agent.py
"""
import json
import sys
from agent import chat, extract_json, expand_tags, INTENT_PROMPT, SYNTH_PROMPT, MODEL, BASE_URL
from db import match_informants, post_query


TESTS = [
    {"name": "hackathon day-2 (evergreen)",
     "question": "What is a global hackathon like on day 2?",
     "expect_tag_any": ["hackathon", "hackathons"],
     "expect_city": None},
    {"name": "Bangalore food",
     "question": "What's the food scene like in Bangalore right now?",
     "expect_tag_any": ["food", "bangalore-food"],
     "expect_city": "Bangalore"},
    {"name": "Manila nightlife",
     "question": "How's Manila nightlife on a Tuesday?",
     "expect_tag_any": ["nightlife", "manila-nightlife"],
     "expect_city": "Manila"},
    {"name": "Berlin design community",
     "question": "Anyone in Berlin who can tell me about the design community?",
     "expect_tag_any": ["design", "berlin-culture", "ux"],
     "expect_city": "Berlin"},
    {"name": "no-match (Sydney surfing)",
     "question": "What's the surfing like in Sydney?",
     "expect_tag_any": ["surfing", "surf"],
     "expect_city": "Sydney",
     "expect_zero_matches": True},
]


def run_test(t):
    print(f"\n{'=' * 60}\nTEST: {t['name']}\n   → {t['question']}\n{'=' * 60}")
    result = {"name": t["name"], "passed": True, "notes": []}

    try:
        raw = chat([
            {"role": "system", "content": INTENT_PROMPT},
            {"role": "user", "content": t["question"]},
        ])
        intent = extract_json(raw)
        print(f"   Intent: {intent}")
    except Exception as e:
        return {**result, "passed": False, "notes": [f"intent extract failed: {e}"]}

    tags = intent.get("topic_tags") or []
    if not tags:
        result["passed"] = False
        result["notes"].append("no topic_tags extracted")

    tag_hit = any(any(want in tag for tag in tags) for want in t["expect_tag_any"])
    if not tag_hit:
        result["notes"].append(f"tags {tags} did not include any of {t['expect_tag_any']}")
    if t["expect_city"] and (intent.get("city") or "").lower() != t["expect_city"].lower():
        result["notes"].append(f"expected city={t['expect_city']}, got {intent.get('city')}")

    try:
        logged = post_query(
            question=t["question"], topic_tags=tags,
            location_city=intent.get("city"),
            location_country=intent.get("country"),
            freshness=intent.get("freshness", "now"),
        )
        print(f"   Logged query id={logged['id']}")
    except Exception as e:
        return {**result, "passed": False, "notes": result["notes"] + [f"post_query failed: {e}"]}

    expanded = expand_tags(tags, intent.get("city"))
    matches = match_informants(topic_tags=expanded, city=intent.get("city"), limit=3)
    if not matches and intent.get("city"):
        matches = match_informants(topic_tags=expanded, limit=3)
    names = [m["display_name"] for m in matches]
    print(f"   Matches: {names or '(none)'}")

    if t.get("expect_zero_matches"):
        if matches:
            result["notes"].append(f"expected 0 matches, got {len(matches)}")
    else:
        if not matches:
            result["passed"] = False
            result["notes"].append("expected at least 1 match, got 0")

    if matches:
        condensed = [{"display_name": m["display_name"], "city": m["location_city"],
                      "expertise": m["expertise_tags"], "bio": m["bio"]} for m in matches]
        reply = chat([
            {"role": "system", "content": SYNTH_PROMPT},
            {"role": "user", "content":
                f"Seeker asked: {t['question']}\n\nMatched informants:\n{json.dumps(condensed)}"},
        ])
        print(f"   Reply: {reply[:200].strip()}…")
        if not any(name in reply for name in names):
            result["notes"].append("reply mentioned no matched informant by name")

    if result["notes"]:
        result["passed"] = False
    return result


def main():
    print(f"🧪 FirstHandMarket agent test suite")
    print(f"   Model: {MODEL} @ {BASE_URL}")
    results = [run_test(t) for t in TESTS]
    print(f"\n{'=' * 60}\nSUMMARY\n{'=' * 60}")
    passed = sum(1 for r in results if r["passed"])
    for r in results:
        badge = "✅ PASS" if r["passed"] else "❌ FAIL"
        print(f"{badge}  {r['name']}")
        for n in r["notes"]:
            print(f"         └─ {n}")
    print(f"\n{passed}/{len(results)} tests passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
