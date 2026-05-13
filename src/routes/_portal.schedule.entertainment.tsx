import { createFileRoute } from "@tanstack/react-router";
import { ScheduleView } from "@/components/ScheduleView";

export const Route = createFileRoute("/_portal/schedule/entertainment")({  component: () => (
    <ScheduleView
      scheduleType="entertainment"
      title="Entertainment Schedule"
      allowedDepartments={["entertainment"]}
    />
  ),
});
