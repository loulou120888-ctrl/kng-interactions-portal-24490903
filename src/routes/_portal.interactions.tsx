import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search, Copy, Check, ChevronDown, ChevronUp, Users } from "lucide-react";
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

function InteractionRow({ r, profiles }: { r: any; profiles: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([]);
  const loadedRef = useRef(false);

  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  const authorName = profiles[r.author_id] ?? "—";

  async function loadAttendees() {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const { data } = await supabase
      .from("interaction_attendees")
      .select("user_id")
      .eq("interaction_id", r.id);
    const ids = (data ?? []).map((a: any) => a.user_id);
    setAttendees(ids.map(id => profiles[id] ?? id));
  }

  function toggle() {
    if (!expanded) loadAttendees();
    setExpanded(e => !e);
  }

  return (
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
                {attendees.map((name, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
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
  );
}

function Interactions() {
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
            <InteractionRow key={r.id} r={r} profiles={profiles} />
          ))}
        </div>
      </Card>
    </div>
  );
}
