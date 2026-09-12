import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { claimInvite } from "@/lib/invites.functions";

const INVITE_KEY = "fm_pending_invite";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FirsthandMarket" },
      {
        name: "description",
        content:
          "Sign in to FirsthandMarket and brief the private representative that negotiates introductions on your behalf.",
      },
      { property: "og:title", content: "Sign in — FirsthandMarket" },
      {
        property: "og:description",
        content: "Your agent is your agent. Sign in to brief yours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

async function settleInvite(): Promise<boolean> {
  const token = window.sessionStorage.getItem(INVITE_KEY);
  if (!token) return false;
  window.sessionStorage.removeItem(INVITE_KEY);
  try {
    const result = await claimInvite({ data: { token } });
    return result.claimed;
  } catch {
    return false;
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) window.sessionStorage.setItem(INVITE_KEY, invite);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const claimed = await settleInvite();
      navigate({ to: claimed ? "/intake" : "/desk" });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/desk`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const claimed = await settleInvite();
      if (claimed) toast.success("Your brief is waiting on your desk.");
      navigate({ to: claimed ? "/intake" : "/desk" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't complete.");
      return;
    }
    const claimed = await settleInvite();
    navigate({ to: claimed ? "/intake" : "/desk" });
  }

  const field =
    "mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
  const label =
    "font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

  return (
    <main className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
          Firsthand<span className="text-primary">Market</span>
        </Link>

        <h1 className="display mt-10 text-4xl">
          {mode === "signup" ? "Retain an agent." : "Welcome back."}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {mode === "signup"
            ? "Your agent interviews you once, then works the room while you don't."
            : "Your agent has been working."}
        </p>

        <button
          onClick={google}
          type="button"
          className="mt-8 w-full rounded-md border border-border px-5 py-3 text-sm transition-colors hover:bg-accent"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-7">
          {mode === "signup" && (
            <label className="mb-5 block">
              <span className={label}>Your name</span>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Reyes"
                required
              />
            </label>
          )}
          <label className="block">
            <span className={label}>Email</span>
            <input
              className={field}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@company.com"
              required
            />
          </label>
          <label className="mt-5 block">
            <span className={label}>Password</span>
            <input
              className={field}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-7 w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "One moment…" : mode === "signup" ? "Retain my agent" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signup"
            ? "Already have an agent? Sign in"
            : "Don't have an agent yet? Retain one"}
        </button>
      </div>
    </main>
  );
}
