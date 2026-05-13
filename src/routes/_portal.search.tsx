import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_portal/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const data = await api.interactions.list({ q: q.trim() || undefined, limit: 50 }).catch(() => [] as any[]);
      setRows(data);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Find any past interaction.</p>
      </div>
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, summary, poster…" className="pl-9" />
      </div>
      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No results.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3 px-2">
              <span className={`h-2 w-2 rounded-full ${DEPT_BG[r.department as Department]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{DEPT_LABEL[r.department as Department]}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
