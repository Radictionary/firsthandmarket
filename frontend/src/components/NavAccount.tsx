import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const linkClass =
  "font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground";

export function NavAccount() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      if (event === "SIGNED_OUT") setSignedIn(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Render the signed-out link until hydration settles so server and client match.
  if (!mounted || !signedIn) {
    return (
      <Link to="/auth" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-5">
      <Link to="/desk" className={linkClass}>
        Your desk
      </Link>
      <button type="button" onClick={signOut} className={linkClass}>
        Sign out
      </button>
    </span>
  );
}
