import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { DEPT_LABEL, type Department } from "@/lib/portal";

export const Route = createFileRoute("/_portal/comp")({ component: CompQueue });

function CompQueue() {
  const { user, isAuxPlus } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [interactionMap, setInteractionMap] = useState<Record<string, any>>({});

  async function load() {
    const data = await api.winners.pending().catch(() => [] as any[]);
    setRows(data);
    const ids = Array.from(new Set(data.map((w: any) => w.interaction_id)));
    if (ids.length) {
      const ix = await api.interactions.list({ limit: 1000 }).catch(() => [] as any[]);
      setInteractionMap(Object.fromEntries((ix as any[]).filter((x: any) => ids.includes(x.id)).map((x: any) => [x.id, x])));
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuxPlus) return <p className="text-sm text-muted-foreground">AUX+ only.</p>;

  async function copyCmd(w: any) {
    const cmd = `!additem ${w.winner_id} ${w.prize_code} ${w.quantity} ENTERTAINMENT WINNER`;
    await navigator.clipboard.writeText(cmd);
    toast.success("Copied: " + cmd);
  }

  async function markDone(w: any) {
    await api.winners.comp(w.id).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Marked comped"); load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comp Queue</h1>
        <p className="text-sm text-muted-foreground">Pending prizes awaiting comp. Click row to copy spawn command.</p>
      </div>
      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">All clear — nothing to comp.</p>}
          {rows.map((w) => {
            const ix = interactionMap[w.interaction_id];
            return (
              <div key={w.id} className="flex items-center gap-3 py-3 px-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.prize_name ?? w.prize_code} × {w.quantity}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Winner: <span className="font-mono">{w.winner_id}</span>
                    {ix && ` · ${ix.title} · ${DEPT_LABEL[ix.department as Department]}`}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">!additem {w.winner_id} {w.prize_code} {w.quantity} ENTERTAINMENT WINNER</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyCmd(w)}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                <Button size="sm" onClick={() => markDone(w)}><Check className="h-3 w-3 mr-1" /> Done</Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
