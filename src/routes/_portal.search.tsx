import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_portal/search")({
  head: () => ({ meta: [{ title: "Search — MDT Portal" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((r) =>
      [r.citizen_name, r.summary, r.details, r.type, r.location, r.severity]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(t)),
    );
  }, [q, items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search interactions</h1>
        <p className="text-sm text-muted-foreground">Search across citizens, summary, location, and details.</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by citizen, type, location…"
          className="pl-10 h-12 rounded-xl"
        />
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches.</p>
        )}
        {filtered.map((r) => (
          <Card key={r.id} className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-4 flex items-center gap-3">
              <Badge variant="outline">{r.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{r.summary}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.citizen_name} {r.location && `· ${r.location}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
