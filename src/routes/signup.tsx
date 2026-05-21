import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Crown, MailCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({  component: SignupPage,
});

const schema = z.object({
  signup_code: z.string().trim().max(64),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or less")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers and underscores"),
  display_name: z.string().trim().min(1, "Display name required").max(80),
  city_id: z.string().trim().max(80),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function internalEmail(username: string): string {
  return `${username.toLowerCase()}@kngportal.com`;
}

type PageState = "form" | "pending_confirm";

function errorMessage(msg: string, hasCode: boolean): string {
  if (msg.includes("Database error") || msg.includes("database error")) {
    // Supabase wraps all trigger RAISE EXCEPTION as "Database error saving new user"
    // We can't get the inner message, so give contextual help
    if (!hasCode) {
      return "There are already accounts in the system — a signup code is required. Ask a manager for one.";
    }
    return "Signup failed. Your code may be invalid, already used, or revoked. Ask a manager for a new one.";
  }
  if (msg.includes("already registered") || msg.toLowerCase().includes("user already registered")) {
    return "That username is already taken. Try a different one.";
  }
  if (msg.includes("Password should")) {
    return msg;
  }
  if (msg.toLowerCase().includes("rate limit")) {
    return "Too many attempts — please wait a moment and try again.";
  }
  return msg || "Signup failed. Please try again.";
}

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ signup_code: "", username: "", display_name: "", city_id: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<PageState>("form");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = { ...form, username: form.username.toLowerCase().trim() };
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }

    setLoading(true);
    const { data, error: authErr } = await supabase.auth.signUp({
      email: internalEmail(parsed.data.username),
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.display_name,
          signup_code: parsed.data.signup_code,
          city_id: parsed.data.city_id || undefined,
        },
      },
    });
    setLoading(false);

    if (authErr) {
      setError(errorMessage(authErr.message ?? "", parsed.data.signup_code.length > 0));
      return;
    }

    if (data.session) {
      // Signed in immediately — email confirmation is off
      navigate({ to: "/dashboard" });
    } else if (data.user) {
      // User created but email confirmation is required in Supabase settings
      setPage("pending_confirm");
    } else {
      // Supabase silently returned nothing — usually means username already exists
      // (Supabase prevents email enumeration by returning success-looking response)
      setError("That username may already be taken, or signup failed. Try a different username or contact a manager.");
    }
  }

  if (page === "pending_confirm") {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] text-center space-y-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 mx-auto">
              <MailCheck className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-semibold">One last step</h1>
            <p className="text-sm text-muted-foreground">
              Account created, but your Supabase project has email confirmation turned on.
              Since this portal uses internal accounts, no email will arrive.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-2">
              <p className="text-sm font-medium text-amber-300">Fix this once (manager only)</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Open your <strong>Supabase dashboard</strong></li>
                <li>Go to Authentication → Providers → <strong>Email</strong></li>
                <li>Turn off <strong>"Confirm email"</strong> and save</li>
                <li>Delete the pending user under Authentication → Users</li>
                <li>Sign up again — it will work immediately</li>
              </ol>
            </div>
            <Link to="/login" className="block text-sm text-primary hover:underline">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-xl font-semibold">Redeem signup code</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each code is one-time. Ask an AUX+ for yours.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label>Signup code</Label>
              <Input
                value={form.signup_code}
                onChange={(e) => set("signup_code", e.target.value)}
                placeholder="KNG-XXXX"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="john_doe"
                autoComplete="username"
                required
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers and underscores only. Used to sign in.</p>
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                required
              />
              <p className="text-xs text-muted-foreground">Your visible name in the portal.</p>
            </div>
            <div className="space-y-2">
              <Label>City ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={form.city_id}
                onChange={(e) => set("city_id", e.target.value)}
                placeholder="Your in-city or resort ID"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">Your in-city identifier used by the team. Can be updated later.</p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already a member? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
