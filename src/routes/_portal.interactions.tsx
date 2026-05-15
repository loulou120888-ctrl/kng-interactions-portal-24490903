import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
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

function InteractionRow({ r, authorName }: { r: any; authorName: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  return (
    <div className="py-3 px-2 space-y-2">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${DEPT_BG[r.department as Department]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground truncate">{DEPT_LABEL[r.department as Department]} · {authorName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleString()}</Badge>
          {hasPoster && (
            <button onClick={() => setExpanded(e => !e)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1">
              Poster {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
      {expanded && hasPoster && (
        <div className="ml-5 rounded-xl border border-border bg-background/40 p-3 space-y-3">
          {r.poster_message && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Poster message</p>
              <div className="flex items-start gap-2"><p className="text-sm flex-1 whitespace-pre-wrap">{r.poster_message}</p><CopyButton text={r.poster_message} /></div>
            </div>
          )}
          {r.poster_image_url && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Poster image</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">F3 message</p>
              <div className="flex items-start gap-2"><p className="text-sm flex-1 whitespace-pre-wrap font-mono text-xs">{r.f3_message}</p><CopyButton text={r.f3_message} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Interactions() {
  const [rows, setRows] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    api.interactions.list({ limit: 200 }).then(async (data) => {
      setRows(data);
      const ids = Array.from(new Set(data.map((r: any) => r.author_id)));
      if (ids.length) {
        const pfs = await api.profiles.batch(ids as string[]).catch(() => []);
        setProfileMap(Object.fromEntries(pfs.map((p: any) => [p.id, p.display_name])));
      }
    }).catch(() => {});
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
          <p className="text-sm text-muted-foreground">Every logged event, party and entertainment session.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 w-64" />
        </div>
      </div>
      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No interactions logged.</p>}
          {filtered.map((r) => <InteractionRow key={r.id} r={r} authorName={profileMap[r.author_id] ?? "—"} />)}
        </div>
      </Card>
    </div>
  );
}
