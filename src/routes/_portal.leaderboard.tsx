import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle2, XCircle, Calendar, Users, Star } from "lucide-react";

export const Route = createFileRoute("/_portal/leaderboard")({ component: Leaderboard });

const DAILY_MIN = 5;

function medalClass(i: number) {
  if (i === 0) return "bg-[oklch(0.78_0.16_75)] text-background";
  if (i === 1) return "bg-[oklch(0.7_0.02_260)] text-background";
  if (i === 2) return "bg-[oklch(0.55_0.12_45)] text-background";
  return "bg-muted text-muted-foreground";
}

function Leaderboard() {
  const [pts, setPts] = useState<{ user_id: string; amount: number; awarded_at: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<{ status: string; slot_start: string }[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Record<string, number>>({});

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  useEffect(() => {
    (async () => {
      const since35 = new Date(Date.now() - 35 * 86400_000).toISOString();

      const [{ data: ptsData }, { data: pf }, { data: slotsData }, { data: todayPts }] = await Promise.all([
        supabase.from("points_log").select("user_id, amount, awarded_at").gte("awarded_at", since35),
        supabase.from("profiles").select("id, display_name"),
        supabase.from("schedule_slots").select("status, slot_start").gte("slot_start", new Date(Date.now() - 7 * 86400_000).toISOString()).lte("slot_start", new Date().toISOString()),
        supabase.from("points_log").select("user_id, amount").gte("awarded_at", todayStart),
      ]);

      setPts((ptsData ?? []) as any);
      setProfiles(Object.fromEntries((pf ?? []).map((x: any) => [x.id, x.display_name])));
      setSlots((slotsData ?? []) as any);

      const todayMap: Record<string, number> = {};
      (todayPts ?? []).forEach((p: any) => {
        todayMap[p.user_id] = (todayMap[p.user_id] ?? 0) + (p.amount ?? 0);
      });
      setAttendanceToday(todayMap);
    })();

    const ch = supabase.channel("points-lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "points_log" }, async () => {
        const since35 = new Date(Date.now() - 35 * 86400_000).toISOString();
        const [{ data: p }, { data: td }] = await Promise.all([
          supabase.from("points_log").select("user_id, amount, awarded_at").gte("awarded_at", since35),
          supabase.from("points_log").select("user_id, amount").gte("awarded_at", todayStart),
        ]);
        setPts((p ?? []) as any);
        const todayMap: Record<string, number> = {};
        (td ?? []).forEach((x: any) => { todayMap[x.user_id] = (todayMap[x.user_id] ?? 0) + (x.amount ?? 0); });
        setAttendanceToday(todayMap);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [todayStart]);

  function aggregate(sinceMs: number) {
    const cutoff = Date.now() - sinceMs;
    const m: Record<string, number> = {};
    pts.forEach((p) => {
      if (new Date(p.awarded_at).getTime() >= cutoff) m[p.user_id] = (m[p.user_id] ?? 0) + (p.amount ?? 0);
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  const weekly = useMemo(() => aggregate(7 * 86400_000), [pts]);
  const monthly = useMemo(() => aggregate(30 * 86400_000), [pts]);

  const missedSlots = useMemo(() => {
    return slots.filter(s => s.status !== "completed").length;
  }, [slots]);

  const totalSlots = slots.length;
  const completedSlots = slots.filter(s => s.status === "completed").length;
  const completionPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  const dailyMinMembers = useMemo(() => {
    const allIds = new Set([
      ...Object.keys(attendanceToday),
      ...Object.keys(profiles),
    ]);
    return Array.from(allIds)
      .filter(id => profiles[id])
      .map(id => ({ id, name: profiles[id], pts: attendanceToday[id] ?? 0, hit: (attendanceToday[id] ?? 0) >= DAILY_MIN }))
      .sort((a, b) => b.pts - a.pts);
  }, [attendanceToday, profiles]);

  const hitMin = dailyMinMembers.filter(m => m.hit).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6" /> Staff Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Live performance across the team.</p>
      </div>

      {/* Stat cards */}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly top 10 */}
        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />
            <h2 className="text-sm font-semibold tracking-wide">Top members — this week</h2>
          </div>
          <div className="divide-y divide-border">
            {weekly.length === 0 && <p className="py-4 text-sm text-muted-foreground text-center">No points yet this week.</p>}
            {weekly.slice(0, 10).map(([uid, n], i) => (
              <div key={uid} className="flex items-center gap-3 py-2.5">
                <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold ${medalClass(i)}`}>{i + 1}</span>
                <span className="flex-1 text-sm truncate">{profiles[uid] ?? "—"}</span>
                <span className="text-sm font-mono tabular-nums">{n} <span className="text-muted-foreground text-xs">pts</span></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly top 10 */}
        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-[oklch(0.7_0.02_260)]" />
            <h2 className="text-sm font-semibold tracking-wide">Top members — this month</h2>
          </div>
          <div className="divide-y divide-border">
            {monthly.length === 0 && <p className="py-4 text-sm text-muted-foreground text-center">No points yet this month.</p>}
            {monthly.slice(0, 10).map(([uid, n], i) => (
              <div key={uid} className="flex items-center gap-3 py-2.5">
                <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold ${medalClass(i)}`}>{i + 1}</span>
                <span className="flex-1 text-sm truncate">{profiles[uid] ?? "—"}</span>
                <span className="text-sm font-mono tabular-nums">{n} <span className="text-muted-foreground text-xs">pts</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Daily minimum tracker */}
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
    </div>
  );
}
