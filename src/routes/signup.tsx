import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Crown, MailCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Redeem code — KNG Interactions Portal" }] }),
  component: SignupPage,
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
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function internalEmail(username: string): string {
  return `${username.toLowerCase()}@kng.internal`;
}

type PageState = "form" | "pending_confirm" | "success";

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
        },
      },
    });
    setLoading(false);

    if (authErr) {
      const msg = authErr.message ?? "";
      if (msg.includes("Signup code required")) {
        setError("A signup code is required. Get one from an AUX+.");
      } else if (msg.includes("Invalid or used signup code")) {
        setError("That code is invalid or has already been used.");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already registered")) {
        setError("That username is already taken. Try a different one.");
      } else if (msg.includes("Database error")) {
        setError("Signup failed — your code may be invalid or already used.");
      } else {
        setError(msg || "Signup failed. Please try again.");
      }
      return;
    }

    if (data.session) {
      // Logged in immediately — no email confirmation required
      navigate({ to: "/dashboard" });
    } else if (data.user) {
      // Account created but Supabase requires email confirmation.
      // Since we use internal emails, a manager must confirm via Supabase dashboard,
      // OR email confirmation should be disabled in Supabase Auth settings.
      setPage("pending_confirm");
    } else {
      setError("Something went wrong. Please try again.");
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
            <h1 className="text-xl font-semibold">Account created — needs confirmation</h1>
            <p className="text-sm text-muted-foreground">
              Your portal uses internal accounts, but Supabase email confirmation is still turned on.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-2">
              <p className="text-sm font-medium text-amber-300">Manager: fix this once</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to your <strong>Supabase dashboard</strong></li>
                <li>Authentication → Providers → Email</li>
                <li>Turn off <strong>"Confirm email"</strong> and save</li>
                <li>Come back and sign up again</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Alternatively, a manager can confirm the account manually in Supabase → Authentication → Users.
            </p>
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
            If you are the very first signup, leave the code blank.
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
                placeholder="KNG-XXXX (blank if first signup)"
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
