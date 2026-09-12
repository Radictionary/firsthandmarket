import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Receives Ambiguous events (mail replies, coworker executions).
 * Signature-verified with AMBIGUOUS_WEBHOOK_SECRET when configured.
 */
export const Route = createFileRoute("/api/public/webhooks/ambiguous")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();

        const secret = process.env["AMBIGUOUS_WEBHOOK_SECRET"];
        if (secret) {
          const signature = request.headers.get("x-webhook-signature") ?? "";
          const expected = createHmac("sha256", secret).update(body).digest("hex");
          const sig = Buffer.from(signature);
          const exp = Buffer.from(expected);
          if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let event: { type?: string };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        // For now: acknowledge and log. Reply/booking handling lands with calendar sync.
        console.log("[ambiguous webhook]", event.type ?? "unknown");
        return Response.json({ ok: true });
      },
    },
  },
});
