"""Demo offer repository.

The hackathon deployment uses one FastAPI process, so this in-memory store is
enough to exercise the real requester -> provider notification flow without a
last-minute database migration. The interface is intentionally small so it can
be replaced by Postgres after the demo.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Literal
from uuid import uuid4

OfferDecision = Literal["accept", "decline"]


class OfferNotFoundError(LookupError):
    pass


class OfferStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self._offers: dict[str, dict[str, Any]] = {}
        self._idempotency: dict[str, str] = {}

    def by_idempotency_key(self, key: str) -> dict[str, Any] | None:
        with self._lock:
            offer_id = self._idempotency.get(key)
            offer = self._offers.get(offer_id) if offer_id else None
            return deepcopy(offer) if offer else None

    def create(
        self,
        *,
        idempotency_key: str,
        query_id: str,
        requester_name: str,
        provider: dict[str, Any],
        contract: dict[str, Any],
        reasons: list[str],
    ) -> dict[str, Any]:
        with self._lock:
            existing = self.by_idempotency_key(idempotency_key)
            if existing:
                return existing

            now = datetime.now(timezone.utc).isoformat()
            offer = {
                "id": str(uuid4()),
                "query_id": query_id,
                "requester_name": requester_name,
                "provider_id": provider["id"],
                "provider": deepcopy(provider),
                "contract": deepcopy(contract),
                "reasons": list(reasons),
                "status": "proposed",
                "created_at": now,
                "responded_at": None,
                "completed_at": None,
                "demo_answer": None,
                "provider_agent_message": self._provider_agent_message(
                    requester_name=requester_name,
                    contract=contract,
                    reasons=reasons,
                ),
            }
            self._offers[offer["id"]] = offer
            self._idempotency[idempotency_key] = offer["id"]
            return deepcopy(offer)

    @staticmethod
    def _provider_agent_message(
        *,
        requester_name: str,
        contract: dict[str, Any],
        reasons: list[str],
    ) -> str:
        subject = contract.get("subject") or contract.get("objective") or "New request"
        deliverable = contract.get("deliverable") or "response"
        deadline = contract.get("deadline") or "No hard deadline"
        match_reason = reasons[0] if reasons else "It matches your provider profile"
        return (
            "I found a new task that looks like a strong match for you.\n\n"
            f"**{subject}**\n\n"
            f"- **Requester:** {requester_name}\n"
            f"- **Deliverable:** {deliverable}\n"
            f"- **Deadline:** {deadline}\n"
            f"- **Why you:** {match_reason}\n\n"
            "Review the contract below. If it fits, accept it and send your firsthand "
            "response. I will not accept it on your behalf."
        )

    def get(self, offer_id: str) -> dict[str, Any]:
        with self._lock:
            offer = self._offers.get(offer_id)
            if not offer:
                raise OfferNotFoundError("Offer was not found.")
            return deepcopy(offer)

    def list_for_provider(self, provider_id: str) -> list[dict[str, Any]]:
        with self._lock:
            offers = [
                deepcopy(offer)
                for offer in self._offers.values()
                if offer["provider_id"] == provider_id
            ]
        return sorted(offers, key=lambda offer: offer["created_at"], reverse=True)

    def complete(self, *, provider_id: str, offer_id: str) -> dict[str, Any]:
        with self._lock:
            offer = self._offers.get(offer_id)
            if not offer or offer["provider_id"] != provider_id:
                raise OfferNotFoundError("Offer was not found for this provider.")
            if offer["status"] == "completed":
                return deepcopy(offer)
            if offer["status"] != "accepted":
                raise ValueError("Only an accepted offer can be completed.")
            offer["status"] = "completed"
            offer["completed_at"] = datetime.now(timezone.utc).isoformat()
            return deepcopy(offer)

    def complete_demo(
        self,
        *,
        offer_id: str,
        answer: dict[str, Any],
    ) -> dict[str, Any]:
        with self._lock:
            offer = self._offers.get(offer_id)
            if not offer:
                raise OfferNotFoundError("Offer was not found.")
            if not offer["provider"].get("is_demo"):
                raise ValueError("Only a demo provider can be auto-completed.")
            now = datetime.now(timezone.utc).isoformat()
            answer = deepcopy(answer)
            answer["created_at"] = answer.get("created_at") or now
            offer["status"] = "completed"
            offer["responded_at"] = now
            offer["completed_at"] = now
            offer["demo_answer"] = answer
            return deepcopy(offer)

    def demo_answers_for_query(self, query_id: str) -> list[dict[str, Any]]:
        with self._lock:
            return [
                deepcopy(offer["demo_answer"])
                for offer in self._offers.values()
                if offer["query_id"] == query_id and offer.get("demo_answer")
            ]

    def respond(
        self,
        *,
        provider_id: str,
        offer_id: str,
        decision: OfferDecision,
    ) -> dict[str, Any]:
        with self._lock:
            offer = self._offers.get(offer_id)
            if not offer or offer["provider_id"] != provider_id:
                raise OfferNotFoundError("Offer was not found for this provider.")
            next_status = "accepted" if decision == "accept" else "declined"
            if offer["status"] != "proposed":
                if offer["status"] == next_status:
                    return deepcopy(offer)
                raise ValueError("Offer has already been answered.")

            offer["status"] = next_status
            offer["responded_at"] = datetime.now(timezone.utc).isoformat()
            return deepcopy(offer)


offer_store = OfferStore()
