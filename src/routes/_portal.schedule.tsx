import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Balloon } from "lucide-react";
import { ScheduleView } from "@/components/ScheduleView";

export const Route = createFileRoute("/_portal/schedule")({ component: Schedule });

type Tab = "events" | "entertainment";

function Schedule() {
  const [tab, setTab] = useState<Tab>("events");
  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });

  function shiftDay(n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); setDate(d);
  }

  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">30-minute slots — live updating · click to book or claim</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 rounded-md border border-border text-sm">{date.toDateString()}</div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border">
        <button
          onClick={() => setTab("events")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "events"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Events &amp; Parties
        </button>
        <button
          onClick={() => setTab("entertainment")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "entertainment"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Balloon className="h-3.5 w-3.5" /> Entertainment
        </button>
      </div>

      {tab === "events" && (
        <ScheduleView
          key="events"
          scheduleType="events_parties"
          title="Events & Parties Schedule"
          allowedDepartments={["events", "parties"]}
          externalDate={date}
          onExternalDateChange={setDate}
        />
      )}
      {tab === "entertainment" && (
        <ScheduleView
          key="entertainment"
          scheduleType="entertainment"
          title="Entertainment Schedule"
          allowedDepartments={["entertainment"]}
          externalDate={date}
          onExternalDateChange={setDate}
        />
      )}
    </div>
  );
}
