import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Redeem code — KNG Interactions Portal" }] }),
  component: SignupPage,
});

const schema = z.object({
  signup_code: z.string().trim().min(4, "Code required").max(64),
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  display_name: z.string().trim().min(1).max(80),
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ signup_code: "", email: "", password: "", display_name: "" });
  const [loading, setLoading] = useState(false);
  const [firstSignup, setFirstSignup] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  // Detect if there are any users yet — if not, allow signup without code (first becomes manager)
  useEffect(() => {
    supabase.from("user_roles").select("id", { count: "exact", head: true }).then(({ count }) => {
      setFirstSignup((count ?? 0) === 0);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = firstSignup ? { ...form, signup_code: form.signup_code || "FIRST" } : form;
    const parsed = schema.safeParse(data);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          display_name: parsed.data.display_name,
          signup_code: firstSignup ? "" : parsed.data.signup_code,
        },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created"); navigate({ to: "/dashboard" }); }
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
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
          <h1 className="text-xl font-semibold">{firstSignup ? "Create first account" : "Redeem signup code"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {firstSignup
              ? "First account becomes Manager."
              : "Each code is one-time. Ask an AUX+ for one."}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!firstSignup && (
              <div className="space-y-2">
                <Label>Signup code</Label>
                <Input value={form.signup_code} onChange={(e) => set("signup_code", e.target.value)} placeholder="KNG-XXXX" required />
              </div>
            )}
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
