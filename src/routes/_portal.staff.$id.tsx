import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ROLE_LABEL, DEPT_LABEL, ROLE_RANK, type Role, type Department } from "@/lib/portal";

export const Route = createFileRoute("/_portal/staff/$id")({ component: StaffProfile });

function StaffProfile() {
  const { id } = useParams({ from: "/_portal/staff/$id" });
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [points, setPoints] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, r, pts, ix] = await Promise.all([
        api.profiles.get(id).catch(() => null),
        api.roles.forUser(id).catch(() => []),
        api.points.list({ user_id: id }).catch(() => []),
        api.interactions.list({ author_id: id, limit: 20 }).catch(() => []),
      ]);
      setProfile(p);
      setRoles((r as any[]).map((x: any) => x.role) as Role[]);
      setPoints((pts as any[]).reduce((a, b) => a + (b.amount ?? 0), 0));
      setRecent(ix as any[]);
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
