import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { DEPT_LABEL, type Department } from "@/lib/portal";

export const Route = createFileRoute("/_portal/comp")({  component: CompQueue,
});

function CompQueue() {
  const { user, isAuxPlus } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<Record<string, any>>({});

  async function load() {
    const { data } = await supabase.from("interaction_winners").select("*").eq("comped", false).order("created_at", { ascending: true });
    setRows(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((w: any) => w.interaction_id)));
    if (ids.length) {
      const { data: ix } = await supabase.from("interactions").select("id, title, department").in("id", ids);
      setInteractions(Object.fromEntries((ix ?? []).map((x: any) => [x.id, x])));
    }
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("comp").on("postgres_changes", { event: "*", schema: "public", table: "interaction_winners" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!isAuxPlus) return <p className="text-sm text-muted-foreground">AUX+ only.</p>;

  async function copyCmd(w: any) {
    const cmd = `!additem ${w.winner_id} ${w.prize_code} ${w.quantity}`;
    await navigator.clipboard.writeText(cmd);
    toast.success("Copied: " + cmd);
  }

  async function markDone(w: any) {
    const { error } = await supabase.from("interaction_winners").update({
      comped: true, comped_by: user?.id, comped_at: new Date().toISOString(),
    }).eq("id", w.id);
    if (error) toast.error(error.message);
    else { toast.success("Marked comped"); load(); }
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
            const ix = interactions[w.interaction_id];
            return (
              <div key={w.id} className="flex items-center gap-3 py-3 px-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.prize_name ?? w.prize_code} × {w.quantity}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Winner: <span className="font-mono">{w.winner_id}</span>
                    {ix && ` · ${ix.title} · ${DEPT_LABEL[ix.department as Department]}`}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">!additem {w.winner_id} {w.prize_code} {w.quantity}</p>
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
