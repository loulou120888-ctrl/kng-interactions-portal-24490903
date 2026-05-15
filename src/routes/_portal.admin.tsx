import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Copy, Trash2 } from "lucide-react";
import { ALL_ROLES, ROLE_LABEL, ROLE_RANK, DEPARTMENTS, DEPT_LABEL, type Role, type Department } from "@/lib/portal";

export const Route = createFileRoute("/_portal/admin")({ component: Admin });

function Admin() {
  const { user, isAuxPlus, isManager, topRole } = useAuth();
  if (!isAuxPlus) return <p className="text-sm text-muted-foreground">AUX+ only.</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Generate signup codes and manage prizes.</p>
      </div>
      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Signup Codes</TabsTrigger>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
        </TabsList>
        <TabsContent value="codes"><Codes canManager={isManager} userId={user!.id} actorTopRole={topRole} /></TabsContent>
        <TabsContent value="prizes"><Prizes /></TabsContent>
      </Tabs>
    </div>
  );
}

function Codes({ canManager, userId, actorTopRole }: { canManager: boolean; userId: string; actorTopRole: Role }) {
  const [codes, setCodes] = useState<any[]>([]);
  const actorRank = ROLE_RANK[actorTopRole];
  const allowedRoles = ALL_ROLES.filter(r => ROLE_RANK[r] < actorRank);
  const [role, setRole] = useState<Role>(allowedRoles[0] ?? "member");
  const [dept, setDept] = useState<Department | "">("");

  async function load() {
    const data = await api.signupCodes.list().catch(() => []);
    setCodes(data);
  }
  useEffect(() => { load(); }, []);

  function genCode() { return "KNG-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }

  async function generate() {
    if (!allowedRoles.includes(role)) { toast.error("You cannot generate codes for that role."); return; }
    const code = genCode();
    await api.signupCodes.create({ code, role, department: dept || null }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Code created"); load();
  }

  async function revoke(id: string) {
    await api.signupCodes.revoke(id).catch((e: any) => { toast.error(e.message); return null; });
    load();
  }

  return (
    <Card className="rounded-2xl bg-card/60 p-5 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{allowedRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
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
        <Button onClick={generate}><Plus className="h-4 w-4 mr-1" /> Generate</Button>
      </div>
      <div className="divide-y divide-border">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-3">
            <span className="font-mono text-sm">{c.code}</span>
            <Badge variant="outline">{ROLE_LABEL[c.role as Role]}</Badge>
            {c.department && <Badge variant="outline">{DEPT_LABEL[c.department as Department]}</Badge>}
            {c.used_by ? <Badge>Used</Badge> : c.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="outline">Available</Badge>}
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
              {!c.used_by && !c.revoked && (
                <Button variant="ghost" size="icon" onClick={() => revoke(c.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </div>
          </div>
        ))}
        {codes.length === 0 && <p className="py-4 text-sm text-muted-foreground">No codes yet.</p>}
      </div>
    </Card>
  );
}

function Prizes() {
  const [prizes, setPrizes] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);

  async function load() {
    const data = await api.prizes.list().catch(() => []);
    setPrizes(data);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!code.trim() || !name.trim()) { toast.error("Code and name required"); return; }
    await api.prizes.create({ code: code.trim(), name: name.trim(), default_quantity: qty }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Added"); setCode(""); setName(""); setQty(1); load();
  }

  async function remove(id: string) {
    await api.prizes.delete(id).catch((e: any) => { toast.error(e.message); return null; });
    load();
  }

  return (
    <Card className="rounded-2xl bg-card/60 p-5 space-y-4">
      <div className="grid sm:grid-cols-4 gap-2">
        <Input placeholder="PRIZE_CODE" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input className="sm:col-span-2" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {prizes.length === 0 && <p className="py-4 text-sm text-muted-foreground">No prizes yet.</p>}
        {prizes.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <span className="font-mono text-sm">{p.code}</span>
            <span className="text-sm">{p.name}</span>
            <Badge variant="outline">x{p.default_quantity}</Badge>
            <Button className="ml-auto" variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
