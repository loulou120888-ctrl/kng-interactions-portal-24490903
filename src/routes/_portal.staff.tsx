import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ALL_ROLES, ROLE_LABEL, DEPARTMENTS, DEPT_LABEL, ROLE_RANK, type Department, type Role } from "@/lib/portal";
import { UserCog, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_portal/staff")({
  head: () => ({ meta: [{ title: "Posters / Staff — KNG" }] }),
  component: StaffPage,
});

interface Staff {
  id: string;
  display_name: string;
  department: Department | null;
  avatar_url: string | null;
  status: string;
  roles: Role[];
}

function StaffPage() {
  const { user, isAuxPlus, isManager, topRole } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [edit, setEdit] = useState<Staff | null>(null);

  async function load() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, Role[]> = {};
    (roles ?? []).forEach((r: any) => {
      roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role];
    });
    setStaff((profiles ?? []).map((p: any) => ({ ...p, roles: roleMap[p.id] ?? ["member"] })));
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Posters &amp; Staff</h1>
        <p className="text-sm text-muted-foreground">
          {isAuxPlus ? "Promote, demote, rename or remove staff." : "Browse staff directory."}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => {
          const top = s.roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
          return (
            <Card key={s.id} className="rounded-2xl bg-card/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{s.display_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{ROLE_LABEL[top]}</Badge>
                    {s.department && <Badge variant="outline">{DEPT_LABEL[s.department]}</Badge>}
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
        <EditStaffDialog
          staff={edit}
          open={!!edit}
          onOpenChange={(o) => !o && setEdit(null)}
          canManager={isManager}
          actorTopRole={topRole}
          onChanged={() => { setEdit(null); load(); }}
        />
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

  // Only manager can grant manager role; AUX/ADM cannot.
  const allowedRoles = ALL_ROLES.filter(r => canManager || r !== "manager");

  async function save() {
    setBusy(true);
    const { error: pe } = await supabase.from("profiles").update({
      display_name: name.trim(),
      department: dept || null,
    }).eq("id", staff.id);
    if (pe) { setBusy(false); toast.error(pe.message); return; }

    if (role !== top) {
      // Replace roles: delete all then insert new
      await supabase.from("user_roles").delete().eq("user_id", staff.id);
      const { error: re } = await supabase.from("user_roles").insert({ user_id: staff.id, role });
      if (re) { setBusy(false); toast.error(re.message); return; }
    }
    setBusy(false); toast.success("Saved"); onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${staff.display_name}? Their signup code will not be reusable.`)) return;
    setBusy(true);
    // Manager-only via RLS. Cascade deletes profile + roles when auth.users is deleted by admin elsewhere;
    // here we just delete profile + roles (auth user remains until manager wipes them in Cloud).
    await supabase.from("user_roles").delete().eq("user_id", staff.id);
    await supabase.from("profiles").delete().eq("id", staff.id);
    setBusy(false); toast.success("Removed from portal"); onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {staff.display_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={dept || "none"} onValueChange={(v) => setDept(v === "none" ? "" : v as Department)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={busy} className="flex-1"><UserCog className="h-4 w-4 mr-2" /> Save</Button>
            {canManager && (
              <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
