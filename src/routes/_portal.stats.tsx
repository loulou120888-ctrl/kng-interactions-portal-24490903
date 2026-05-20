import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart2, Users, Trophy, ClipboardList, ChevronUp, ChevronDown, Minus, UserCheck } from "lucide-react";
import {
  DEPT_LABEL, ROLE_LABEL, ROLE_RANK, DEPARTMENTS,
  type Department, type Role,
} from "@/lib/portal";

export const Route = createFileRoute("/_portal/stats")({ component: TeamStats });

export type Period = "today" | "yesterday" | "week" | "last_week" | "month" | "last_month" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "all", label: "All time" },
];

export function getPeriodRange(p: Period): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  switch (p) {
    case "today": return { from: today, to: now };
    case "yesterday": {
      const s = new Date(today); s.setDate(s.getDate() - 1);
      return { from: s, to: today };
    }
    case "week": {
      const s = new Date(today);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7) - 7);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      return { from: s, to: e };
    }
    case "month": {
      const s = new Date(today); s.setDate(1);
      return { from: s, to: now };
    }
    case "last_month": {
      const s = new Date(today); s.setDate(1); s.setMonth(s.getMonth() - 1);
      const e = new Date(today); e.setDate(1);
      return { from: s, to: e };
    }
    case "all": return { from: new Date(0), to: now };
  }
}

function medalClass(i: number) {
  if (i === 0) return "bg-[oklch(0.78_0.16_75)] text-background";
  if (i === 1) return "bg-[oklch(0.7_0.02_260)] text-background";
  if (i === 2) return "bg-[oklch(0.55_0.12_45)] text-background";
  return "bg-muted text-muted-foreground";
}

type SortKey = "points" | "authored" | "attended" | "name";

interface MemberStat {
  id: string;
  name: string;
  department: Department | null;
  topRole: Role;
  points: number;
  authored: number;
  attended: number;
}

function TeamStats() {
  const { isAuxPlus } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<{ id: string; display_name: string; department: Department | null }[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, Role>>({});
  const [pointsData, setPointsData] = useState<{ user_id: string; amount: number }[]>([]);
  const [authoredMap, setAuthoredMap] = useState<Record<string, number>>({});
  const [attendedMap, setAttendedMap] = useState<Record<string, number>>({});

  async function fetchData() {
    setLoading(true);
    const { from, to } = getPeriodRange(period);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const [{ data: pf }, { data: roles }, { data: pts }, { data: interactions }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, department"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("points_log").select("user_id, amount").gte("awarded_at", fromISO).lte("awarded_at", toISO),
      supabase.from("interactions").select("id, author_id").gte("created_at", fromISO).lte("created_at", toISO),
    ]);

    setProfiles((pf ?? []) as any);

    const rm: Record<string, Role> = {};
    (roles ?? []).forEach((r: any) => {
      const cur = rm[r.user_id];
      if (!cur || ROLE_RANK[r.role as Role] > ROLE_RANK[cur]) rm[r.user_id] = r.role as Role;
    });
    setRoleMap(rm);
    setPointsData((pts ?? []) as any);

    const am: Record<string, number> = {};
    const interactionIds: string[] = [];
    (interactions ?? []).forEach((i: any) => {
      am[i.author_id] = (am[i.author_id] ?? 0) + 1;
      interactionIds.push(i.id);
    });
    setAuthoredMap(am);

    if (interactionIds.length > 0) {
      const { data: attendees } = await supabase
        .from("interaction_attendees")
        .select("user_id")
        .in("interaction_id", interactionIds);
      const atm: Record<string, number> = {};
      (attendees ?? []).forEach((a: any) => {
        atm[a.user_id] = (atm[a.user_id] ?? 0) + 1;
      });
      setAttendedMap(atm);
    } else {
      setAttendedMap({});
    }

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [period]);

  const members = useMemo((): MemberStat[] => {
    const ptsMap: Record<string, number> = {};
    pointsData.forEach((p) => { ptsMap[p.user_id] = (ptsMap[p.user_id] ?? 0) + (p.amount ?? 0); });
    return profiles.map((p) => ({
      id: p.id,
      name: p.display_name,
      department: p.department as Department | null,
      topRole: roleMap[p.id] ?? "member",
      points: ptsMap[p.id] ?? 0,
      authored: authoredMap[p.id] ?? 0,
      attended: attendedMap[p.id] ?? 0,
    }));
  }, [profiles, roleMap, pointsData, authoredMap, attendedMap]);

  const filtered = useMemo(() => {
    const data = deptFilter === "all" ? [...members] : members.filter((m) => m.department === deptFilter);
    return data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "points") cmp = a.points - b.points;
      else if (sortKey === "authored") cmp = a.authored - b.authored;
      else if (sortKey === "attended") cmp = a.attended - b.attended;
      else cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });
  }, [members, deptFilter, sortKey, sortAsc]);

  const deptSummary = useMemo(() => DEPARTMENTS.map((dept) => {
    const dm = members.filter((m) => m.department === dept);
    return {
      dept,
      count: dm.length,
      points: dm.reduce((s, m) => s + m.points, 0),
      authored: dm.reduce((s, m) => s + m.authored, 0),
    };
  }), [members]);

  const totalPoints = useMemo(() => filtered.reduce((s, m) => s + m.points, 0), [filtered]);
  const totalInteractions = useMemo(() => filtered.reduce((s, m) => s + m.authored, 0), [filtered]);
  const activeMembers = useMemo(() => filtered.filter((m) => m.points > 0 || m.authored > 0).length, [filtered]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <Minus className="h-3 w-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  if (!isAuxPlus) {
    return (
      <div className="grid place-items-center h-64">
        <div className="text-center space-y-2">
          <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">AUX+ access required to view team stats.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6" /> Team Stats
          </h1>
          <p className="text-sm text-muted-foreground">Performance breakdown by member and department.</p>
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
        {deptSummary.map(({ dept, count, points, authored }) => (
          <Card
            key={dept}
            onClick={() => setDeptFilter(deptFilter === dept ? "all" : dept)}
            className={`rounded-2xl bg-card/60 p-5 cursor-pointer transition border ${
              deptFilter === dept ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{DEPT_LABEL[dept]}</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold">{points} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
              <span>{count} members</span>
              <span>·</span>
              <span>{authored} interactions</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Trophy className="h-3 w-3" /> {totalPoints} pts
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <ClipboardList className="h-3 w-3" /> {totalInteractions} interactions
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <UserCheck className="h-3 w-3" /> {activeMembers} active
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Users className="h-3 w-3" /> {filtered.length} members
        </Badge>
        {deptFilter !== "all" && (
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setDeptFilter("all")}>
            {DEPT_LABEL[deptFilter as Department]} ×
          </Button>
        )}
      </div>

      <Card className="rounded-2xl bg-card/60 overflow-hidden">
        <div className="p-5 pb-0 flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wide">Member breakdown</h2>
          {loading && <span className="text-xs text-muted-foreground animate-pulse ml-1">Loading…</span>}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-8">#</th>
                <th
                  className="px-5 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1">Name <SortIcon k="name" /></span>
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Dept</th>
                <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                <th
                  className="px-5 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition"
                  onClick={() => toggleSort("points")}
                >
                  <span className="flex items-center justify-end gap-1">Points <SortIcon k="points" /></span>
                </th>
                <th
                  className="px-5 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition"
                  onClick={() => toggleSort("authored")}
                >
                  <span className="flex items-center justify-end gap-1">Authored <SortIcon k="authored" /></span>
                </th>
                <th
                  className="px-5 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition"
                  onClick={() => toggleSort("attended")}
                >
                  <span className="flex items-center justify-end gap-1">Attended <SortIcon k="attended" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground text-xs">
                    No data for this period.
                  </td>
                </tr>
              )}
              {filtered.map((m, i) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${medalClass(i)}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {m.department ? DEPT_LABEL[m.department] : <span className="opacity-30">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{ROLE_LABEL[m.topRole]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    <span className={m.points > 0 ? "text-foreground" : "text-muted-foreground/40"}>{m.points}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    <span className={m.authored > 0 ? "text-foreground" : "text-muted-foreground/40"}>{m.authored}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    <span className={m.attended > 0 ? "text-foreground" : "text-muted-foreground/40"}>{m.attended}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
