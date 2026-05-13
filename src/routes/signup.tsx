import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Crown, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const schema = z.object({
  signup_code: z.string().trim().max(64).optional(),
  username: z
    .string().trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or less")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers and underscores"),
  display_name: z.string().trim().min(1, "Display name required").max(80),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ signup_code: "", username: "", display_name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (parsed.data.signup_code) {
      try {
        const validation = await api.auth.validateCode(parsed.data.signup_code.trim().toUpperCase());
        if (!validation.valid) {
          if (validation.reason === "revoked") setError("That signup code has been revoked. Ask a manager for a new one.");
          else if (validation.reason === "used") setError("That signup code has already been used. Each code is one-time only — ask a manager for a new one.");
          else setError("Invalid signup code. Double-check it and try again, or ask a manager for a new one.");
          return;
        }
      } catch {
        setError("Could not validate signup code. Check your connection and try again.");
        return;
      }
    }

    setLoading(true);
    try {
      const { user: u } = await api.auth.signup({
        username: parsed.data.username,
        password: parsed.data.password,
        display_name: parsed.data.display_name,
        signup_code: parsed.data.signup_code?.trim().toUpperCase() || undefined,
      });
      setUser(u);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message ?? "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
              {loading ? "Creating account…" : "Create account"}
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
