"""Deterministic tests for the two-agent application boundary."""

import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from offers import OfferNotFoundError, OfferStore, offer_store
from agents_runtime import _expand_match_tags
from demo_data import make_demo_answer, match_demo_providers
from server import app


def provider(provider_id="provider-1"):
    return {
        "id": provider_id,
        "display_name": "Maya Reyes",
        "location_city": "Manila",
        "trust_score": 0.92,
        "expertise_tags": ["hackathons", "ai"],
    }


def contract():
    return {
        "objective": "Record a current 30-second walkthrough.",
        "deliverable": "video",
        "subject": "Hackathon day two",
        "location_city": "Manila",
        "location_country": "Philippines",
        "topic_tags": ["hackathons"],
        "required_affiliations": [],
        "required_access": ["event floor"],
        "deadline": "today",
        "acceptance_criteria": ["Shows the event floor", "Includes a spoken observation"],
        "restrictions": ["Do not film private screens"],
        "freshness": "now",
    }


class OfferStoreTests(unittest.TestCase):
    def test_match_tags_cover_singular_plural_and_city_variants(self):
        tags = _expand_match_tags(["hackathon"], "Manila")
        self.assertIn("hackathon", tags)
        self.assertIn("hackathons", tags)
        self.assertIn("manila-hackathon", tags)
        self.assertIn("manila-hackathons", tags)

    def test_ucla_demo_provider_and_response_complete_the_loop(self):
        matches = match_demo_providers(
            topic_tags=["ucla", "libraries"],
            city="Los Angeles",
            country="United States",
        )
        self.assertEqual("demo-avery-chen", matches[0]["id"])

        store = OfferStore()
        offer = store.create(
            idempotency_key="ucla-demo",
            query_id="query-ucla",
            requester_name="Radin",
            provider=matches[0],
            contract={
                **contract(),
                "subject": "UCLA Powell Library occupancy",
                "location_city": "Los Angeles",
                "location_country": "United States",
            },
            reasons=["Demo fixture"],
        )
        completed = store.complete_demo(
            offer_id=offer["id"],
            answer=make_demo_answer(offer["contract"], matches[0]),
        )
        self.assertEqual("completed", completed["status"])
        answers = store.demo_answers_for_query("query-ucla")
        self.assertTrue(answers[0]["demo"])
        self.assertIn("Powell Library", answers[0]["content"])

    def test_offer_is_idempotent_and_requires_the_selected_provider(self):
        store = OfferStore()
        first = store.create(
            idempotency_key="request-1",
            query_id="query-1",
            requester_name="Radin",
            provider=provider(),
            contract=contract(),
            reasons=["Expertise overlaps hackathons"],
        )
        second = store.create(
            idempotency_key="request-1",
            query_id="query-other",
            requester_name="Someone else",
            provider=provider("provider-2"),
            contract=contract(),
            reasons=[],
        )

        self.assertEqual(first["id"], second["id"])
        self.assertEqual("proposed", first["status"])
        self.assertIn("I found a new task", first["provider_agent_message"])
        self.assertIn("**Hackathon day two**", first["provider_agent_message"])
        with self.assertRaises(OfferNotFoundError):
            store.respond(
                provider_id="provider-2",
                offer_id=first["id"],
                decision="accept",
            )

    def test_provider_decision_is_explicit_and_terminal(self):
        store = OfferStore()
        offer = store.create(
            idempotency_key="request-2",
            query_id="query-2",
            requester_name="Radin",
            provider=provider(),
            contract=contract(),
            reasons=[],
        )
        accepted = store.respond(
            provider_id="provider-1",
            offer_id=offer["id"],
            decision="accept",
        )

        self.assertEqual("accepted", accepted["status"])
        self.assertIsNotNone(accepted["responded_at"])
        self.assertEqual(
            accepted,
            store.respond(
                provider_id="provider-1",
                offer_id=offer["id"],
                decision="accept",
            ),
        )
        with self.assertRaises(ValueError):
            store.respond(
                provider_id="provider-1",
                offer_id=offer["id"],
                decision="decline",
            )
        completed = store.complete(provider_id="provider-1", offer_id=offer["id"])
        self.assertEqual("completed", completed["status"])


class ApiBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_and_mcp_catalog_are_truthful(self):
        health = self.client.get("/health")
        self.assertEqual(200, health.status_code)
        self.assertTrue(health.json()["agents_sdk"])
        self.assertEqual("memory-demo", health.json()["offer_store"])

        catalog = self.client.get("/integrations/mcp")
        self.assertEqual(200, catalog.status_code)
        self.assertFalse(catalog.json()["enabled"])
        self.assertTrue(
            all(item["status"] == "not_configured" for item in catalog.json()["connectors"])
        )

        demo_providers = self.client.get("/providers/demo")
        self.assertEqual(200, demo_providers.status_code)
        self.assertEqual("demo-avery-chen", demo_providers.json()["providers"][0]["id"])

    def test_provider_must_explicitly_accept_offer(self):
        provider_id = "provider-" + str(uuid4())
        offer = offer_store.create(
            idempotency_key="api-" + str(uuid4()),
            query_id="query-" + str(uuid4()),
            requester_name="Radin",
            provider=provider(provider_id),
            contract=contract(),
            reasons=["Test fixture"],
        )

        inbox = self.client.get("/providers/" + provider_id + "/offers")
        self.assertEqual(200, inbox.status_code)
        self.assertEqual(offer["id"], inbox.json()["offers"][0]["id"])

        response = self.client.post(
            "/offers/" + offer["id"] + "/respond",
            json={"provider_id": provider_id, "decision": "accept"},
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("accepted", response.json()["status"])


if __name__ == "__main__":
    unittest.main()
