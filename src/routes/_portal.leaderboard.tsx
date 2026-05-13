import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_portal/leaderboard")({  component: Leaderboard,
});

function Leaderboard() {
  const [pts, setPts] = useState<{ user_id: string; amount: number; awarded_at: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("points_log").select("user_id, amount, awarded_at").gte("awarded_at", new Date(Date.now() - 35 * 86400_000).toISOString());
      setPts((data ?? []) as any);
      const ids = Array.from(new Set((data ?? []).map((p: any) => p.user_id)));
      if (ids.length) {
        const { data: pf } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        setProfiles(Object.fromEntries((pf ?? []).map((x: any) => [x.id, x.display_name])));
      }
    })();
    const ch = supabase.channel("points").on("postgres_changes", { event: "*", schema: "public", table: "points_log" }, () => {
      supabase.from("points_log").select("user_id, amount, awarded_at").gte("awarded_at", new Date(Date.now() - 35 * 86400_000).toISOString())
        .then(({ data }) => setPts((data ?? []) as any));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function aggregate(sinceMs: number) {
    const cutoff = Date.now() - sinceMs;
    const m: Record<string, number> = {};
    pts.forEach((p) => {
      if (new Date(p.awarded_at).getTime() >= cutoff) m[p.user_id] = (m[p.user_id] ?? 0) + (p.amount ?? 0);
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  const daily = useMemo(() => aggregate(86400_000), [pts]);
  const weekly = useMemo(() => aggregate(7 * 86400_000), [pts]);
  const monthly = useMemo(() => aggregate(30 * 86400_000), [pts]);

  function Board({ rows }: { rows: [string, number][] }) {
    return (
      <div className="divide-y divide-border">
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No points yet.</p>}
        {rows.map(([uid, n], i) => (
          <div key={uid} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                i === 0 ? "bg-[oklch(0.78_0.16_75)] text-background" :
                i === 1 ? "bg-[oklch(0.7_0.02_260)] text-background" :
                i === 2 ? "bg-[oklch(0.55_0.12_45)] text-background" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
              <span className="text-sm">{profiles[uid] ?? "—"}</span>
            </div>
            <span className="text-sm font-mono">{n} pts</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Trophy className="h-6 w-6" /> Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Live points across daily, weekly and monthly windows.</p>
      </div>
      <Card className="rounded-2xl bg-card/60 p-4">
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          <TabsContent value="daily"><Board rows={daily} /></TabsContent>
          <TabsContent value="weekly"><Board rows={weekly} /></TabsContent>
          <TabsContent value="monthly"><Board rows={monthly} /></TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
