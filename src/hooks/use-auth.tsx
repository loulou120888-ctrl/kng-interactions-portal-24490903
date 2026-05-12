import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAuxPlus, isManager, topRole, type Role } from "@/lib/portal";
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  topRole: Role;
  isAuxPlus: boolean;
  isManager: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles(((data ?? []).map((r) => r.role)) as Role[]);
  }

  async function checkDeactivated(uid: string): Promise<boolean> {
    const { data } = await supabase.from("profiles").select("deactivated").eq("id", uid).single();
    if (data?.deactivated) {
      await supabase.auth.signOut();
      toast.error("Your account has been deactivated. Contact a manager.");
      return true;
    }
    return false;
  }

  function subscribeToDeactivation(uid: string) {
    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const ch = supabase
      .channel(`profile-deactivation-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        async (payload) => {
          if ((payload.new as any)?.deactivated === true) {
            await supabase.auth.signOut();
            toast.error("Your account has been deactivated. Contact a manager.");
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = ch;
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const deactivated = await checkDeactivated(s.user.id);
        if (!deactivated) {
          setTimeout(() => loadRoles(s.user.id), 0);
          subscribeToDeactivation(s.user.id);
        }
      } else {
        setRoles([]);
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const deactivated = await checkDeactivated(s.user.id);
        if (!deactivated) {
          await loadRoles(s.user.id);
          subscribeToDeactivation(s.user.id);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    roles,
    topRole: topRole(roles),
    isAuxPlus: isAuxPlus(roles),
    isManager: isManager(roles),
    signOut: async () => { await supabase.auth.signOut(); },
    refreshRoles: async () => { if (user) await loadRoles(user.id); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
