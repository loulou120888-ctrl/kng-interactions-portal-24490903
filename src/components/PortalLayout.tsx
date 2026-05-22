import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export function PortalLayout({ children }: { children?: ReactNode }) {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();

  const forceReset = session?.user?.user_metadata?.force_password_reset;

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (forceReset) { navigate({ to: "/set-password" }); }
  }, [user, loading, forceReset, navigate]);

  if (loading || !user || forceReset) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/40" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-success shadow-[0_0_8px_oklch(0.7_0.16_155)]" />
              <span>System online</span>
            </div>
          </header>
          <main className="flex-1 p-6">{children ?? <Outlet />}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
