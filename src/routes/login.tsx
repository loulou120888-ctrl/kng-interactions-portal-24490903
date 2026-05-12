import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — KNG Interactions Portal" }] }),
  component: LoginPage,
});

function internalEmail(username: string): string {
  return `${username.toLowerCase().trim()}@kng.internal`;
}

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) { toast.error("Username required"); return; }
    if (!password) { toast.error("Password required"); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail(username),
      password,
    });
    setLoading(false);

    if (error) {
      const msg = error.message ?? "";
      if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid credentials")) {
        toast.error("Incorrect username or password.");
      } else if (msg.toLowerCase().includes("too many requests")) {
        toast.error("Too many attempts — please wait a moment and try again.");
      } else {
        toast.error(msg || "Sign in failed. Please try again.");
      }
      return;
    }

    // Check if account has been deactivated
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("deactivated")
        .eq("id", data.user.id)
        .single();

      if (profile?.deactivated) {
        await supabase.auth.signOut();
        toast.error("Your account has been deactivated. Contact a manager.");
        return;
      }
    }

    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access the KNG Interactions Portal.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Have a code? <Link to="/signup" className="text-primary hover:underline">Redeem signup code</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
