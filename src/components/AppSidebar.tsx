import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Trophy,
  Gift,
  Megaphone,
  Image as ImageIcon,
  Users,
  Archive,
  Shield,
  LogOut,
  Crown,
  FileImage,
  BarChart2,
  User,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABEL } from "@/lib/portal";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Interactions", url: "/interactions", icon: ClipboardList },
  { title: "Posters & Promos", url: "/posters", icon: FileImage },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Hall of Fame", url: "/hall", icon: ImageIcon },
  { title: "Tutorial", url: "/tutorial", icon: GraduationCap },
  { title: "Support & Commands", url: "/support", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isAuxPlus, isManager, topRole, signOut, displayName, avatarUrl } = useAuth();

  const username = displayName || user?.email?.replace(/@kngportal\.com$/, "") || user?.email || "—";
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">KNG Portal</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Interactions
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAuxPlus && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/stats"} tooltip="Team Stats">
                    <Link to="/stats"><BarChart2 className="h-4 w-4" /><span>Team Stats</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/comp"} tooltip="Comp Queue">
                    <Link to="/comp"><Gift className="h-4 w-4" /><span>Comp Queue</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/staff"} tooltip="Staff">
                    <Link to="/staff"><Users className="h-4 w-4" /><span>Staff</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/admin"} tooltip="Admin">
                    <Link to="/admin"><Shield className="h-4 w-4" /><span>Codes & Prizes</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isManager && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={path === "/archives"} tooltip="Archives">
                      <Link to="/archives"><Archive className="h-4 w-4" /><span>Archives</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <Link to="/profile" className="flex-shrink-0">
            <Avatar className="h-8 w-8 border border-sidebar-border hover:ring-2 hover:ring-primary/40 transition">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-secondary text-xs">{initial}</AvatarFallback>
            </Avatar>
          </Link>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{username}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {ROLE_LABEL[topRole]}
                </p>
              </div>
              <Link
                to="/profile"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                aria-label="Profile settings"
              >
                <User className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
