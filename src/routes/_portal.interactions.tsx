import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search, Copy, Check, ChevronDown, ChevronUp, Users, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/interactions")({ component: Interactions });

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="ml-auto flex-shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EditInteractionDialog({
  interaction,
  open,
  onOpenChange,
  onSaved,
}: {
  interaction: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState("");
  const [staff, setStaff] = useState<{ id: string; display_name: string }[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSummary(interaction.summary ?? "");
    supabase.from("profiles").select("id, display_name").order("display_name")
      .then(({ data }) => setStaff((data ?? []) as any));
    supabase.from("interaction_attendees").select("user_id").eq("interaction_id", interaction.id)
      .then(({ data }) => setAttendees((data ?? []).map((a: any) => a.user_id)));
  }, [open, interaction]);

  function toggle(id: string) {
    setAttendees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function save() {
    if (!user) return;
    setBusy(true);

    const summaryUpdate = await supabase.from("interactions")
      .update({ summary: summary.trim() || null })
      .eq("id", interaction.id);
    if (summaryUpdate.error) { toast.error(summaryUpdate.error.message); setBusy(false); return; }

    await supabase.from("interaction_attendees").delete().eq("interaction_id", interaction.id);
    if (attendees.length) {
      await supabase.from("interaction_attendees").insert(
        attendees.map(uid => ({ interaction_id: interaction.id, user_id: uid }))
      );
    }

    setBusy(false);
    toast.success("Interaction updated");
    onSaved();
    onOpenChange(false);
  }

  const hostId = interaction.author_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit: {interaction.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Brief description of what happened…"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Staff who attended / helped{" "}
              <span className="text-muted-foreground font-normal">(each gets a point)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {staff.filter(s => s.id !== hostId).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    attendees.includes(s.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {attendees.length > 0 && <Badge variant="outline">{attendees.length} attendee{attendees.length !== 1 ? "s" : ""} selected</Badge>}
          </div>

          <Button className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InteractionRow({ r, profiles, currentUserId, isAdmPlus }: { r: any; profiles: Record<string, string>; currentUserId: string; isAdmPlus: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [attendees, setAttendees] = useState<{ id: string; name: string }[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const loadedRef = useRef(false);

  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  const authorName = profiles[r.author_id] ?? "—";
  const isAuthor = currentUserId === r.author_id;
  const canEdit = isAuthor || isAdmPlus;

  async function loadAttendees() {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const { data } = await supabase
      .from("interaction_attendees")
      .select("user_id")
      .eq("interaction_id", r.id);
    const ids = (data ?? []).map((a: any) => a.user_id);
    setAttendees(ids.map((id: string) => ({ id, name: profiles[id] ?? id })));
  }

  function reloadAttendees() {
    loadedRef.current = false;
    loadAttendees();
  }

  function toggle() {
    if (!expanded) loadAttendees();
    setExpanded(e => !e);
  }

  return (
    <>
      <div className="py-3 px-2 space-y-2">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${DEPT_BG[r.department as Department]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {DEPT_LABEL[r.department as Department]} · Logged by <span className="font-medium text-foreground">{authorName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleString()}</Badge>
            {canEdit && (
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button
              onClick={toggle}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1"
            >
              Details {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="ml-5 rounded-xl border border-border bg-background/40 p-3 space-y-3">
            {r.summary && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.summary}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Attendees ({attendees.length})
              </p>
              {attendees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attendees recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {attendees.map((a) => (
                    <Badge key={a.id} variant="outline" className="text-xs">{a.name}</Badge>
                  ))}
                </div>
              )}
            </div>

            {hasPoster && (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Promo Content</p>
                {r.poster_message && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Poster message</p>
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1 whitespace-pre-wrap">{r.poster_message}</p>
                      <CopyButton text={r.poster_message} />
                    </div>
                  </div>
                )}
                {r.poster_image_url && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Poster image</p>
                    <div className="flex items-start gap-2">
                      <a href={r.poster_image_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.poster_image_url} alt="poster" className="h-24 w-24 rounded-lg object-cover border border-border hover:opacity-80 transition" />
                      </a>
                      <CopyButton text={r.poster_image_url} />
                    </div>
                  </div>
                )}
                {r.f3_message && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">F3 message</p>
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1 whitespace-pre-wrap font-mono text-xs">{r.f3_message}</p>
                      <CopyButton text={r.f3_message} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <EditInteractionDialog
        interaction={r}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={reloadAttendees}
      />
    </>
  );
}

function Interactions() {
  const { user, isAdmPlus } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  async function loadRows() {
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const fresh = data ?? [];
    setRows(fresh);
    const ids = Array.from(new Set(fresh.map((r: any) => r.author_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids as string[]);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name])));
    }
  }

  useEffect(() => {
    loadRows();
    const ch = supabase.channel("interactions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "interactions" }, loadRows)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = rows.filter(r => !q ||
    r.title.toLowerCase().includes(q.toLowerCase()) ||
    (r.summary ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.poster_message ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.f3_message ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interactions</h1>
          <p className="text-sm text-muted-foreground">Every logged event, party and entertainment session. Expand any row to see who attended.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 w-64" />
        </div>
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No interactions logged.</p>}
          {filtered.map((r) => (
            <InteractionRow key={r.id} r={r} profiles={profiles} currentUserId={user?.id ?? ""} isAdmPlus={isAdmPlus} />
          ))}
        </div>
      </Card>
    </div>
  );
}
