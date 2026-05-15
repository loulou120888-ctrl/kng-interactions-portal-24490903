import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ROLE_LABEL, DEPT_LABEL, ROLE_RANK, type Role, type Department } from "@/lib/portal";

export const Route = createFileRoute("/_portal/staff/$id")({  component: StaffProfile,
});

function StaffProfile() {
  const { id } = useParams({ from: "/_portal/staff/$id" });
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [points, setPoints] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }, { data: pts }, { data: ix }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id),
        supabase.from("points_log").select("amount").eq("user_id", id),
        supabase.from("interactions").select("*").eq("author_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      setProfile(p);
      setRoles((r ?? []).map((x: any) => x.role) as Role[]);
      setPoints((pts ?? []).reduce((a, b) => a + (b.amount ?? 0), 0));
      setRecent(ix ?? []);
    })();
  }, [id]);

  if (!profile) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const top = roles.length ? roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] : "member" as Role;

  return (
    <div className="space-y-6">
      <Link to="/staff"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
      <Card className="rounded-2xl bg-card/60 p-6">
        <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{ROLE_LABEL[top]}</Badge>
          {profile.department && <Badge variant="outline">{DEPT_LABEL[profile.department as Department]}</Badge>}
          <Badge variant="outline">{points} pts</Badge>
        </div>
      </Card>
      <Card className="rounded-2xl bg-card/60 p-5">
        <h2 className="text-sm font-semibold tracking-wide">Recent interactions</h2>
        <div className="mt-3 divide-y divide-border">
          {recent.length === 0 && <p className="py-3 text-sm text-muted-foreground">No interactions yet.</p>}
          {recent.map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between">
              <span className="text-sm">{r.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
