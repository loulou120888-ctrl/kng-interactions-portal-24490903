import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, X } from "lucide-react";
import {
  buildDaySlots,
  fmtSlot,
  DEPT_LABEL,
  DEPT_BG,
  DEPT_BORDER,
  type Department,
  type ScheduleType,
} from "@/lib/portal";
import { LogInteractionDialog } from "@/components/LogInteractionDialog";

interface Slot {
  id: string;
  schedule_type: ScheduleType;
  slot_start: string;
  department: Department;
  title: string;
  notes: string | null;
  booked_by: string;
  status: "booked" | "in_progress" | "completed" | "cancelled";
  interaction_id: string | null;
}

export function ScheduleView({
  scheduleType,
  title,
  allowedDepartments,
}: {
  scheduleType: ScheduleType;
  title: string;
  allowedDepartments: Department[];
}) {
  const { user, isAuxPlus } = useAuth();
  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string }>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [logSlot, setLogSlot] = useState<Slot | null>(null);

  const slotTimes = useMemo(() => buildDaySlots(date), [date]);
  const dayStart = slotTimes[0];
  const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 3600 * 1000).toISOString();

  async function load() {
    const { data } = await supabase.from("schedule_slots")
      .select("*")
      .eq("schedule_type", scheduleType)
      .gte("slot_start", dayStart)
      .lt("slot_start", dayEnd)
      .order("slot_start");
    setSlots((data ?? []) as Slot[]);
    const ids = Array.from(new Set((data ?? []).map((s: any) => s.booked_by)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x])));
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date, scheduleType]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`slots-${scheduleType}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_slots" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [scheduleType, dayStart]);

  const slotMap = useMemo(() => {
    const m: Record<string, Slot> = {};
    slots.filter(s => s.status !== "cancelled").forEach((s) => { m[new Date(s.slot_start).toISOString()] = s; });
    return m;
  }, [slots]);

  function shiftDay(n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); setDate(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">30-minute slots — live updating</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 rounded-md border border-border text-sm">{date.toDateString()}</div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setDate(d); }}>Today</Button>
        </div>
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {slotTimes.map((iso) => {
            const slot = slotMap[iso];
            const isMine = slot?.booked_by === user?.id;
            const canManage = isMine || isAuxPlus;
            return (
              <Dialog key={iso} open={openSlot === iso} onOpenChange={(o) => setOpenSlot(o ? iso : null)}>
                <DialogTrigger asChild>
                  <button
                    className={`relative text-left rounded-xl border p-3 transition hover:border-primary/50 ${
                      slot ? `${DEPT_BORDER[slot.department]} bg-card` : "border-border bg-background/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{fmtSlot(iso)}</span>
                      {slot && <span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} />}
                    </div>
                    {slot ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">{slot.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {profiles[slot.booked_by]?.display_name ?? "—"} · {DEPT_LABEL[slot.department]}
                        </p>
                        {slot.status === "completed" && (
                          <Badge variant="outline" className="mt-1 text-[10px]">completed</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Plus className="h-3 w-3" /> book
                      </div>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{slot ? slot.title : `Book slot at ${fmtSlot(iso)}`}</DialogTitle></DialogHeader>
                  {slot ? (
                    <SlotDetails
                      slot={slot}
                      bookerName={profiles[slot.booked_by]?.display_name ?? ""}
                      canManage={canManage}
                      onChanged={() => { setOpenSlot(null); load(); }}
                      onLog={() => { setLogSlot(slot); setOpenSlot(null); }}
                    />
                  ) : (
                    <BookSlot
                      slotISO={iso}
                      scheduleType={scheduleType}
                      allowedDepartments={allowedDepartments}
                      onDone={() => { setOpenSlot(null); load(); }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </Card>

      {logSlot && (
        <LogInteractionDialog
          open={!!logSlot}
          onOpenChange={(o) => !o && setLogSlot(null)}
          slot={logSlot}
          onLogged={() => { setLogSlot(null); load(); }}
        />
      )}
    </div>
  );
}

function BookSlot({ slotISO, scheduleType, allowedDepartments, onDone }: {
  slotISO: string;
  scheduleType: ScheduleType;
  allowedDepartments: Department[];
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dept, setDept] = useState<Department>(allowedDepartments[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return;
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    const { error } = await supabase.from("schedule_slots").insert({
      schedule_type: scheduleType,
      slot_start: slotISO,
      department: dept,
      title: title.trim(),
      notes: notes.trim() || null,
      booked_by: user.id,
    });
    setBusy(false);
    if (error) toast.error(error.message.includes("duplicate") ? "Slot already booked" : error.message);
    else { toast.success("Slot booked"); onDone(); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday night quiz" />
      </div>
      {allowedDepartments.length > 1 && (
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={dept} onValueChange={(v) => setDept(v as Department)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {allowedDepartments.map((d) => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button className="w-full" onClick={submit} disabled={busy}>Book slot</Button>
    </div>
  );
}

function SlotDetails({ slot, bookerName, canManage, onChanged, onLog }: {
  slot: Slot; bookerName: string; canManage: boolean; onChanged: () => void; onLog: () => void;
}) {
  async function cancel() {
    const { error } = await supabase.from("schedule_slots").update({ status: "cancelled" }).eq("id", slot.id);
    if (error) toast.error(error.message); else { toast.success("Slot cancelled"); onChanged(); }
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} />
        <span>{DEPT_LABEL[slot.department]}</span>
        <span className="text-muted-foreground">· {fmtSlot(slot.slot_start)}</span>
      </div>
      <p className="text-muted-foreground">Booked by <span className="text-foreground">{bookerName}</span></p>
      {slot.notes && <p className="text-muted-foreground">{slot.notes}</p>}
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Status: {slot.status}</p>
      {canManage && slot.status !== "completed" && (
        <div className="flex gap-2 pt-2">
          <Button onClick={onLog} className="flex-1"><CheckCircle2 className="h-4 w-4 mr-2" /> Mark completed & log</Button>
          <Button variant="outline" onClick={cancel}><X className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
