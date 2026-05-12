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
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  display_name: z.string().trim().min(1, "Display name required").max(80),
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ signup_code: "", email: "", password: "", display_name: "" });
  const [loading, setLoading] = useState(false);
  const [awaitEmail, setAwaitEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("That email is already registered. Try signing in.");
      } else if (msg.includes("Database error")) {
        toast.error("Signup failed — check your code is valid and not already used.");
      } else {
        toast.error(msg || "Signup failed. Please try again.");
      }
      return;
    }

    if (!data.session) {
      setAwaitEmail(true);
      return;
    }

    toast.success("Account created — welcome!");
    navigate({ to: "/dashboard" });
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (awaitEmail) {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="text-foreground font-medium">{form.email}</span>.
              Click it to activate your account, then sign in below.
            </p>
            <Link to="/login" className="mt-6 block">
              <Button className="w-full">Go to sign in</Button>
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
            If you are the very first signup, leave the code blank.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Signup code</Label>
              <Input value={form.signup_code} onChange={(e) => set("signup_code", e.target.value)} placeholder="KNG-XXXX (blank if first signup)" />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
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
