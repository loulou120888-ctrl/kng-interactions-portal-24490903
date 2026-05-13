import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Calendar, ClipboardList, Trophy, Megaphone } from "lucide-react";
import { DEPT_LABEL, ROLE_LABEL } from "@/lib/portal";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, topRole } = useAuth();
  const [stats, setStats] = useState({ today: 0, totalPoints: 0, openSlots: 0, unread: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [todayInteractions, pts, slotStats, anns, reads, recentI] = await Promise.all([
        api.interactions.list({ limit: 1000 }).catch(() => [] as any[]),
        api.points.me().catch(() => ({ total: 0, entries: [] })),
        api.schedule.stats(todayISO).catch(() => ({ count: 0 })),
        api.announcements.list().catch(() => [] as any[]),
        api.announcements.reads().catch(() => [] as any[]),
        api.interactions.list({ limit: 8 }),
      ]);

      const todayCount = (todayInteractions as any[]).filter(r => new Date(r.created_at) >= today).length;
      const readIds = new Set((reads as any[]).map((r: any) => r.announcement_id));
      const unread = (anns as any[]).filter((a: any) => !readIds.has(a.id)).length;

      setStats({ today: todayCount, totalPoints: (pts as any).total ?? 0, openSlots: slotStats.count ?? 0, unread });
      setRecent(recentI as any[]);
    })();
  }, [user]);

  const cards = [
    { label: "Today's interactions", value: stats.today, icon: ClipboardList, href: "/interactions" },
    { label: "Your points", value: stats.totalPoints, icon: Trophy, href: "/leaderboard" },
    { label: "Booked slots today", value: stats.openSlots, icon: Calendar, href: "/schedule/events" },
    { label: "Unread announcements", value: stats.unread, icon: Megaphone, href: "/announcements" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back, {ROLE_LABEL[topRole]}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Command Centre</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.href}>
            <Card className="rounded-2xl border-border bg-card/60 p-5 backdrop-blur transition hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="rounded-2xl bg-card/60 p-5">
        <h2 className="text-sm font-semibold tracking-wide">Recent interactions</h2>
        <div className="mt-3 divide-y divide-border">
          {recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing logged yet.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{DEPT_LABEL[r.department as keyof typeof DEPT_LABEL]}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
