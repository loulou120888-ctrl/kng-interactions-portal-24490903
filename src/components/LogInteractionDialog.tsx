import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Department } from "@/lib/portal";

interface Slot { id: string; department: Department; title: string; notes: string | null; }
interface Winner { winner_id: string; prize_code: string; quantity: number; }

export function LogInteractionDialog({ open, onOpenChange, slot, onLogged }: {
  open: boolean; onOpenChange: (o: boolean) => void; slot: Slot; onLogged: () => void;
}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState("");
  const [hostId, setHostId] = useState<string>("");
  const [staff, setStaff] = useState<{ id: string; display_name: string }[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [prizes, setPrizes] = useState<{ code: string; name: string; default_quantity: number }[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSummary(""); setHostId(user?.id ?? ""); setAttendees([]); setWinners([]);
    Promise.all([
      api.profiles.list().catch(() => []),
      api.prizes.list().catch(() => []),
    ]).then(([pf, pz]) => {
      setStaff(pf as any);
      setPrizes((pz as any[]).map((p: any) => ({ code: p.code, name: p.name, default_quantity: p.default_quantity })));
    });
  }, [open, user]);

  function toggleAttendee(id: string) {
    setAttendees(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  }
  function addWinner() { setWinners(w => [...w, { winner_id: "", prize_code: prizes[0]?.code ?? "", quantity: prizes[0]?.default_quantity ?? 1 }]); }
  function updateWinner(i: number, patch: Partial<Winner>) { setWinners(w => w.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function removeWinner(i: number) { setWinners(w => w.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      await api.interactions.create({
        department: slot.department,
        title: slot.title,
        summary: summary.trim() || null,
        author_id: hostId || user.id,
        slot_id: slot.id,
        attendees,
        winners: winners.map(w => ({
          ...w,
          prize_name: prizes.find(p => p.code === w.prize_code)?.name ?? null,
        })),
      });
      toast.success("Interaction logged · +1 point");
      onLogged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log interaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log: {slot.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Host</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={hostId} onChange={(e) => setHostId(e.target.value)}>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}{s.id === user?.id ? " (you)" : ""}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Brief description of what happened…" />
          </div>
          <div className="space-y-2">
            <Label>Staff who attended / helped <span className="text-muted-foreground font-normal">(each gets a point)</span></Label>
            <div className="flex flex-wrap gap-1.5">
              {staff.filter(s => s.id !== (hostId || user?.id)).map((s) => (
                <button key={s.id} type="button" onClick={() => toggleAttendee(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${attendees.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                  {s.display_name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Winners & prizes</Label>
              <Button type="button" size="sm" variant="outline" onClick={addWinner}><Plus className="h-3 w-3 mr-1" /> Add winner</Button>
            </div>
            {winners.length === 0 && <p className="text-xs text-muted-foreground">No winners for this one.</p>}
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4" placeholder="Winner ID" value={w.winner_id} onChange={(e) => updateWinner(i, { winner_id: e.target.value })} />
                  <select className="col-span-5 rounded-md border border-input bg-background px-3 py-2 text-sm" value={w.prize_code}
                    onChange={(e) => { const p = prizes.find(x => x.code === e.target.value); updateWinner(i, { prize_code: e.target.value, quantity: p?.default_quantity ?? w.quantity }); }}>
                    {prizes.length === 0 && <option value="">No prizes</option>}
                    {prizes.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
                  </select>
                  <Input className="col-span-2" type="number" min={1} value={w.quantity} onChange={(e) => updateWinner(i, { quantity: parseInt(e.target.value) || 1 })} />
                  <Button className="col-span-1" variant="ghost" size="icon" onClick={() => removeWinner(i)}><X className="h-4 w-4" /></Button>
                  {prizes.length === 0 && <Input className="col-span-12" placeholder="Prize code" value={w.prize_code} onChange={(e) => updateWinner(i, { prize_code: e.target.value })} />}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">+1 point to host</Badge>
            {attendees.length > 0 && <Badge variant="outline">+{attendees.length} points to attendees</Badge>}
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Log interaction"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
