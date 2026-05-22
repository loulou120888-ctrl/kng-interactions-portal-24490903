import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({  component: LoginPage,
});

function internalEmail(username: string): string {
  return `${username.toLowerCase().trim()}@kngportal.com`;
}

function toEmail(input: string): string {
  const trimmed = input.trim();
  // If it already looks like an email (has @), use as-is
  return trimmed.includes("@") ? trimmed : internalEmail(trimmed);
}

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim()) { setError("Username required"); return; }
    if (!password) { setError("Password required"); return; }

    setLoading(true);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    setLoading(false);

    if (authErr) {
      const msg = authErr.message ?? "";
      if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid credentials")) {
        setError("Incorrect username or password.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Account not confirmed. Ask a manager to confirm it in the Supabase dashboard, or disable email confirmation in Auth settings.");
      } else if (msg.toLowerCase().includes("too many requests")) {
        setError("Too many attempts — please wait a moment and try again.");
      } else {
        setError(msg || "Sign in failed. Please try again.");
      }
      return;
    }

    // Check if account has been deactivated before letting the auth state redirect
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("deactivated")
        .eq("id", data.user.id)
        .single();

      if ((profile as any)?.deactivated) {
        await supabase.auth.signOut();
        setError("Your account has been deactivated. Contact a manager.");
        return;
      }

      // If the account has a forced password reset (one-time login code was used), send to set-password
      if (data.user.user_metadata?.force_password_reset) {
        navigate({ to: "/set-password" });
        return;
      }
    }
    // Navigation is handled by the useEffect above once onAuthStateChange sets the user
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

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => { setError(null); setUsername(e.target.value); }}
                autoComplete="username"
                placeholder="your_username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setError(null); setPassword(e.target.value); }}
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
