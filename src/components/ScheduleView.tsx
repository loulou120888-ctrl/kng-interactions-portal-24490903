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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, X, Layers, RefreshCw, Trash2, Pencil, Shuffle } from "lucide-react";
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
  claimed_by: string | null;
  status: "booked" | "in_progress" | "completed" | "cancelled";
  interaction_id: string | null;
}

interface RecurringTemplate {
  id: string;
  schedule_type: ScheduleType;
  day_of_week: number;
  slot_index: number;
  department: Department;
  title: string;
  notes: string | null;
  created_by: string | null;
  is_active: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Randomize Day pool ─────────────────────────────────────────────────────
interface PoolItem { name: string; dept: Department; enabled: boolean; }

const EP_DEFAULTS: Omit<PoolItem, "enabled">[] = [
  { name: "Street Race",      dept: "events"  },
  { name: "Truck Domination", dept: "events"  },
  { name: "Fight Night",      dept: "events"  },
  { name: "Car Meet",         dept: "events"  },
  { name: "Purge",            dept: "events"  },
  { name: "Hide & Seek",      dept: "events"  },
  { name: "Cayo Drag Race",   dept: "events"  },
  { name: "Quiz Night",       dept: "events"  },
  { name: "Pool Party",       dept: "parties" },
  { name: "Gang Wars",        dept: "parties" },
  { name: "Treasure Hunt",    dept: "parties" },
  { name: "Boat Race",        dept: "parties" },
];

const ENT_DEFAULTS: Omit<PoolItem, "enabled">[] = [
  { name: "Battle Royale",    dept: "entertainment" },
  { name: "DJ Set",           dept: "entertainment" },
  { name: "Live Music",       dept: "entertainment" },
  { name: "Open Mic",         dept: "entertainment" },
];

function getDefaultPool(scheduleType: ScheduleType): PoolItem[] {
  const base = scheduleType === "entertainment" ? ENT_DEFAULTS : EP_DEFAULTS;
  return base.map(x => ({ ...x, enabled: true }));
}
function loadPool(scheduleType: ScheduleType): PoolItem[] {
  try {
    const saved = localStorage.getItem(`kng_event_pool_${scheduleType}`);
    return saved ? JSON.parse(saved) : getDefaultPool(scheduleType);
  } catch { return getDefaultPool(scheduleType); }
}
function savePool(scheduleType: ScheduleType, pool: PoolItem[]) {
  localStorage.setItem(`kng_event_pool_${scheduleType}`, JSON.stringify(pool));
}

// When entertainment is booked, cancel any conflicting events_parties slots
async function cancelConflictingEPSlots(isos: string[]) {
  if (!isos.length) return;
  await supabase.from("schedule_slots")
    .update({ status: "cancelled" })
    .eq("schedule_type", "events_parties")
    .in("slot_start", isos)
    .neq("status", "cancelled");
}

// Reference slot labels — use a fixed date so labels are timezone-stable
const REF_DATE = (() => { const d = new Date(2024, 0, 1); d.setHours(0, 0, 0, 0); return d; })();
const REF_SLOTS = buildDaySlots(REF_DATE);

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
  const isEntertainment = scheduleType === "entertainment";

  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [crossBlockedIsos, setCrossBlockedIsos] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, { display_name: string }>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [logSlot, setLogSlot] = useState<Slot | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [randomizeOpen, setRandomizeOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const slotTimes = useMemo(() => buildDaySlots(date), [date]);
  const dayStart = slotTimes[0];
  const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 3600 * 1000).toISOString();

  async function loadProfiles(data: Slot[]) {
    const ids = Array.from(new Set([
      ...data.map((s) => s.booked_by),
      ...data.filter((s) => s.claimed_by).map((s) => s.claimed_by as string),
    ].filter(Boolean)));
    if (!ids.length) return;
    const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    if (p) setProfiles(prev => ({ ...prev, ...Object.fromEntries(p.map((x: any) => [x.id, x])) }));
  }

  async function load() {
    const localSlots = buildDaySlots(date);
    const dStart = localSlots[0];
    const dEnd = new Date(+new Date(dStart) + 86400000).toISOString();
    const dow = date.getDay();

    const [mainRes, crossRes, tmplRes, entTmplRes] = await Promise.all([
      supabase.from("schedule_slots").select("*")
        .eq("schedule_type", scheduleType)
        .gte("slot_start", dStart).lt("slot_start", dEnd)
        .order("slot_start"),

      !isEntertainment
        ? supabase.from("schedule_slots").select("slot_start, title")
            .eq("schedule_type", "entertainment")
            .gte("slot_start", dStart).lt("slot_start", dEnd)
            .neq("status", "cancelled")
        : Promise.resolve({ data: [] as any[], error: null }),

      user
        ? supabase.from("recurring_templates").select("*")
            .eq("schedule_type", scheduleType)
            .eq("day_of_week", dow)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as any[], error: null }),

      // Also fetch entertainment recurring templates so E&P view blocks those times
      !isEntertainment
        ? supabase.from("recurring_templates").select("slot_index, title")
            .eq("schedule_type", "entertainment")
            .eq("day_of_week", dow)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const existing = (mainRes.data ?? []) as Slot[];
    const activeIsos = new Set(
      existing.filter(s => s.status !== "cancelled").map(s => new Date(s.slot_start).toISOString())
    );

    // Entertainment cross-block for E&P view (actual booked slots + recurring templates)
    if (!isEntertainment) {
      const blocked: Record<string, string> = {};
      (crossRes.data ?? []).forEach((s: any) => {
        blocked[new Date(s.slot_start).toISOString()] = s.title;
      });
      // Add entertainment recurring template times that haven't been materialised yet
      const entRecurringIsos: string[] = [];
      (entTmplRes.data ?? []).forEach((t: any) => {
        const iso = localSlots[t.slot_index];
        if (iso && !blocked[iso]) {
          blocked[iso] = t.title;
          entRecurringIsos.push(iso);
        }
      });
      setCrossBlockedIsos(blocked);
      // Cancel any E&P slots that conflict with entertainment recurring templates
      if (entRecurringIsos.length) {
        await cancelConflictingEPSlots(entRecurringIsos);
      }
    }

    // Materialize recurring templates for today's day-of-week
    let didInsert = false;
    if (user && (tmplRes.data ?? []).length > 0) {
      const toInsert = (tmplRes.data as RecurringTemplate[]).filter(t => {
        const iso = localSlots[t.slot_index];
        return iso && !activeIsos.has(iso);
      });
      if (toInsert.length) {
        await Promise.all(
          toInsert.map(t =>
            supabase.from("schedule_slots").insert({
              schedule_type: scheduleType,
              slot_start: localSlots[t.slot_index],
              department: t.department,
              title: t.title,
              notes: t.notes,
              booked_by: user.id,
            })
          )
        );
        if (scheduleType === "entertainment") {
          await cancelConflictingEPSlots(toInsert.map(t => localSlots[t.slot_index]));
        }
        didInsert = true;
      }
    }

    if (didInsert) {
      const { data: fresh } = await supabase.from("schedule_slots").select("*")
        .eq("schedule_type", scheduleType)
        .gte("slot_start", dStart).lt("slot_start", dEnd)
        .order("slot_start");
      const freshSlots = (fresh ?? []) as Slot[];
      setSlots(freshSlots);
      await loadProfiles(freshSlots);
    } else {
      setSlots(existing);
      await loadProfiles(existing);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date, scheduleType]);

  useEffect(() => {
    const ch = supabase.channel(`schedule-view-${scheduleType}-${dayStart}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_slots" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [scheduleType, dayStart]);

  const slotMap = useMemo(() => {
    const m: Record<string, Slot> = {};
    slots.filter(s => s.status !== "cancelled").forEach(s => { m[new Date(s.slot_start).toISOString()] = s; });
    return m;
  }, [slots]);

  // Only AUX+ can book entertainment; anyone can book E&P
  const canBook = !isEntertainment || isAuxPlus;

  function shiftDay(n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); setDate(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            30-minute slots — live updating · click to book or claim
            {isEntertainment && !isAuxPlus && <span className="ml-1 text-muted-foreground/60">(AUX+ to book)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 rounded-md border border-border text-sm">{date.toDateString()}</div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d); }}>Today</Button>
          {canBook && (
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4 mr-1.5" /> Bulk add
            </Button>
          )}
          {isAuxPlus && (
            <Button variant="outline" size="sm" onClick={() => setRecurringOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Recurring
            </Button>
          )}
          {isAuxPlus && (
            <Button variant="outline" size="sm" onClick={() => setRandomizeOpen(true)}>
              <Shuffle className="h-4 w-4 mr-1.5" /> Randomize Day
            </Button>
          )}
        </div>
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {slotTimes.map((iso) => {
            const slot = slotMap[iso];
            const crossBlock = !isEntertainment ? crossBlockedIsos[iso] : undefined;
            const isMine = slot?.booked_by === user?.id;
            const isMyClain = slot?.claimed_by === user?.id;
            // Entertainment: only AUX+ can cancel; E&P: booker or AUX+
            const canManage = isEntertainment ? isAuxPlus : (isMine || isAuxPlus);
            // Entertainment: anyone can log (complete); E&P: claimer, booker, or AUX+
            const canLog = isEntertainment ? true : (isMyClain || isMine || isAuxPlus);
            const slotDate = new Date(iso);
            const isCurrentSlot = now >= slotDate && now < new Date(slotDate.getTime() + 30 * 60 * 1000);

            // Entertainment cross-block: show blocked tile if E&P + no E&P slot here yet
            if (crossBlock && !slot) {
              return (
                <Dialog key={iso} open={openSlot === iso} onOpenChange={(o) => setOpenSlot(o ? iso : null)}>
                  <DialogTrigger asChild>
                    <button className={`text-left rounded-xl border p-3 transition cursor-pointer ${
                      isCurrentSlot
                        ? "border-primary bg-primary/10"
                        : "border-[oklch(0.72_0.16_210_/_0.5)] bg-[oklch(0.72_0.16_210_/_0.07)]"
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-mono ${isCurrentSlot ? "text-primary font-semibold" : "text-muted-foreground"}`}>{fmtSlot(iso)}</span>
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.16_210)]" />
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-medium truncate text-[oklch(0.85_0.14_210)]">{crossBlock}</p>
                        <p className="text-[10px] text-muted-foreground">Entertainment — blocked</p>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Entertainment booked — {fmtSlot(iso)}</DialogTitle></DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.16_210)]" />
                        <span className="text-[oklch(0.85_0.14_210)] font-medium">Entertainment</span>
                      </div>
                      <p className="font-semibold">{crossBlock}</p>
                      <p className="text-muted-foreground text-xs">This time slot is reserved for Entertainment. Events &amp; Parties cannot be booked here.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            }

            return (
              <Dialog key={iso} open={openSlot === iso} onOpenChange={(o) => setOpenSlot(o ? iso : null)}>
                <DialogTrigger asChild>
                  <button
                    className={`relative text-left rounded-xl border p-3 transition hover:border-primary/50 ${
                      isCurrentSlot
                        ? "border-primary bg-primary/10 shadow-[0_0_0_1px_oklch(0.7_0.2_280_/_0.4)]"
                        : slot
                          ? `${DEPT_BORDER[slot.department]} bg-card`
                          : "border-border bg-background/40"
                    }`}
                  >
                    {isCurrentSlot && (
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono ${isCurrentSlot ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {fmtSlot(iso)}
                      </span>
                      {slot && !isCurrentSlot && <span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} />}
                    </div>
                    {slot ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">{slot.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {profiles[slot.booked_by]?.display_name ?? "—"} · {DEPT_LABEL[slot.department]}
                        </p>
                        {slot.claimed_by && (
                          <p className="text-[11px] text-primary truncate mt-0.5">
                            ✓ {profiles[slot.claimed_by]?.display_name ?? "Claimed"}
                          </p>
                        )}
                        {slot.status === "completed" && (
                          <Badge variant="outline" className="mt-1 text-[10px]">completed</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        {canBook ? <><Plus className="h-3 w-3" /> book</> : <span>—</span>}
                      </div>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{slot ? slot.title : `Book slot at ${fmtSlot(iso)}`}</DialogTitle>
                  </DialogHeader>
                  {slot ? (
                    <SlotDetails
                      slot={slot}
                      bookerName={profiles[slot.booked_by]?.display_name ?? ""}
                      claimerName={slot.claimed_by ? (profiles[slot.claimed_by]?.display_name ?? "Someone") : null}
                      canManage={canManage}
                      canLog={canLog}
                      currentUserId={user?.id ?? ""}
                      isEntertainment={isEntertainment}
                      onChanged={() => { setOpenSlot(null); load(); }}
                      onLog={() => { setLogSlot(slot); setOpenSlot(null); }}
                    />
                  ) : canBook ? (
                    <BookSlot
                      slotISO={iso}
                      scheduleType={scheduleType}
                      allowedDepartments={allowedDepartments}
                      onDone={() => { setOpenSlot(null); load(); }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Only AUX+ staff can add Entertainment slots.</p>
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

      {canBook && (
        <BulkAddDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          scheduleType={scheduleType}
          allowedDepartments={allowedDepartments}
          slotTimes={slotTimes}
          bookedIsos={new Set(Object.keys(slotMap))}
          onDone={() => { setBulkOpen(false); load(); }}
        />
      )}

      <RecurringDialog
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        scheduleType={scheduleType}
        allowedDepartments={allowedDepartments}
      />

      {isAuxPlus && user && (
        <RandomizeDialog
          open={randomizeOpen}
          onOpenChange={setRandomizeOpen}
          slotTimes={slotTimes}
          slotMap={slotMap}
          crossBlockedIsos={crossBlockedIsos}
          scheduleType={scheduleType}
          allowedDepartments={allowedDepartments}
          userId={user.id}
          onDone={() => { setRandomizeOpen(false); load(); }}
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
    if (!error && scheduleType === "entertainment") {
      await cancelConflictingEPSlots([slotISO]);
    }
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

function SlotDetails({
  slot, bookerName, claimerName, canManage, canLog, currentUserId, isEntertainment, onChanged, onLog,
}: {
  slot: Slot;
  bookerName: string;
  claimerName: string | null;
  canManage: boolean;
  canLog: boolean;
  currentUserId: string;
  isEntertainment: boolean;
  onChanged: () => void;
  onLog: () => void;
}) {
  const isClaimed = !!slot.claimed_by;
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(slot.title);
  const [renameBusy, setRenameBusy] = useState(false);

  async function saveRename() {
    if (!newTitle.trim()) { toast.error("Title can't be empty"); return; }
    setRenameBusy(true);
    const { error } = await supabase.from("schedule_slots").update({ title: newTitle.trim() }).eq("id", slot.id);
    setRenameBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Event renamed"); setRenaming(false); onChanged(); }
  }

  async function cancel() {
    const { error } = await supabase.from("schedule_slots").update({ status: "cancelled" }).eq("id", slot.id);
    if (error) toast.error(error.message); else { toast.success("Slot cancelled"); onChanged(); }
  }

  async function claim() {
    const { error } = await supabase.from("schedule_slots").update({ claimed_by: currentUserId }).eq("id", slot.id);
    if (error) toast.error(error.message); else { toast.success("Slot claimed — you're on!"); onChanged(); }
  }

  async function unclaim() {
    const { error } = await supabase.from("schedule_slots").update({ claimed_by: null }).eq("id", slot.id);
    if (error) toast.error(error.message); else { toast.success("Slot unclaimed"); onChanged(); }
  }

  return (
    <div className="space-y-3 text-sm">
      {slot.status !== "completed" && (
        <div className="space-y-1.5">
          {renaming ? (
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(false); }}
                autoFocus
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-3" onClick={saveRename} disabled={renameBusy || !newTitle.trim()}>
                {renameBusy ? "…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setRenaming(false); setNewTitle(slot.title); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setNewTitle(slot.title); setRenaming(true); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <Pencil className="h-3 w-3" /> Rename event
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${DEPT_BG[slot.department]}`} />
        <span>{DEPT_LABEL[slot.department]}</span>
        <span className="text-muted-foreground">· {fmtSlot(slot.slot_start)}</span>
      </div>
      <p className="text-muted-foreground">Booked by <span className="text-foreground">{bookerName}</span></p>
      {slot.notes && <p className="text-muted-foreground">{slot.notes}</p>}

      {slot.status !== "completed" && (
        <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
          {isClaimed ? (
            <div className="flex items-center justify-between">
              <p className="text-xs">
                <span className="text-primary font-medium">✓ Claimed</span>
                <span className="text-muted-foreground ml-1">by {claimerName}</span>
              </p>
              {/* Anyone can unclaim any slot */}
              <Button variant="ghost" size="sm" onClick={unclaim} className="h-7 text-xs">Unclaim</Button>
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
          {canLog && (
            <Button onClick={onLog} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark completed &amp; log
            </Button>
          )}
          {canManage && (
            <Button variant="outline" onClick={cancel}><X className="h-4 w-4" /></Button>
          )}
        </div>
      )}
      {!canLog && slot.status !== "completed" && !isEntertainment && (
        <p className="text-xs text-muted-foreground">Claim this slot to be able to log it.</p>
      )}
    </div>
  );
}

function BulkAddDialog({
  open, onOpenChange, scheduleType, allowedDepartments, slotTimes, bookedIsos, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scheduleType: ScheduleType;
  allowedDepartments: Department[];
  slotTimes: string[];
  bookedIsos: Set<string>;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState<Department>(allowedDepartments[0]);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function reset() { setTitle(""); setNotes(""); setSelected(new Set()); }

  function toggle(iso: string) {
    setSelected(prev => { const s = new Set(prev); if (s.has(iso)) s.delete(iso); else s.add(iso); return s; });
  }

  async function submit() {
    if (!user) return;
    if (!title.trim()) { toast.error("Title required"); return; }
    if (selected.size === 0) { toast.error("Select at least one time slot"); return; }
    setBusy(true);
    const rows = Array.from(selected).map(iso => ({
      schedule_type: scheduleType, slot_start: iso, department: dept,
      title: title.trim(), notes: notes.trim() || null, booked_by: user.id,
    }));
    const { error } = await supabase.from("schedule_slots").insert(rows);
    if (!error && scheduleType === "entertainment") {
      await cancelConflictingEPSlots(Array.from(selected));
    }
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "One or more slots already booked — try selecting only free slots." : error.message);
    } else {
      toast.success(`${selected.size} slot${selected.size > 1 ? "s" : ""} booked`);
      reset(); onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk add slots</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title <span className="text-muted-foreground text-xs">(applied to all selected slots)</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday block party" />
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
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
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
                const booked = bookedIsos.has(iso);
                const checked = selected.has(iso);
                return (
                  <label key={iso} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition ${
                    booked ? "opacity-40 cursor-not-allowed border-border" :
                    checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}>
                    <Checkbox checked={checked} disabled={booked} onCheckedChange={() => !booked && toggle(iso)} className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs">{fmtSlot(iso)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selected.size} selected</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={busy || selected.size === 0}>
              {busy ? "Booking…" : `Book ${selected.size} slot${selected.size !== 1 ? "s" : ""}`}
            </Button>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecurringDialog({
  open, onOpenChange, scheduleType, allowedDepartments,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scheduleType: ScheduleType;
  allowedDepartments: Department[];
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [dow, setDow] = useState(1);
  const [slotIdx, setSlotIdx] = useState(40); // default ~8pm
  const [dept, setDept] = useState<Department>(allowedDepartments[0]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTemplates() {
    const { data } = await supabase.from("recurring_templates").select("*")
      .eq("schedule_type", scheduleType)
      .order("day_of_week").order("slot_index");
    setTemplates((data ?? []) as RecurringTemplate[]);
  }

  useEffect(() => { if (open) loadTemplates(); /* eslint-disable-next-line */ }, [open, scheduleType]);

  async function add() {
    if (!user || !title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    const { error } = await supabase.from("recurring_templates").insert({
      schedule_type: scheduleType,
      day_of_week: dow,
      slot_index: slotIdx,
      department: dept,
      title: title.trim(),
      notes: notes.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Recurring slot added"); setTitle(""); setNotes(""); loadTemplates(); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("recurring_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Recurring slot removed"); loadTemplates(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Recurring slots
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Recurring slots appear automatically every week on the chosen day and time. They are created as normal slots when the schedule page is first viewed for that day.
          </p>

          <div className="rounded-xl border border-border p-4 space-y-3 bg-background/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add new recurring slot</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Day of week</Label>
                <Select value={String(dow)} onValueChange={(v) => setDow(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={String(slotIdx)} onValueChange={(v) => setSlotIdx(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {REF_SLOTS.map((iso, i) => (
                      <SelectItem key={i} value={String(i)}>{fmtSlot(iso)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly quiz night" />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={add} disabled={busy || !title.trim()}>
              <Plus className="h-4 w-4 mr-1.5" /> Add recurring slot
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {templates.length} recurring slot{templates.length !== 1 ? "s" : ""}
            </p>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No recurring slots yet.</p>
            )}
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-background/40">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${DEPT_BG[t.department]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DAYS[t.day_of_week]} · {fmtSlot(REF_SLOTS[t.slot_index])} · {DEPT_LABEL[t.department]}
                    </p>
                    {t.notes && <p className="text-[11px] text-muted-foreground/70 truncate">{t.notes}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RandomizeDialog({
  open, onOpenChange, slotTimes, slotMap, crossBlockedIsos,
  scheduleType, allowedDepartments, userId, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slotTimes: string[];
  slotMap: Record<string, Slot>;
  crossBlockedIsos: Record<string, string>;
  scheduleType: ScheduleType;
  allowedDepartments: Department[];
  userId: string;
  onDone: () => void;
}) {
  const [pool, setPool] = useState<PoolItem[]>(() => loadPool(scheduleType));
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState<Department>(allowedDepartments[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPool(loadPool(scheduleType));
  }, [open, scheduleType]);

  useEffect(() => {
    savePool(scheduleType, pool);
  }, [pool, scheduleType]);

  const emptySlots = slotTimes.filter(iso => !slotMap[iso] && !crossBlockedIsos[iso]);
  const enabledItems = pool.filter(p => p.enabled);

  function toggleItem(i: number) {
    setPool(prev => prev.map((p, idx) => idx === i ? { ...p, enabled: !p.enabled } : p));
  }
  function changeDept(i: number, dept: Department) {
    setPool(prev => prev.map((p, idx) => idx === i ? { ...p, dept } : p));
  }
  function addEvent() {
    if (!newName.trim()) return;
    setPool(prev => [...prev, { name: newName.trim(), dept: newDept, enabled: true }]);
    setNewName("");
  }
  function removeItem(i: number) {
    setPool(prev => prev.filter((_, idx) => idx !== i));
  }
  function resetDefaults() {
    setPool(getDefaultPool(scheduleType));
  }

  async function randomize() {
    if (!userId || emptySlots.length === 0 || enabledItems.length === 0) return;
    setBusy(true);
    const inserts = emptySlots.map(iso => {
      const pick = enabledItems[Math.floor(Math.random() * enabledItems.length)];
      return { schedule_type: scheduleType, slot_start: iso, department: pick.dept, title: pick.name, booked_by: userId };
    });
    const { error } = await supabase.from("schedule_slots").insert(inserts);
    if (!error && scheduleType === "entertainment") {
      await cancelConflictingEPSlots(emptySlots);
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Filled ${emptySlots.length} slot${emptySlots.length !== 1 ? "s" : ""} with random events`); onDone(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-primary" /> Randomize Day
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{emptySlots.length} empty slot{emptySlots.length !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">{enabledItems.length} event{enabledItems.length !== 1 ? "s" : ""} in pool</p>
            </div>
            <Button
              onClick={randomize}
              disabled={busy || emptySlots.length === 0 || enabledItems.length === 0}
              size="sm"
            >
              <Shuffle className="h-3.5 w-3.5 mr-1.5" />
              {busy ? "Filling…" : `Fill ${emptySlots.length} slot${emptySlots.length !== 1 ? "s" : ""}`}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event pool</Label>
              <button onClick={resetDefaults} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition">
                <RefreshCw className="h-3 w-3" /> Reset defaults
              </button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
              {pool.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">Pool is empty — add some events below.</p>
              )}
              {pool.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                    item.enabled ? "border-border bg-background/40" : "border-border/40 bg-background/20 opacity-50"
                  }`}
                >
                  <Checkbox checked={item.enabled} onCheckedChange={() => toggleItem(i)} />
                  <span className="flex-1 text-sm truncate">{item.name}</span>
                  {allowedDepartments.length > 1 ? (
                    <Select value={item.dept} onValueChange={(v) => changeDept(i, v as Department)}>
                      <SelectTrigger className="h-6 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedDepartments.map(d => (
                          <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{DEPT_LABEL[item.dept]}</Badge>
                  )}
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Add to pool</Label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addEvent()}
                placeholder="Event name…"
                className="h-8 text-sm flex-1"
              />
              {allowedDepartments.length > 1 && (
                <Select value={newDept} onValueChange={v => setNewDept(v as Department)}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedDepartments.map(d => (
                      <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" className="h-8 px-3" onClick={addEvent} disabled={!newName.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
