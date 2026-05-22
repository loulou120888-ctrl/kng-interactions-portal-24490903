import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/set-password")({ component: SetPasswordPage });

function SetPasswordPage() {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const forceReset = session?.user?.user_metadata?.force_password_reset;

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!forceReset) { navigate({ to: "/dashboard" }); }
  }, [user, loading, forceReset, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);

    const { error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { force_password_reset: null },
    });

    if (updateErr) {
      setError(updateErr.message || "Failed to set password. Please try again.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 1800);
  }

  if (loading || !user || !forceReset) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/40" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="font-semibold text-lg">Password set!</p>
              <p className="text-sm text-muted-foreground">Taking you to the portal…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Set your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You signed in with a one-time login code. Choose a permanent password to continue.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw">New password</Label>
                  <div className="relative">
                    <Input
                      id="pw"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setError(null); setPassword(e.target.value); }}
                      placeholder="At least 8 characters"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => { setError(null); setConfirm(e.target.value); }}
                    placeholder="Repeat your new password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Saving…" : "Set password & enter portal"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
