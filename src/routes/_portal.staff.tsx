import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_portal/staff")({
  head: () => ({ meta: [{ title: "Staff — MDT Portal" }] }),
  component: StaffPage,
});

function StaffPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("profiles").select("*").order("display_name");
      setProfiles(ps ?? []);
      const { data: rs } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, string[]> = {};
      rs?.forEach((r) => { (map[r.user_id] ??= []).push(r.role); });
      setRoles(map);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-sm text-muted-foreground">Department roster.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Link key={p.id} to="/staff/$id" params={{ id: p.id }}>
            <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)] transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarFallback className="bg-secondary">
                      {p.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.rank} · {p.department}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.badge_number && <Badge variant="outline">#{p.badge_number}</Badge>}
                  {(roles[p.id] ?? []).filter((r) => r !== "user").map((r) => (
                    <Badge key={r} className="capitalize bg-primary/15 text-primary border-primary/30">{r}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
