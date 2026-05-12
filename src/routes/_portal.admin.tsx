import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Role = "admin" | "moderator" | "user";

export const Route = createFileRoute("/_portal/admin")({
  head: () => ({ meta: [{ title: "Permissions — MDT Portal" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, Role[]>>({});

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  async function load() {
    const { data: ps } = await supabase.from("profiles").select("*").order("display_name");
    setProfiles(ps ?? []);
    const { data: rs } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, Role[]> = {};
    rs?.forEach((r) => { (map[r.user_id] ??= []).push(r.role as Role); });
    setRoles(map);
  }
  useEffect(() => { load(); }, []);

  async function setRole(userId: string, role: Role, on: boolean) {
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    }
    toast.success("Updated");
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin permissions</h1>
        <p className="text-sm text-muted-foreground">Grant moderator or administrator roles.</p>
      </div>

      <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
        <CardHeader><CardTitle className="text-base">Roster</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {profiles.map((p) => {
              const r = roles[p.id] ?? [];
              const hasAdmin = r.includes("admin");
              const hasMod = r.includes("moderator");
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">{p.rank} · {p.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAdmin && <Badge className="bg-primary/15 text-primary border-primary/30">admin</Badge>}
                    {hasMod && <Badge className="bg-chart-4/15 border-chart-4/30" style={{ color: "oklch(0.65 0.2 305)" }}>moderator</Badge>}
                    <Button size="sm" variant={hasMod ? "secondary" : "outline"} onClick={() => setRole(p.id, "moderator", !hasMod)}>
                      {hasMod ? "Remove mod" : "Make mod"}
                    </Button>
                    <Button size="sm" variant={hasAdmin ? "secondary" : "outline"} onClick={() => setRole(p.id, "admin", !hasAdmin)}>
                      {hasAdmin ? "Remove admin" : "Make admin"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
