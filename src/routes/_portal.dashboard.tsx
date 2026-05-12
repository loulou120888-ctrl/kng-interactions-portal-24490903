import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { ClipboardList, AlertTriangle, Users, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_portal/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MDT Portal" }] }),
  component: Dashboard,
});

interface Stat {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone: string;
}

function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [trend, setTrend] = useState<{ day: string; count: number }[]>([]);
  const [bySev, setBySev] = useState<{ severity: string; count: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: ic }, { count: wc }, { count: pc }, { count: ac }] = await Promise.all([
        supabase.from("interactions").select("*", { count: "exact", head: true }),
        supabase.from("warnings").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("staff_activity").select("*", { count: "exact", head: true }),
      ]);
      setStats([
        { label: "Interactions", value: ic ?? 0, icon: ClipboardList, tone: "primary" },
        { label: "Warnings", value: wc ?? 0, icon: AlertTriangle, tone: "warning" },
        { label: "Staff", value: pc ?? 0, icon: Users, tone: "success" },
        { label: "Actions", value: ac ?? 0, icon: Activity, tone: "chart-4" },
      ]);

      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: ints } = await supabase
        .from("interactions")
        .select("created_at, severity, citizen_name, summary, type, id")
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      const buckets: Record<string, number> = {};
      const sevs: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        const k = d.toLocaleDateString("en", { weekday: "short" });
        buckets[k] = 0;
      }
      ints?.forEach((r) => {
        const k = new Date(r.created_at).toLocaleDateString("en", { weekday: "short" });
        if (k in buckets) buckets[k]++;
        if (r.severity in sevs) sevs[r.severity]++;
      });
      setTrend(Object.entries(buckets).map(([day, count]) => ({ day, count })));
      setBySev(Object.entries(sevs).map(([severity, count]) => ({ severity, count })));
      setRecent(ints?.slice(0, 6) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of department activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="text-base">Interactions — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.16 245)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.16 245)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 260)" />
                  <XAxis dataKey="day" stroke="oklch(0.68 0.02 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.68 0.02 260)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.205 0.014 260)",
                      border: "1px solid oklch(0.28 0.014 260)",
                      borderRadius: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="oklch(0.72 0.16 245)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="text-base">By severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySev}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 260)" />
                  <XAxis dataKey="severity" stroke="oklch(0.68 0.02 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.68 0.02 260)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.205 0.014 260)",
                      border: "1px solid oklch(0.28 0.014 260)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.65 0.2 305)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border bg-card/80 shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle className="text-base">Recent interactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  <SeverityDot s={r.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{r.summary}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.type} · {r.citizen_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{r.severity}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SeverityDot({ s }: { s: string }) {
  const color =
    s === "critical" ? "bg-destructive" :
    s === "high" ? "bg-warning" :
    s === "medium" ? "bg-primary" :
    "bg-muted-foreground";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}
