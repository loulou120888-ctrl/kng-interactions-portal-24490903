import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, X, Layers } from "lucide-react";
import { buildDaySlots, fmtSlot, DEPT_LABEL, DEPT_BG, DEPT_BORDER, type Department, type ScheduleType } from "@/lib/portal";
import { LogInteractionDialog } from "@/components/LogInteractionDialog";

interface Slot {
  id: string; schedule_type: ScheduleType; slot_start: string;
  department: Department; title: string; notes: string | null;
  booked_by: string; claimed_by: string | null;
  status: "booked" | "in_progress" | "completed" | "cancelled";
  interaction_id: string | null;
}

function getLondonToday(): Date {
  const londonStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/London" });
  const [y, m, d] = londonStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ScheduleView({ scheduleType, title, allowedDepartments }: {
  scheduleType: ScheduleType; title: string; allowedDepartments: Department[];
}) {
  const { user, isAuxPlus } = useAuth();
  const [date, setDate] = useState<Date>(getLondonToday);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, { display_name: string }>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [logSlot, setLogSlot] = useState<Slot | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const slotTimes = useMemo(() => buildDaySlots(date), [date]);
  const dayStart = slotTimes[0];
  const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 3600 * 1000).toISOString();

  const currentISO = useMemo(() => {
    return slotTimes.find(iso => {
      const start = new Date(iso).getTime();
      return now.getTime() >= start && now.getTime() < start + 30 * 60 * 1000;
    }) ?? null;
  }, [slotTimes, now]);

  async function load() {
    const data = await api.schedule.list(scheduleType, dayStart, dayEnd).catch(() => [] as any[]);
    setSlots(data as Slot[]);
    const ids = Array.from(new Set([
      ...data.map((s: any) => s.booked_by),
      ...data.filter((s: any) => s.claimed_by).map((s: any) => s.claimed_by),
    ].filter(Boolean)));
    if (ids.length) {
      const pf = await api.profiles.batch(ids as string[]).catch(() => []);
      setProfileMap(Object.fromEntries(pf.map((x: any) => [x.id, x])));
    }
  }

  useEffect(() => { load(); }, [date, scheduleType]);
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [date, scheduleType]);

  const slotMap = useMemo(() => {
    const m: Record<string, Slot> = {};
    slots.filter(s => s.status !== "cancelled").forEach(s => { m[new Date(s.slot_start).toISOString()] = s; });
    return m;
  }, [slots]);

  function shiftDay(n: number) { const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">30-minute slots — click to book or claim</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 rounded-md border border-border text-sm">{date.toDateString()}</div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(getLondonToday())}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Layers className="h-4 w-4 mr-1.5" /> Bulk add</Button>
        </div>
      </div>
      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {slotTimes.map((iso) => {
            const slot = slotMap[iso];
            const isCurrent = iso === currentISO;
            const isMine = slot?.booked_by === user?.id;
            const isMyClain = slot?.claimed_by === user?.id;
            const canManage = isMine || isAuxPlus;
            const canLog = isMyClain || isMine || isAuxPlus;

            let borderCls = "border-border bg-background/40";
            if (isCurrent && !slot) borderCls = "border-green-500 bg-green-500/10 ring-1 ring-green-500/30";
            else if (isCurrent && slot) borderCls = `${DEPT_BORDER[slot.department]} bg-card ring-1 ring-green-500/50`;
            else if (slot) borderCls = `${DEPT_BORDER[slot.department]} bg-card`;

            return (
              <Dialog key={iso} open={openSlot === iso} onOpenChange={(o) => setOpenSlot(o ? iso : null)}>
                <DialogTrigger asChild>
                  <button className={`relative text-left rounded-xl border p-3 transition hover:border-primary/50 ${borderCls}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono ${isCurrent ? "text-green-400 font-semibold" : "text-muted-foreground"}`}>{fmtSlot(iso)}</span>
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
                      {slot && !isCurrent && <span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} />}
                    </div>
                    {slot ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">{slot.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{profileMap[slot.booked_by]?.display_name ?? "—"} · {DEPT_LABEL[slot.department]}</p>
                        {slot.claimed_by && <p className="text-[11px] text-primary truncate mt-0.5">✓ {profileMap[slot.claimed_by]?.display_name ?? "Claimed"}</p>}
                        {slot.status === "completed" && <Badge variant="outline" className="mt-1 text-[10px]">completed</Badge>}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Plus className="h-3 w-3" /> book</div>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{slot ? slot.title : `Book slot at ${fmtSlot(iso)}`}</DialogTitle></DialogHeader>
                  {slot ? (
                    <SlotDetails slot={slot} bookerName={profileMap[slot.booked_by]?.display_name ?? ""}
                      claimerName={slot.claimed_by ? (profileMap[slot.claimed_by]?.display_name ?? "Someone") : null}
                      canManage={canManage} canLog={canLog} currentUserId={user?.id ?? ""}
                      onChanged={() => { setOpenSlot(null); load(); }} onLog={() => { setLogSlot(slot); setOpenSlot(null); }} />
                  ) : (
                    <BookSlot slotISO={iso} scheduleType={scheduleType} allowedDepartments={allowedDepartments} onDone={() => { setOpenSlot(null); load(); }} />
                  )}
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </Card>
      {logSlot && (
        <LogInteractionDialog open={!!logSlot} onOpenChange={(o) => !o && setLogSlot(null)} slot={logSlot} onLogged={() => { setLogSlot(null); load(); }} />
      )}
      <BulkAddDialog open={bulkOpen} onOpenChange={setBulkOpen} scheduleType={scheduleType} allowedDepartments={allowedDepartments} slotTimes={slotTimes} bookedIsos={new Set(Object.keys(slotMap))} onDone={() => { setBulkOpen(false); load(); }} />
    </div>
  );
}

function BookSlot({ slotISO, scheduleType, allowedDepartments, onDone }: {
  slotISO: string; scheduleType: ScheduleType; allowedDepartments: Department[]; onDone: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dept, setDept] = useState<Department>(allowedDepartments[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await api.schedule.create({ schedule_type: scheduleType, slot_start: slotISO, department: dept, title: title.trim(), notes: notes.trim() || null });
      toast.success("Slot booked"); onDone();
    } catch (e: any) {
      toast.error(e.message?.includes("already") ? "Slot already booked" : e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday night quiz" /></div>
      {allowedDepartments.length > 1 && (
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={dept} onValueChange={(v) => setDept(v as Department)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{allowedDepartments.map(d => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button className="w-full" onClick={submit} disabled={busy}>Book slot</Button>
    </div>
  );
}

function SlotDetails({ slot, bookerName, claimerName, canManage, canLog, currentUserId, onChanged, onLog }: {
  slot: Slot; bookerName: string; claimerName: string | null; canManage: boolean; canLog: boolean; currentUserId: string; onChanged: () => void; onLog: () => void;
}) {
  const { isAuxPlus } = useAuth();
  const isClaimed = !!slot.claimed_by;
  const isMyClain = slot.claimed_by === currentUserId;
  const canUnclaim = isMyClain || isAuxPlus;

  async function cancel() {
    await api.schedule.update(slot.id, { status: "cancelled" }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Slot cancelled"); onChanged();
  }
  async function claim() {
    await api.schedule.update(slot.id, { claimed_by: currentUserId }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Slot claimed — you're on!"); onChanged();
  }
  async function unclaim() {
    await api.schedule.update(slot.id, { claimed_by: null }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Slot unclaimed"); onChanged();
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} /><span>{DEPT_LABEL[slot.department]}</span><span className="text-muted-foreground">· {fmtSlot(slot.slot_start)}</span></div>
      <p className="text-muted-foreground">Booked by <span className="text-foreground">{bookerName}</span></p>
      {slot.notes && <p className="text-muted-foreground">{slot.notes}</p>}
      {slot.status !== "completed" && (
        <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
          {isClaimed ? (
            <div className="flex items-center justify-between">
              <p className="text-xs"><span className="text-primary font-medium">✓ Claimed</span><span className="text-muted-foreground ml-1">by {claimerName}</span></p>
              {canUnclaim && <Button variant="ghost" size="sm" onClick={unclaim} className="h-7 text-xs">Unclaim</Button>}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">No one has claimed this slot yet.</p>
              <Button variant="outline" size="sm" onClick={claim} className="h-7 text-xs">Claim it</Button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Status: {slot.status}</p>
      {slot.status !== "completed" && (
        <div className="flex gap-2 pt-2">
          {canLog && <Button onClick={onLog} className="flex-1"><CheckCircle2 className="h-4 w-4 mr-2" /> Mark completed & log</Button>}
          {canManage && <Button variant="outline" onClick={cancel}><X className="h-4 w-4" /></Button>}
        </div>
      )}
      {!canLog && slot.status !== "completed" && <p className="text-xs text-muted-foreground">Claim this slot to be able to log it.</p>}
    </div>
  );
}

function BulkAddDialog({ open, onOpenChange, scheduleType, allowedDepartments, slotTimes, bookedIsos, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; scheduleType: ScheduleType; allowedDepartments: Department[];
  slotTimes: string[]; bookedIsos: Set<string>; onDone: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState<Department>(allowedDepartments[0]);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function reset() { setTitle(""); setNotes(""); setSelected(new Set()); }
  function toggle(iso: string) { setSelected(prev => { const s = new Set(prev); if (s.has(iso)) s.delete(iso); else s.add(iso); return s; }); }

  async function submit() {
    if (!user || !title.trim()) { toast.error("Title required"); return; }
    if (selected.size === 0) { toast.error("Select at least one time slot"); return; }
    setBusy(true);
    try {
      const slots = Array.from(selected).map(iso => ({ schedule_type: scheduleType, slot_start: iso, department: dept, title: title.trim(), notes: notes.trim() || null }));
      await api.schedule.bulk(slots);
      toast.success(`${selected.size} slot${selected.size > 1 ? "s" : ""} booked`);
      reset(); onDone();
    } catch (e: any) {
      toast.error(e.message?.includes("already") ? "One or more slots already booked — select only free slots." : e.message);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk add slots</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title <span className="text-muted-foreground text-xs">(applied to all selected slots)</span></Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday block party" /></div>
          {allowedDepartments.length > 1 && (
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={dept} onValueChange={(v) => setDept(v as Department)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allowedDepartments.map(d => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select time slots</Label>
              <div className="flex gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={() => setSelected(new Set(slotTimes.filter(iso => !bookedIsos.has(iso))))}>All free</button>
                <button className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto">
              {slotTimes.map((iso) => {
                const booked = bookedIsos.has(iso); const checked = selected.has(iso);
                return (
                  <label key={iso} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition ${booked ? "opacity-40 cursor-not-allowed border-border" : checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <Checkbox checked={checked} disabled={booked} onCheckedChange={() => !booked && toggle(iso)} className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs">{fmtSlot(iso)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selected.size} selected</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={busy || selected.size === 0}>{busy ? "Booking…" : `Book ${selected.size} slot${selected.size !== 1 ? "s" : ""}`}</Button>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
