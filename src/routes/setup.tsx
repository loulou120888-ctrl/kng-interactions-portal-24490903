import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/setup")({ component: SetupPage });

function SetupPage() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-xl font-semibold">Portal Setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          To set up the portal, create the first account — you will automatically become the Manager.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => navigate({ to: "/signup" })}>Create first account</Button>
          <Link to="/login"><Button variant="outline" className="w-full">Sign in instead</Button></Link>
        </div>
      </div>
    </div>
  );
}
