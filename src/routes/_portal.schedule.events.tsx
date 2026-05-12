import { createFileRoute } from "@tanstack/react-router";
import { ScheduleView } from "@/components/ScheduleView";

export const Route = createFileRoute("/_portal/schedule/events")({
  head: () => ({ meta: [{ title: "Events & Parties Schedule — KNG" }] }),
  component: () => (
    <ScheduleView
      scheduleType="events_parties"
      title="Events & Parties Schedule"
      allowedDepartments={["events", "parties"]}
    />
  ),
});
