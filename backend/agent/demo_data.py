"""Deterministic fake people and deliveries used only by the hackathon demo."""

from __future__ import annotations

from typing import Any


UCLA_POWELL_THUMBNAIL = (
    "https://upload.wikimedia.org/wikipedia/commons/f/ff/"
    "Powell_Library%2C_UCLA_%28front_view%29.jpg"
)


DEMO_PROVIDERS = [
    {
        "id": "demo-avery-chen",
        "display_name": "Avery Chen",
        "bio": "UCLA student who studies near Powell Library and knows the campus rhythm.",
        "location_city": "Los Angeles",
        "location_country": "United States",
        "expertise_tags": [
            "ucla",
            "powell-library",
            "library",
            "libraries",
            "student-life",
            "campus-life",
        ],
        "trust_score": 0.94,
        "available": True,
        "verified": True,
        "avatar_url": None,
        "is_demo": True,
    },
]


def match_demo_providers(
    *,
    topic_tags: list[str],
    city: str | None = None,
    country: str | None = None,
    limit: int = 3,
) -> list[dict[str, Any]]:
    requested = {tag.lower() for tag in topic_tags}
    ranked: list[tuple[int, dict[str, Any]]] = []
    for candidate in DEMO_PROVIDERS:
        if city and candidate["location_city"].lower() != city.lower():
            continue
        if country and candidate["location_country"].lower() != country.lower():
            continue
        overlap = requested.intersection(candidate["expertise_tags"])
        if not overlap:
            continue
        ranked.append((len(overlap), candidate))
    ranked.sort(key=lambda item: (item[0], item[1]["trust_score"]), reverse=True)
    return [dict(item[1]) for item in ranked[:limit]]


def make_demo_answer(contract: dict[str, Any], provider: dict[str, Any]) -> dict[str, Any]:
    subject = str(contract.get("subject") or "").lower()
    if "powell" in subject or "ucla" in subject:
        content = (
            "I’m at Powell Library this afternoon. The main floor looks moderately "
            "busy—roughly three out of four tables are occupied, with a few open "
            "seats along the side walls. I framed the walkthrough wide and avoided "
            "close-ups of faces and laptop screens."
        )
    else:
        content = (
            "I’m at the requested location now and completed the demo check using "
            "the acceptance criteria and privacy restrictions in the contract."
        )
    return {
        "content": content,
        "created_at": None,
        "media_url": None,
        "thumbnail_url": UCLA_POWELL_THUMBNAIL if "powell" in subject or "ucla" in subject else None,
        "deliverable": contract.get("deliverable", "text"),
        "duration_seconds": 30 if contract.get("deliverable") == "video" else None,
        "demo": True,
        "informants": {
            "display_name": provider["display_name"],
            "location_city": provider.get("location_city"),
            "trust_score": provider.get("trust_score"),
            "is_demo": True,
        },
    }
