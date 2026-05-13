import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crown, AlertCircle, CheckCircle2, Trash2, ShieldAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({  component: SetupPage,
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

type Step = "intro" | "key" | "confirm" | "done" | "error";

function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [serviceKey, setServiceKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletedRows, setDeletedRows] = useState({ roles: 0, profiles: 0 });

  async function doReset() {
    setBusy(true);
    setErrorMsg("");
    try {
      const admin = createClient(SUPABASE_URL, serviceKey, {
        auth: { persistSession: false },
      });

      // Verify the key is actually a service role key
      const { data: testData, error: testErr } = await admin
        .from("user_roles")
        .select("id", { count: "exact" });
      if (testErr) {
        setErrorMsg(`Key verification failed: ${testErr.message}. Make sure you copied the service_role key, not the anon key.`);
        setBusy(false);
        return;
      }

      const roleCount = (testData as any[])?.length ?? 0;

      // Clear user_roles (this is what the trigger checks)
      const { error: rolesErr } = await admin
        .from("user_roles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
      if (rolesErr) {
        setErrorMsg(`Failed to clear roles: ${rolesErr.message}`);
        setBusy(false);
        return;
      }

      // Clear profiles
      const { error: profilesErr } = await admin
        .from("profiles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
      if (profilesErr) {
        setErrorMsg(`Failed to clear profiles: ${profilesErr.message}`);
        setBusy(false);
        return;
      }

      setDeletedRows({ roles: roleCount, profiles: roleCount });
      setStep("done");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unexpected error. Check the key and try again.");
    }
    setBusy(false);
  }

  if (step === "intro") {
    return (
      <Layout>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Portal Setup</h1>
            <p className="text-sm text-muted-foreground">One-time first-run setup</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The portal already has test accounts stored, so new signups are blocked until
            those are cleared. This page will wipe the old test data so you can create
            your real manager account.
          </p>
          <p>
            You'll need your <strong className="text-foreground">Supabase service role key</strong>.
            It takes about 30 seconds to find.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium">How to get your service role key:</p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5">
            <li>
              Open{" "}
              <a
                href={`https://supabase.com/dashboard/project/${PROJECT_ID}/settings/api`}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                this link <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (your Supabase project API settings)
            </li>
            <li>Sign in with the same account connected to this Replit project</li>
            <li>Scroll to <strong className="text-foreground">Project API keys</strong></li>
            <li>Copy the <strong className="text-foreground">service_role</strong> key (click "Reveal")</li>
          </ol>
        </div>
        <Button className="w-full" onClick={() => setStep("key")}>
          I have the key — continue
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          This page is only for setup. It won't appear in the nav.
        </p>
      </Layout>
    );
  }

  if (step === "key") {
    return (
      <Layout>
        <h1 className="text-xl font-semibold">Paste service role key</h1>
        <p className="text-sm text-muted-foreground">
          The key starts with <code className="text-xs bg-muted px-1 py-0.5 rounded">eyJ…</code> and is much longer than the anon key.
        </p>
        <div className="space-y-2">
          <Label>Service role key</Label>
          <Input
            type="password"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            className="font-mono text-xs"
          />
        </div>
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{errorMsg}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("intro")} className="flex-1">Back</Button>
          <Button
            className="flex-1"
            disabled={serviceKey.length < 100}
            onClick={() => { setErrorMsg(""); setStep("confirm"); }}
          >
            Next
          </Button>
        </div>
      </Layout>
    );
  }

  if (step === "confirm") {
    return (
      <Layout>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Confirm reset</h1>
            <p className="text-sm text-muted-foreground">This cannot be undone</p>
          </div>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1.5 text-sm">
          <p className="font-medium text-destructive">The following will be deleted:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>All user profiles</li>
            <li>All user roles</li>
          </ul>
          <p className="text-muted-foreground pt-1">
            Interactions, schedule slots, announcements and other data will be preserved.
            Auth accounts in Supabase will also remain but won't have portal access.
          </p>
        </div>
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{errorMsg}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("key")} className="flex-1" disabled={busy}>Back</Button>
          <Button variant="destructive" className="flex-1" disabled={busy} onClick={doReset}>
            {busy ? "Resetting…" : "Reset portal data"}
          </Button>
        </div>
      </Layout>
    );
  }

  if (step === "done") {
    return (
      <Layout>
        <div className="text-center space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-green-500/10 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-xl font-semibold">Portal reset</h1>
          <p className="text-sm text-muted-foreground">
            Old test data cleared. You can now sign up as the first manager —
            leave the signup code blank.
          </p>
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p>Also make sure email confirmation is <strong className="text-foreground">disabled</strong> in Supabase:</p>
            <a
              href={`https://supabase.com/dashboard/project/${PROJECT_ID}/auth/providers`}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              Authentication → Providers → Email → Confirm email: OFF <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Button className="w-full" onClick={() => navigate({ to: "/signup" })}>
            Go to signup
          </Button>
        </div>
      </Layout>
    );
  }

  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">KNG Portal</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
