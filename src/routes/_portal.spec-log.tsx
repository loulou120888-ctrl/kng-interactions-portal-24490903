import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Copy, Check, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/spec-log")({ component: SpecLog });

type Status = "hosting" | "in_rp" | "out_of_city" | "staff_work" | "afk";
type Department = "events" | "parties" | "entertainment";
type TeamFilter = Department | "all";

const OPTIONS: { value: Status; label: string; emoji: string; active: string }[] = [
  { value: "hosting",     label: "Hosting",      emoji: "🎙️", active: "bg-green-500/15 text-green-400 border-green-500/40" },
  { value: "in_rp",       label: "In RP",         emoji: "🎮", active: "bg-blue-500/15 text-blue-400 border-blue-500/40" },
  { value: "out_of_city", label: "Out of city",   emoji: "✈️", active: "bg-orange-500/15 text-orange-400 border-orange-500/40" },
  { value: "staff_work",  label: "Staff work",    emoji: "🛠️", active: "bg-purple-500/15 text-purple-400 border-purple-500/40" },
  { value: "afk",         label: "AFK",           emoji: "💤", active: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
];

const TEAMS: { value: TeamFilter; label: string; emoji: string }[] = [
  { value: "all",           label: "All Staff",    emoji: "👥" },
  { value: "events",        label: "Events",       emoji: "🎉" },
  { value: "parties",       label: "Parties",      emoji: "🎊" },
  { value: "entertainment", label: "Entertainment", emoji: "🎭" },
];

type Profile = { id: string; display_name: string; city_id: string | null; department: Department | null };

function SpecLog() {
  const { isAuxPlus } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status | null>>({});
  const [team, setTeam] = useState<TeamFilter>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, display_name, city_id, department")
      .eq("deactivated", false)
      .order("display_name")
      .then(({ data }) => setProfiles((data ?? []) as Profile[]));
  }, []);

  if (!isAuxPlus) {
    return <p className="text-sm text-muted-foreground">AUX+ only.</p>;
  }

  const visible = team === "all"
    ? profiles
    : profiles.filter(p => p.department === team);

  function toggle(id: string, value: Status) {
    setStatuses(prev => ({ ...prev, [id]: prev[id] === value ? null : value }));
  }

  function reset() {
    const resetIds = visible.map(p => p.id);
    setStatuses(prev => {
      const next = { ...prev };
      resetIds.forEach(id => { next[id] = null; });
      return next;
    });
  }

  async function copyList() {
    const groups: Record<Status | "none", string[]> = {
      hosting: [], in_rp: [], out_of_city: [], staff_work: [], afk: [], none: [],
    };

    visible.forEach(p => {
      const s = statuses[p.id] ?? null;
      const label = p.city_id ? `${p.display_name} (${p.city_id})` : p.display_name;
      groups[s ?? "none"].push(label);
    });

    const teamLabel = TEAMS.find(t => t.value === team)!;
    const lines: string[] = [
      `📋 Spec Log — ${teamLabel.emoji} ${teamLabel.label} — ${new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`,
      "─".repeat(38),
    ];

    const sections: [string[], string][] = [
      [groups.hosting,     "🎙️  Hosting"],
      [groups.in_rp,       "🎮  In RP"],
      [groups.out_of_city, "✈️  Out of city"],
      [groups.staff_work,  "🛠️  Staff work"],
      [groups.afk,         "💤  AFK"],
      [groups.none,        "⚪  No status"],
    ];

    for (const [members, header] of sections) {
      if (!members.length) continue;
      lines.push(header);
      members.forEach(name => lines.push(`    ${name}`));
    }

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Spec log copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  }

  const setCount = visible.filter(p => statuses[p.id]).length;
  const hasAny = visible.some(p => statuses[p.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6" /> Spec Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a team, set each member's status, then copy the list to share.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {setCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {setCount} / {visible.length} set
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={reset} disabled={!hasAny}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button onClick={copyList} className="flex items-center gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy list"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TEAMS.map(t => (
          <button
            key={t.value}
            onClick={() => setTeam(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              team === t.value
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            <span className="text-xs opacity-60">
              ({team === "all" || t.value === "all"
                ? t.value === "all" ? profiles.length : profiles.filter(p => p.department === t.value).length
                : profiles.filter(p => p.department === t.value).length})
            </span>
          </button>
        ))}
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {visible.length === 0 && profiles.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading staff…</p>
          )}
          {visible.length === 0 && profiles.length > 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-1">
              <Users className="h-5 w-5 opacity-40" />
              No staff assigned to this team yet.
            </p>
          )}
          {visible.map((p) => {
            const current = statuses[p.id] ?? null;
            return (
              <div key={p.id} className="flex items-center gap-3 py-2.5 px-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{p.display_name}</span>
                  {p.city_id && (
                    <span className="ml-2 text-xs text-muted-foreground font-mono">#{p.city_id}</span>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggle(p.id, opt.value)}
                      className={`px-2.5 py-1 rounded-md text-xs border font-medium transition-all ${
                        current === opt.value
                          ? opt.active
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
