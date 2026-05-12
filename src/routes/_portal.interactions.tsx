import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_portal/interactions")({
  head: () => ({ meta: [{ title: "Interactions — MDT Portal" }] }),
  component: InteractionsPage,
});

const types = ["Citation", "Arrest", "Warning", "Stop", "Report", "Other"];
const severities = ["low", "medium", "high", "critical"];

const schema = z.object({
  type: z.string().min(1).max(40),
  citizen_name: z.string().trim().min(1).max(120),
  location: z.string().trim().max(200).optional(),
  summary: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

function InteractionsPage() {
  const { user, isStaff } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  async function load() {
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((d) => d.author_id).filter(Boolean)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, badge_number").in("id", ids as string[]);
      const map: Record<string, any> = {};
      ps?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("interactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interactions</h1>
          <p className="text-sm text-muted-foreground">Log and review citizen interactions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New interaction</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Log interaction</DialogTitle></DialogHeader>
            <NewInteractionForm
              onCreated={async () => {
                setOpen(false);
                await load();
                if (user) {
                  await supabase.from("staff_activity").insert({
                    user_id: user.id, action: "interaction.create", description: "Logged a new interaction",
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {items.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border bg-card/40">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No interactions yet. Log the first one.
            </CardContent>
          </Card>
        )}
        {items.map((r) => {
          const author = r.author_id ? profiles[r.author_id] : null;
          const canDelete = isStaff || r.author_id === user?.id;
          return (
            <Card key={r.id} className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.type}</Badge>
                      <SeverityBadge s={r.severity} />
                    </div>
                    <h3 className="mt-2 font-medium">{r.summary}</h3>
                    <p className="text-sm text-muted-foreground">
                      Citizen: <span className="text-foreground">{r.citizen_name}</span>
                      {r.location && <> · {r.location}</>}
                    </p>
                    {r.details && <p className="mt-2 text-sm whitespace-pre-line">{r.details}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(r.created_at).toLocaleString()}</p>
                    {author && <p className="mt-1">{author.display_name} {author.badge_number && `· #${author.badge_number}`}</p>}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewInteractionForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: "Citation", citizen_name: "", location: "", summary: "", details: "", severity: "low" as const,
  });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("interactions").insert({ ...parsed.data, author_id: user.id });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Logged"); onCreated(); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{severities.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Citizen name</Label>
          <Input value={form.citizen_name} onChange={(e) => set("citizen_name", e.target.value)} required />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Mission Row" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Summary</Label>
          <Input value={form.summary} onChange={(e) => set("summary", e.target.value)} required />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Details</Label>
          <Textarea rows={4} value={form.details} onChange={(e) => set("details", e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Log interaction"}</Button>
    </form>
  );
}

function SeverityBadge({ s }: { s: string }) {
  const cls =
    s === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" :
    s === "high" ? "bg-warning/15 text-warning border-warning/30" :
    s === "medium" ? "bg-primary/15 text-primary border-primary/30" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>{s}</span>;
}
