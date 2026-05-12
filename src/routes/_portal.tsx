import { createFileRoute } from "@tanstack/react-router";
import { PortalLayout } from "@/components/PortalLayout";

export const Route = createFileRoute("/_portal")({
  component: () => <PortalLayout />,
});
