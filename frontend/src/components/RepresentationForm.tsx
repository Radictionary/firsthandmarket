import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function RepresentationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      full_name: String(data.get("full_name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      role_title: String(data.get("role_title") ?? "").trim() || null,
      goal: String(data.get("goal") ?? "").trim(),
      boundaries: String(data.get("boundaries") ?? "").trim() || null,
    };

    if (!payload.full_name || !payload.email || !payload.goal) {
      toast.error("Name, email, and what you want are required.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("representation_requests").insert(payload);
    setSubmitting(false);

    if (error) {
      toast.error("That didn't go through. Please try again.");
      return;
    }

    form.reset();
    setDone(true);
    toast.success("Your brief is with your agent.");
  }

  if (done) {
    return (
      <div className="rounded-xl border border-primary/40 bg-card p-8">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          Brief received
        </p>
        <p className="display mt-4 text-3xl">Your agent has your instructions.</p>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Nothing you wrote becomes a public profile field. You'll hear from us only
          when there's something worth your attention.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-6 rounded-md border border-border px-5 py-2.5 text-sm transition-colors hover:bg-accent"
        >
          Submit another brief
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="full_name" placeholder="Jordan Reyes" required />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="jordan@company.com"
          required
        />
      </div>
      <div className="mt-5">
        <Field
          label="What you do"
          name="role_title"
          placeholder="VP Engineering, enterprise SaaS"
        />
      </div>
      <div className="mt-5">
        <Field
          label="What are you trying to accomplish?"
          name="goal"
          textarea
          required
          placeholder="I'm trying to figure out whether I should sell my company."
        />
      </div>
      <div className="mt-5">
        <Field
          label="Boundaries your agent should enforce"
          name="boundaries"
          textarea
          hint="Agent-visible only. Never shown on a profile, never searchable."
          placeholder="Never introduce me to vendors. Advisory roles only, past Series A."
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Briefing your agent…" : "Brief my agent"}
        </button>
        <p className="text-xs text-muted-foreground">
          Stored privately. Not published, not searchable.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
  textarea,
  hint,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  hint?: string;
}) {
  const base =
    "mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";

  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {textarea ? (
        <textarea name={name} rows={3} placeholder={placeholder} required={required} className={base} />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className={base}
        />
      )}
      {hint ? (
        <span className="mt-2 block text-xs text-[var(--private)]">{hint}</span>
      ) : null}
    </label>
  );
}
