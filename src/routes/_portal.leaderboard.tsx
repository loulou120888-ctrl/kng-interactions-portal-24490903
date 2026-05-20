import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, CheckCircle2, XCircle, Calendar, Users, Star, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { type Period, PERIODS, getPeriodRange } from "./_portal.stats";

export const Route = createFileRoute("/_portal/leaderboard")({ component: Leaderboard });

const DAILY_MIN = 5;

function medalClass(i: number) {
  if (i === 0) return "bg-[oklch(0.78_0.16_75)] text-background";
  if (i === 1) return "bg-[oklch(0.7_0.02_260)] text-background";
  if (i === 2) return "bg-[oklch(0.55_0.12_45)] text-background";
  return "bg-muted text-muted-foreground";
}

function ResetDialog({ open, onOpenChange, onConfirmed, title, description, warning }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirmed: () => Promise<void>;
  title: string;
  description: string;
  warning: string;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (input !== "RESET") return;
    setBusy(true);
    await onConfirmed();
    setBusy(false);
    setInput("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setInput(""); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />{title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {warning}
          </div>
          <div className="space-y-2">
            <p className="text-sm">Type <strong>RESET</strong> to confirm:</p>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={input !== "RESET" || busy}
              onClick={confirm}
            >
              {busy ? "Resetting…" : "Confirm reset"}
            </Button>
            <Button variant="outline" onClick={() => { setInput(""); onOpenChange(false); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Leaderboard() {
  const { isManager } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [pts, setPts] = useState<{ user_id: string; amount: number; awarded_at: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<{ status: string; slot_start: string }[]>([]);
  const [resetPointsOpen, setResetPointsOpen] = useState(false);
  const [resetInteractionsOpen, setResetInteractionsOpen] = useState(false);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  async function fetchData() {
    // For "all" fetch everything; otherwise fetch enough to cover the period + today
    let ptsQuery = supabase.from("points_log").select("user_id, amount, awarded_at");
    if (period !== "all") {
      const { from } = getPeriodRange(period);
      // Include today regardless of period so the daily tracker always works
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const earliest = new Date(Math.min(from.getTime(), today.getTime()));
      ptsQuery = ptsQuery.gte("awarded_at", earliest.toISOString());
    }

    const [{ data: ptsData }, { data: pf }, { data: slotsData }] = await Promise.all([
      ptsQuery,
      supabase.from("profiles").select("id, display_name"),
      supabase.from("schedule_slots")
        .select("status, slot_start")
        .gte("slot_start", new Date(Date.now() - 7 * 86400_000).toISOString())
        .lte("slot_start", new Date().toISOString()),
    ]);

    setPts((ptsData ?? []) as any);
    setProfiles(Object.fromEntries((pf ?? []).map((x: any) => [x.id, x.display_name])));
    setSlots((slotsData ?? []) as any);
  }

  useEffect(() => {
    fetchData();
    const ch = supabase.channel("points-lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "points_log" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Aggregate for the selected period
  const periodRows = useMemo(() => {
    const { from, to } = getPeriodRange(period);
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const m: Record<string, number> = {};
    pts.forEach((p) => {
      const t = new Date(p.awarded_at).getTime();
      if (t >= fromMs && t <= toMs) {
        m[p.user_id] = (m[p.user_id] ?? 0) + (p.amount ?? 0);
      }
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [pts, period]);

  // Today's attendance (always relative to today, regardless of selected period)
  const attendanceToday = useMemo(() => {
    const todayMs = new Date(todayStart).getTime();
    const m: Record<string, number> = {};
    pts.forEach((p) => {
      if (new Date(p.awarded_at).getTime() >= todayMs) {
        m[p.user_id] = (m[p.user_id] ?? 0) + (p.amount ?? 0);
      }
    });
    return m;
  }, [pts, todayStart]);

  const missedSlots = useMemo(() => slots.filter(s => s.status !== "completed").length, [slots]);
  const totalSlots = slots.length;
  const completedSlots = slots.filter(s => s.status === "completed").length;
  const completionPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  const dailyMinMembers = useMemo(() => {
    const allIds = new Set([...Object.keys(attendanceToday), ...Object.keys(profiles)]);
    return Array.from(allIds)
      .filter(id => profiles[id])
      .map(id => ({ id, name: profiles[id], pts: attendanceToday[id] ?? 0, hit: (attendanceToday[id] ?? 0) >= DAILY_MIN }))
      .sort((a, b) => b.pts - a.pts);
  }, [attendanceToday, profiles]);

  const hitMin = dailyMinMembers.filter(m => m.hit).length;

  const currentPeriodLabel = PERIODS.find(p => p.id === period)?.label ?? "Selected period";

  async function resetPoints() {
    const { error } = await supabase.from("points_log").delete().gte("awarded_at", "2000-01-01");
    if (error) { toast.error(error.message); return; }
    toast.success("All points data cleared");
    fetchData();
  }

  async function resetInteractions() {
    const { error } = await supabase.from("interactions").delete().gte("created_at", "2000-01-01");
    if (error) { toast.error(error.message); return; }
    toast.success("All interaction records cleared");
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6" /> Staff Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">Live performance across the team.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={period === p.id ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Events this week</p>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold">{completedSlots}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionPct}% completion rate</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </Card>

        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Missed slots (7d)</p>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-3xl font-semibold ${missedSlots > 0 ? "text-destructive" : "text-green-400"}`}>
            {missedSlots}
          </p>
          <p className="text-xs text-muted-foreground mt-1">slots not completed</p>
        </Card>

        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Hit daily min today</p>
            <Star className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold">{hitMin}</p>
          <p className="text-xs text-muted-foreground mt-1">of {dailyMinMembers.length} staff · min {DAILY_MIN} pts</p>
        </Card>
      </div>

      <Card className="rounded-2xl bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />
          <h2 className="text-sm font-semibold tracking-wide">Top members</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">{currentPeriodLabel}</Badge>
        </div>
        <div className="divide-y divide-border">
          {periodRows.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground text-center">No points recorded for this period.</p>
          )}
          {periodRows.slice(0, 15).map(([uid, n], i) => (
            <div key={uid} className="flex items-center gap-3 py-2.5">
              <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold ${medalClass(i)}`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm truncate">{profiles[uid] ?? "—"}</span>
              <span className="text-sm font-mono tabular-nums">
                {n} <span className="text-muted-foreground text-xs">pts</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-wide">Daily minimum tracker — today</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">Min {DAILY_MIN} pts</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dailyMinMembers.length === 0 && (
            <p className="col-span-full py-4 text-sm text-muted-foreground text-center">No activity logged yet today.</p>
          )}
          {dailyMinMembers.map((m) => (
            <div key={m.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              m.hit ? "border-green-500/30 bg-green-500/5" : "border-border bg-background/30"
            }`}>
              {m.hit
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                : <XCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />}
              <span className="flex-1 text-sm truncate">{m.name}</span>
              <span className={`text-xs font-mono tabular-nums ${m.hit ? "text-green-400" : "text-muted-foreground"}`}>
                {m.pts}/{DAILY_MIN}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {isManager && (
        <Card className="rounded-2xl bg-card/60 p-5 border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold tracking-wide">Data Management</h2>
            <Badge variant="destructive" className="ml-auto text-[10px]">Manager only</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Permanently delete records. These actions cannot be undone.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background/30 p-4 space-y-2">
              <p className="text-sm font-medium">Reset leaderboard</p>
              <p className="text-xs text-muted-foreground">Deletes all points records. Rankings will be cleared for everyone.</p>
              <Button variant="destructive" size="sm" className="w-full mt-1" onClick={() => setResetPointsOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset points
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4 space-y-2">
              <p className="text-sm font-medium">Reset interactions log</p>
              <p className="text-xs text-muted-foreground">Deletes all logged interactions. Dashboard stats and recent activity will be cleared.</p>
              <Button variant="destructive" size="sm" className="w-full mt-1" onClick={() => setResetInteractionsOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset interactions
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ResetDialog
        open={resetPointsOpen}
        onOpenChange={setResetPointsOpen}
        onConfirmed={resetPoints}
        title="Reset all points"
        description="This will permanently delete every entry in the points log. All leaderboard rankings will be wiped."
        warning="This cannot be undone. All staff points will be lost."
      />
      <ResetDialog
        open={resetInteractionsOpen}
        onOpenChange={setResetInteractionsOpen}
        onConfirmed={resetInteractions}
        title="Reset all interactions"
        description="This will permanently delete every logged interaction. Dashboard stats, recent activity, and poster packs stored as interactions will all be removed."
        warning="This cannot be undone. All interaction history will be lost permanently."
      />
    </div>
  );
}
