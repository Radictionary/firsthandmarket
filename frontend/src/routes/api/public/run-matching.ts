import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/run-matching")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { runMatchingPass } = await import("@/lib/match.server");
        try {
          const summary = await runMatchingPass({ maxPairs: 10 });
          return Response.json(summary);
        } catch (error) {
          console.error("[cron] matching pass failed", error);
          return new Response("Matching pass failed", { status: 500 });
        }
      },
    },
  },
});
