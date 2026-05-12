import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity as ActivityIcon } from "lucide-react";

export const Route = createFileRoute("/_portal/activity")({
  head: () => ({ meta: [{ title: "Activity — MDT Portal" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("staff_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setItems(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((d) => d.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, display_name, rank").in("id", ids);
        const map: Record<string, any> = {};
        ps?.forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff activity</h1>
        <p className="text-sm text-muted-foreground">Audit log of recent actions.</p>
      </div>

      <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((r) => {
                const p = profiles[r.user_id];
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent">
                      <ActivityIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{p?.display_name ?? "Unknown"}</span>
                        <span className="text-muted-foreground"> · {r.action}</span>
                      </p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
