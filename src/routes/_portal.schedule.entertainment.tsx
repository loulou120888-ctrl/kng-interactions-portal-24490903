import { createFileRoute } from "@tanstack/react-router";
import { ScheduleView } from "@/components/ScheduleView";

export const Route = createFileRoute("/_portal/schedule/entertainment")({
  head: () => ({ meta: [{ title: "Entertainment Schedule — KNG" }] }),
  component: () => (
    <ScheduleView
      scheduleType="entertainment"
      title="Entertainment Schedule"
      allowedDepartments={["entertainment"]}
    />
  ),
});
