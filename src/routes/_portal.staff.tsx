import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ALL_ROLES, ROLE_LABEL, DEPARTMENTS, DEPT_LABEL, ROLE_RANK, type Department, type Role } from "@/lib/portal";
import { UserCog, Pencil, UserX, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_portal/staff")({ component: StaffPage });

interface Staff {
  id: string; display_name: string; username: string | null;
  department: Department | null; avatar_url: string | null;
  status: string; deactivated: boolean; roles: Role[];
}

function StaffPage() {
  const { user, isAuxPlus, isManager, topRole } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [showDeactivated, setShowDeactivated] = useState(false);

  async function load() {
    const [profiles, roles] = await Promise.all([
      api.profiles.list().catch(() => []),
      api.roles.list().catch(() => []),
    ]);
    const roleMap: Record<string, Role[]> = {};
    (roles as any[]).forEach((r: any) => { roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role]; });
    setStaff((profiles as any[]).map((p: any) => ({ ...p, deactivated: p.deactivated ?? false, roles: roleMap[p.id] ?? ["member"] })));
  }
  useEffect(() => { load(); }, []);

  const visible = showDeactivated ? staff : staff.filter(s => !s.deactivated);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff Directory</h1>
          <p className="text-sm text-muted-foreground">{isAuxPlus ? "Promote, demote, rename or deactivate staff." : "Browse staff directory."}</p>
        </div>
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => setShowDeactivated(v => !v)}>
            {showDeactivated ? "Hide deactivated" : "Show deactivated"}
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((s) => {
          const top = s.roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
          return (
            <Card key={s.id} className={`rounded-2xl bg-card/60 p-4 ${s.deactivated ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <Link to="/staff/$id" params={{ id: s.id }}>
                    <p className="font-medium hover:underline">{s.display_name}</p>
                  </Link>
                  {s.username && <p className="text-xs text-muted-foreground">@{s.username}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{ROLE_LABEL[top]}</Badge>
                    {s.department && <Badge variant="outline">{DEPT_LABEL[s.department]}</Badge>}
                    {s.deactivated && <Badge variant="destructive">Deactivated</Badge>}
                  </div>
                </div>
                {isAuxPlus && s.id !== user?.id && (
                  <Button size="icon" variant="ghost" onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /></Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {edit && (
        <EditStaffDialog staff={edit} open={!!edit} onOpenChange={o => !o && setEdit(null)}
          canManager={isManager} actorTopRole={topRole} onChanged={() => { setEdit(null); load(); }} />
      )}
    </div>
  );
}

function EditStaffDialog({ staff, open, onOpenChange, canManager, actorTopRole, onChanged }: {
  staff: Staff; open: boolean; onOpenChange: (o: boolean) => void;
  canManager: boolean; actorTopRole: Role; onChanged: () => void;
}) {
  const [name, setName] = useState(staff.display_name);
  const [dept, setDept] = useState<Department | "">(staff.department ?? "");
  const top = staff.roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
  const [role, setRole] = useState<Role>(top);
  const [busy, setBusy] = useState(false);
  const allowedRoles = ALL_ROLES.filter(r => canManager || r !== "manager");

  async function save() {
    setBusy(true);
    try {
      await api.profiles.update(staff.id, { display_name: name.trim(), department: dept || null });
      if (role !== top) await api.roles.setRole(staff.id, role);
      toast.success("Saved"); onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function toggleDeactivated() {
    const next = !staff.deactivated;
    if (!confirm(`${next ? "Deactivate" : "Reactivate"} ${staff.display_name}?`)) return;
    setBusy(true);
    try {
      await api.profiles.update(staff.id, { deactivated: next });
      toast.success(next ? "Account deactivated" : "Account reactivated"); onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {staff.display_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {staff.username && <p className="text-sm text-muted-foreground">Username: <span className="font-mono">@{staff.username}</span></p>}
          <div className="space-y-2"><Label>Display name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={dept || "none"} onValueChange={v => setDept(v === "none" ? "" : v as Department)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={v => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{allowedRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={busy} className="flex-1"><UserCog className="h-4 w-4 mr-2" /> Save</Button>
            {canManager && (
              <Button variant={staff.deactivated ? "outline" : "destructive"} onClick={toggleDeactivated} disabled={busy}>
                {staff.deactivated ? <><UserCheck className="h-4 w-4 mr-1" /> Reactivate</> : <><UserX className="h-4 w-4 mr-1" /> Deactivate</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
