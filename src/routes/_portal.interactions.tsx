import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_portal/interactions")({
  head: () => ({ meta: [{ title: "Interactions — KNG Portal" }] }),
  component: Interactions,
});

function Interactions() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(200);
      setRows(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.author_id)));
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name])));
      }
    })();

    const ch = supabase.channel("interactions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "interactions" }, () => {
        supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(200)
          .then(({ data }) => setRows(data ?? []));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = rows.filter(r => !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.summary ?? "").toLowerCase().includes(q.toLowerCase()) || (r.location ?? "").toLowerCase().includes(q.toLowerCase()));

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
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3 px-2">
              <span className={`h-2 w-2 rounded-full ${DEPT_BG[r.department as Department]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {DEPT_LABEL[r.department as Department]} · {profiles[r.author_id] ?? "—"}
                  {r.location && ` · ${r.location}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
