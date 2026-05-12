import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_portal/warnings")({
  head: () => ({ meta: [{ title: "Warnings — MDT Portal" }] }),
  component: WarningsPage,
});

function WarningsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("warnings").select("*").order("created_at", { ascending: false });
      setItems(data ?? []);
      const ids = Array.from(new Set((data ?? []).flatMap((w) => [w.target_user_id, w.issued_by]).filter(Boolean)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, display_name").in("id", ids as string[]);
        const map: Record<string, any> = {};
        ps?.forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warnings & notes</h1>
        <p className="text-sm text-muted-foreground">Visible to you and staff.</p>
      </div>
      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed bg-card/40">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">Nothing here.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((w) => (
            <Card key={w.id} className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        w.severity === "critical" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        w.severity === "warning" ? "bg-warning/20 text-warning border-warning/30" :
                        "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {w.severity}
                    </Badge>
                    <Link to="/staff/$id" params={{ id: w.target_user_id }} className="text-sm font-medium hover:underline">
                      {profiles[w.target_user_id]?.display_name ?? "Unknown"}
                    </Link>
                  </div>
                  <p className="mt-2 font-medium">{w.reason}</p>
                  {w.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{w.notes}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Issued by {profiles[w.issued_by]?.display_name ?? "—"} · {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
