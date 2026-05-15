import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Crown, MailCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const schema = z.object({
  signup_code: z
    .string()
    .trim()
    .min(1, "Signup code is required")
    .max(64),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or less")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers and underscores"),
  display_name: z.string().trim().min(1, "Display name required").max(80),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function internalEmail(username: string): string {
  return `${username.toLowerCase()}@kng.internal`;
}

function authErrorMessage(msg: string): string {
  if (msg.includes("already registered") || msg.toLowerCase().includes("user already registered")) {
    return "That username is already taken. Try a different one.";
  }
  if (msg.includes("Password should")) return msg;
  if (msg.toLowerCase().includes("rate limit")) {
    return "Too many attempts — please wait a few minutes and try again.";
  }
  if (msg.includes("Database error") || msg.includes("database error")) {
    return "Account creation failed. Please try again or contact a manager.";
  }
  return msg || "Signup failed. Please try again.";
}

type PageState = "form" | "pending_confirm";

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ signup_code: "", username: "", display_name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<PageState>("form");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const normalized = { ...form, username: form.username.toLowerCase().trim() };
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    // ── Step 1: pre-validate signup code (no auth call yet) ──────────────────
    // This avoids burning Supabase rate limit slots on invalid codes.
    const { data: codeRow, error: codeErr } = await supabase
      .from("signup_codes")
      .select("id, revoked, used_by")
      .eq("code", parsed.data.signup_code.trim().toUpperCase())
      .maybeSingle();

    if (codeErr) {
      setError("Could not validate signup code. Check your connection and try again.");
      setLoading(false);
      return;
    }
    if (!codeRow) {
      setError("Invalid signup code. Double-check it and try again, or ask a manager for a new one.");
      setLoading(false);
      return;
    }
    if (codeRow.revoked) {
      setError("That signup code has been revoked. Ask a manager for a new one.");
      setLoading(false);
      return;
    }
    if (codeRow.used_by) {
      setError("That signup code has already been used. Each code is one-time only — ask a manager for a new one.");
      setLoading(false);
      return;
    }

    // ── Step 2: single auth call, only reached with a valid unused code ───────
    const { data, error: authErr } = await supabase.auth.signUp({
      email: internalEmail(parsed.data.username),
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.display_name,
          signup_code: parsed.data.signup_code.trim().toUpperCase(),
        },
      },
    });
    setLoading(false);

    if (authErr) {
      setError(authErrorMessage(authErr.message ?? ""));
      return;
    }

    if (data.session) {
      // Signed in immediately — email confirmation is disabled (correct setup)
      navigate({ to: "/dashboard" });
    } else if (data.user && !data.session) {
      // Email confirmation is ON — user created but can't sign in yet
      setPage("pending_confirm");
    } else {
      // Supabase returned no user and no session — email already exists
      // (Supabase hides this to prevent email enumeration)
      setError("That username is already taken. Try a different one.");
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
            <h1 className="text-xl font-semibold">One configuration step needed</h1>
            <p className="text-sm text-muted-foreground">
              Your account was created, but Supabase has email confirmation turned on.
              Since portal accounts don't use real email addresses, no confirmation will arrive.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-2">
              <p className="text-sm font-medium text-amber-300">Fix this once in your Supabase dashboard (manager only)</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5">
                <li>Open <strong className="text-foreground">Supabase → Authentication → Providers → Email</strong></li>
                <li>Turn off <strong className="text-foreground">"Confirm email"</strong> and save</li>
                <li>Go to <strong className="text-foreground">Authentication → Users</strong> and delete the pending account just created</li>
                <li>Sign up again — it will work immediately with no confirmation required</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Once "Confirm email" is off, all future signups will work instantly.
            </p>
            <Link to="/login" className="block text-sm text-primary hover:underline">
              Back to sign in
            </Link>
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
                onChange={(e) => set("signup_code", e.target.value.toUpperCase())}
                placeholder="KNG-XXXXXX"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
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
              {loading ? "Checking code…" : "Create account"}
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
