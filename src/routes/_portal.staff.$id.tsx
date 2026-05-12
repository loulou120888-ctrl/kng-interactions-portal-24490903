import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/staff/$id")({
  head: () => ({ meta: [{ title: "Staff profile — MDT Portal" }] }),
  component: StaffProfilePage,
});

function StaffProfilePage() {
  const { id } = Route.useParams();
  const { isStaff, user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);

  async function load() {
    const [{ data: p }, { data: rs }, { data: ints }, { data: ws }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("interactions").select("*").eq("author_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("warnings").select("*").eq("target_user_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile(p);
    setRoles((rs ?? []).map((r) => r.role));
    setInteractions(ints ?? []);
    setWarnings(ws ?? []);
  }
  useEffect(() => { load(); }, [id]);

  if (!profile) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>

      <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
        <CardContent className="p-6 flex items-center gap-5">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarFallback className="bg-secondary text-lg">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">{profile.rank} · {profile.department}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.badge_number && <Badge variant="outline">Badge #{profile.badge_number}</Badge>}
              {roles.filter((r) => r !== "user").map((r) => (
                <Badge key={r} className="capitalize bg-primary/15 text-primary border-primary/30">{r}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Warnings & notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.length === 0 && <p className="text-sm text-muted-foreground">Clean record.</p>}
            {warnings.map((w) => (
              <div key={w.id} className="rounded-xl border border-border bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    className={
                      w.severity === "critical" ? "bg-destructive/20 text-destructive border-destructive/30" :
                      w.severity === "warning" ? "bg-warning/20 text-warning border-warning/30" :
                      "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {w.severity}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                    {isStaff && (
                      <Button variant="ghost" size="icon" onClick={async () => {
                        const { error } = await supabase.from("warnings").delete().eq("id", w.id);
                        if (error) toast.error(error.message);
                        else { toast.success("Removed"); load(); }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium">{w.reason}</p>
                {w.notes && <p className="text-xs text-muted-foreground whitespace-pre-line">{w.notes}</p>}
              </div>
            ))}
            {isStaff && user && <NewWarning targetId={id} issuedBy={user.id} onCreated={load} />}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
          <CardHeader><CardTitle className="text-base">Recent interactions</CardTitle></CardHeader>
          <CardContent>
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {interactions.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-3">
                    <Badge variant="outline">{r.type}</Badge>
                    <span className="flex-1 truncate text-sm">{r.summary}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewWarning({ targetId, issuedBy, onCreated }: { targetId: string; issuedBy: string; onCreated: () => void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [severity, setSeverity] = useState<"note" | "warning" | "critical">("note");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return toast.error("Reason required");
    setBusy(true);
    const { error } = await supabase.from("warnings").insert({
      target_user_id: targetId, issued_by: issuedBy, severity, reason: reason.trim(), notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Issued"); setReason(""); setNotes(""); onCreated(); }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border p-3 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Issue warning / note</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Label className="text-xs">Severity</Label>
          <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Add"}</Button>
    </form>
  );
}
