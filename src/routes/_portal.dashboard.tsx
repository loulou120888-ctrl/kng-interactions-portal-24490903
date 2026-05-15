import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Calendar, ClipboardList, Trophy, Megaphone } from "lucide-react";
import { DEPT_LABEL, ROLE_LABEL } from "@/lib/portal";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_portal/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, topRole } = useAuth();
  const [stats, setStats] = useState({ today: 0, totalPoints: 0, openSlots: 0, unread: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [{ count: todayCount }, { data: pts }, { count: slotCount }, { data: ann }, { data: reads }, { data: recentI }] = await Promise.all([
        supabase.from("interactions").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("points_log").select("amount").eq("user_id", user.id),
        supabase.from("schedule_slots").select("id", { count: "exact", head: true }).gte("slot_start", todayISO).eq("status", "booked"),
        supabase.from("announcements").select("id"),
        supabase.from("announcement_reads").select("announcement_id").eq("user_id", user.id),
        supabase.from("interactions").select("id, title, department, created_at, author_id").order("created_at", { ascending: false }).limit(8),
      ]);
      const totalPoints = (pts ?? []).reduce((a, b) => a + (b.amount ?? 0), 0);
      const readIds = new Set((reads ?? []).map((r: any) => r.announcement_id));
      const unread = (ann ?? []).filter((a: any) => !readIds.has(a.id)).length;
      setStats({ today: todayCount ?? 0, totalPoints, openSlots: slotCount ?? 0, unread });
      setRecent(recentI ?? []);
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
