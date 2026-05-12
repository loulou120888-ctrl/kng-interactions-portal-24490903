import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ signup_code: "", username: "", display_name: "", password: "" });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Enforce lowercase on username before validation
    const normalized = { ...form, username: form.username.toLowerCase().trim() };
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
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

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("Signup code required")) {
        toast.error("A signup code is required. Get one from an AUX+.");
      } else if (msg.includes("Invalid or used signup code")) {
        toast.error("That code is invalid or has already been used.");
      } else if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("User already registered")) {
        toast.error("That username is already taken. Choose a different one.");
      } else if (msg.includes("Database error")) {
        toast.error("Signup failed — check your code is valid and not already used.");
      } else {
        toast.error(msg || "Signup failed. Please try again.");
      }
      return;
    }

    if (data.session) {
      toast.success("Account created — welcome!");
      navigate({ to: "/dashboard" });
    } else {
      // Email confirmation not needed with internal email, but handle gracefully
      toast.success("Account created! You can now sign in.");
      navigate({ to: "/login" });
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
            If you are the very first signup, leave the code blank.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
