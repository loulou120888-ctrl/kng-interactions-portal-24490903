import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ALL_ROLES, ROLE_LABEL, ROLE_RANK, DEPARTMENTS, DEPT_LABEL, type Department, type Role } from "@/lib/portal";
import { UserCog, Pencil, UserX, UserCheck, KeyRound, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_portal/staff")({ component: StaffPage });

interface Staff {
  id: string;
  display_name: string;
  username: string | null;
  department: Department | null;
  avatar_url: string | null;
  city_id: string | null;
  status: string;
  deactivated: boolean;
  roles: Role[];
}

function StaffPage() {
  const { user, isAuxPlus, isManager, topRole } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [filterDept, setFilterDept] = useState<Department | "all">("all");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");

  async function load() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, Role[]> = {};
    (roles ?? []).forEach((r: any) => {
      roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role];
    });
    setStaff(
      (profiles ?? []).map((p: any) => ({
        ...p,
        deactivated: p.deactivated ?? false,
        roles: roleMap[p.id] ?? ["member"],
      }))
    );
  }
  useEffect(() => { load(); }, []);

  const actorRank = ROLE_RANK[topRole];

  const visible = staff
    .filter((s) => showDeactivated || !s.deactivated)
    .filter((s) => filterDept === "all" || s.department === filterDept)
    .filter((s) => filterRole === "all" || s.roles.includes(filterRole))
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.display_name.toLowerCase().includes(q) ||
        (s.username ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff List</h1>
          <p className="text-sm text-muted-foreground">
            {isAuxPlus ? "Promote, demote, rename or deactivate staff." : "Browse staff directory."}
          </p>
        </div>
        {isManager && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeactivated((v) => !v)}
          >
            {showDeactivated ? "Hide deactivated" : "Show deactivated"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="h-9 w-48"
          placeholder="Search name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterDept} onValueChange={(v) => setFilterDept(v as Department | "all")}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as Role | "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterDept !== "all" || filterRole !== "all" || search) && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFilterDept("all"); setFilterRole("all"); setSearch(""); }}>
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-1">{visible.length} shown</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((s) => {
          const top = s.roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
          const targetRank = ROLE_RANK[top];
          const canEdit = isAuxPlus && s.id !== user?.id && actorRank > targetRank;
          return (
            <Card
              key={s.id}
              className={`rounded-2xl bg-card/60 p-4 ${s.deactivated ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <Link to="/staff/$id" params={{ id: s.id }}>
                    <p className="font-medium hover:underline">{s.display_name}</p>
                  </Link>
                  {s.username && (
                    <p className="text-xs text-muted-foreground">@{s.username}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{ROLE_LABEL[top]}</Badge>
                    {s.department && <Badge variant="outline">{DEPT_LABEL[s.department]}</Badge>}
                    {s.deactivated && <Badge variant="destructive">Deactivated</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => setEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-6 text-center">No staff match these filters.</p>
        )}
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
  const [cityId, setCityId] = useState(staff.city_id ?? "");
  const top = staff.roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
  const [role, setRole] = useState<Role>(top);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const actorRank = ROLE_RANK[actorTopRole];
  const allowedRoles = ALL_ROLES.filter((r) => ROLE_RANK[r] < actorRank);

  async function save() {
    setBusy(true);
    const { error: pe } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), department: dept || null, city_id: cityId.trim() || null } as any)
      .eq("id", staff.id);
    if (pe) { setBusy(false); toast.error(pe.message); return; }

    if (role !== top) {
      await supabase.from("user_roles").delete().eq("user_id", staff.id);
      const { error: re } = await supabase.from("user_roles").insert({ user_id: staff.id, role });
      if (re) { setBusy(false); toast.error(re.message); return; }
    }
    setBusy(false);
    toast.success("Saved");
    onChanged();
  }

  async function toggleDeactivated() {
    const next = !staff.deactivated;
    if (!confirm(`${next ? "Deactivate" : "Reactivate"} ${staff.display_name}? ${next ? "They will be immediately signed out and unable to log back in." : "They will be able to sign in again."}`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ deactivated: next } as any)
      .eq("id", staff.id);
    if (error) { setBusy(false); toast.error(error.message); return; }
    setBusy(false);
    toast.success(next ? "Account deactivated" : "Account reactivated");
    onChanged();
  }

  async function resetPassword() {
    if (!confirm(`Generate a new password for ${staff.display_name}? Their current password will stop working immediately.`)) return;
    setResetBusy(true);
    setNewPassword(null);
    setCopied(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Not authenticated"); setResetBusy(false); return; }

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: staff.id }),
      });
      const body = await res.json() as { password?: string; error?: string };
      if (!res.ok || !body.password) {
        toast.error(body.error ?? "Reset failed");
      } else {
        setNewPassword(body.password);
        toast.success("Password reset — share it securely with the staff member");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Network error");
    }
    setResetBusy(false);
  }

  function copyPassword() {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setNewPassword(null); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {staff.display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {staff.username && (
            <p className="text-sm text-muted-foreground">Username: <span className="font-mono">@{staff.username}</span></p>
          )}
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={dept || "none"} onValueChange={(v) => setDept(v === "none" ? "" : (v as Department))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City ID</Label>
            <Input value={cityId} onChange={(e) => setCityId(e.target.value)} placeholder="In-city identifier" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={busy} className="flex-1">
              <UserCog className="h-4 w-4 mr-2" /> Save
            </Button>
            {canManager && (
              <Button
                variant={staff.deactivated ? "outline" : "destructive"}
                onClick={toggleDeactivated}
                disabled={busy}
              >
                {staff.deactivated
                  ? <><UserCheck className="h-4 w-4 mr-1" /> Reactivate</>
                  : <><UserX className="h-4 w-4 mr-1" /> Deactivate</>
                }
              </Button>
            )}
          </div>

          {canManager && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> Password reset
                  </p>
                  <p className="text-xs text-muted-foreground">Generates a new random password instantly.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetPassword}
                  disabled={resetBusy}
                >
                  {resetBusy ? "Resetting…" : "Reset password"}
                </Button>
              </div>

              {newPassword && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">New password — share this securely then it won't be shown again:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono tracking-widest select-all">
                      {newPassword}
                    </code>
                    <Button size="icon" variant="outline" onClick={copyPassword} className="flex-shrink-0">
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

