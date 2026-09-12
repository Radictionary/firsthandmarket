import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen">
      <header className="rule-bottom border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              to="/desk"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Agent's desk
            </Link>
            <button
              onClick={signOut}
              className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
