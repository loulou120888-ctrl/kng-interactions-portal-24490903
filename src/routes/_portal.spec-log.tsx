import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Copy, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/spec-log")({ component: SpecLog });

type Status = "hosting" | "in_rp" | "out_of_city";

const OPTIONS: { value: Status; label: string; emoji: string; active: string }[] = [
  { value: "hosting",     label: "Hosting",     emoji: "🎙️", active: "bg-green-500/15 text-green-400 border-green-500/40" },
  { value: "in_rp",       label: "In RP",        emoji: "🎮", active: "bg-blue-500/15 text-blue-400 border-blue-500/40" },
  { value: "out_of_city", label: "Out of city",  emoji: "✈️", active: "bg-orange-500/15 text-orange-400 border-orange-500/40" },
];

type Profile = { id: string; display_name: string; city_id: string | null };

function SpecLog() {
  const { isAuxPlus } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status | null>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, display_name, city_id")
      .eq("deactivated", false)
      .order("display_name")
      .then(({ data }) => setProfiles((data ?? []) as Profile[]));
  }, []);

  if (!isAuxPlus) {
    return <p className="text-sm text-muted-foreground">AUX+ only.</p>;
  }

  function toggle(id: string, value: Status) {
    setStatuses(prev => ({ ...prev, [id]: prev[id] === value ? null : value }));
  }

  function reset() {
    setStatuses({});
  }

  async function copyList() {
    const groups: Record<Status | "none", string[]> = {
      hosting: [], in_rp: [], out_of_city: [], none: [],
    };

    profiles.forEach(p => {
      const s = statuses[p.id] ?? null;
      const label = p.city_id ? `${p.display_name} (${p.city_id})` : p.display_name;
      groups[s ?? "none"].push(label);
    });

    const lines: string[] = [
      `📋 Staff Spec Log — ${new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`,
      "─".repeat(34),
    ];

    if (groups.hosting.length)     lines.push(`🎙️  Hosting: ${groups.hosting.join(", ")}`);
    if (groups.in_rp.length)       lines.push(`🎮  In RP: ${groups.in_rp.join(", ")}`);
    if (groups.out_of_city.length) lines.push(`✈️  Out of city: ${groups.out_of_city.join(", ")}`);
    if (groups.none.length)        lines.push(`⚪  No status: ${groups.none.join(", ")}`);

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Spec log copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  }

  const setCount = profiles.filter(p => statuses[p.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6" /> Spec Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Set each team member's current status, then copy the list to share.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {setCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {setCount} / {profiles.length} set
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={reset} disabled={setCount === 0}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button onClick={copyList} className="flex items-center gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy list"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <span className="font-mono">Format preview:</span>
        <span className="text-foreground/60">🎙️ Hosting: Alice (12345) · 🎮 In RP: Bob (67890) · ✈️ Out of city: Charlie</span>
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        <div className="divide-y divide-border">
          {profiles.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading staff…</p>
          )}
          {profiles.map((p) => {
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
