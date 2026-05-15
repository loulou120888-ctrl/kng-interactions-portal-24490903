import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_portal/search")({  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      let req = supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(50);
      if (q.trim()) req = req.or(`title.ilike.%${q}%,summary.ilike.%${q}%,location.ilike.%${q}%`);
      const { data } = await req;
      setRows(data ?? []);
    }, 200);
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
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, location, summary…" className="pl-9" />
      </div>
      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3 px-2">
              <span className={`h-2 w-2 rounded-full ${DEPT_BG[r.department as Department]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {DEPT_LABEL[r.department as Department]}{r.location && ` · ${r.location}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
