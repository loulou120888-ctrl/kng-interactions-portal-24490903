import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_portal/archives")({
  head: () => ({ meta: [{ title: "Archives — KNG" }] }),
  component: Archives,
});

function Archives() {
  const { isManager } = useAuth();
  const [pts, setPts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isManager) return;
    (async () => {
      const { data } = await supabase.from("points_log").select("user_id, amount, awarded_at");
      setPts(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((p: any) => p.user_id)));
      if (ids.length) {
        const { data: pf } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        setProfiles(Object.fromEntries((pf ?? []).map((x: any) => [x.id, x.display_name])));
      }
    })();
  }, [isManager]);

  if (!isManager) return <p className="text-sm text-muted-foreground">Managers only.</p>;

  // Group by month
  const months: Record<string, Record<string, number>> = {};
  pts.forEach((p) => {
    const d = new Date(p.awarded_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = months[key] ?? {};
    months[key][p.user_id] = (months[key][p.user_id] ?? 0) + (p.amount ?? 0);
  });
  const sortedMonths = Object.keys(months).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Archives</h1>
        <p className="text-sm text-muted-foreground">Historical leaderboard snapshots by month.</p>
      </div>
      {sortedMonths.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      {sortedMonths.map((m) => {
        const rows = Object.entries(months[m]).sort((a, b) => b[1] - a[1]);
        return (
          <Card key={m} className="rounded-2xl bg-card/60 p-5">
            <h2 className="font-semibold">{m}</h2>
            <div className="mt-3 divide-y divide-border">
              {rows.map(([uid, n], i) => (
                <div key={uid} className="flex items-center justify-between py-2">
                  <span className="text-sm">{i + 1}. {profiles[uid] ?? "—"}</span>
                  <span className="text-sm font-mono">{n} pts</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
