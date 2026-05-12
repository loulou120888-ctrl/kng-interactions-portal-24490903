import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — MDT Portal" }] }),
  component: SignupPage,
});

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  display_name: z.string().trim().min(1).max(80),
  badge_number: z.string().trim().max(20).optional(),
  rank: z.string().trim().max(40).optional(),
  department: z.string().trim().max(40).optional(),
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", password: "", display_name: "", badge_number: "", rank: "Cadet", department: "Patrol",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          display_name: parsed.data.display_name,
          badge_number: parsed.data.badge_number,
          rank: parsed.data.rank,
          department: parsed.data.department,
        },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    }
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MDT Portal</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">First account becomes administrator.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Display name</Label>
                <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Badge #</Label>
                <Input value={form.badge_number} onChange={(e) => set("badge_number", e.target.value)} placeholder="1234" />
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <Input value={form.rank} onChange={(e) => set("rank", e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
              </div>
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
