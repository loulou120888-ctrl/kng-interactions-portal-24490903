import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
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
  displayName: string;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadRoles = useCallback(async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles(((data ?? []).map((r) => r.role)) as Role[]);
  }, []);

  const loadDisplayName = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).single();
    if (data?.display_name) setDisplayName(data.display_name);
  }, []);

  async function checkDeactivated(uid: string): Promise<boolean> {
    const { data } = await supabase.from("profiles").select("deactivated, display_name").eq("id", uid).single();
    if (data?.display_name) setDisplayName(data.display_name);
    if (data?.deactivated) {
      await supabase.auth.signOut();
      toast.error("Your account has been deactivated. Contact a manager.");
      return true;
    }
    return false;
  }

  function subscribeToDeactivation(uid: string) {
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
          const p = payload.new as any;
          if (p?.deactivated === true) {
            await supabase.auth.signOut();
            toast.error("Your account has been deactivated. Contact a manager.");
          }
          if (p?.display_name) setDisplayName(p.display_name);
        }
      )
      .subscribe();
    realtimeChannelRef.current = ch;
  }

  async function onSignedIn(u: User, s: Session) {
    setSession(s);
    setUser(u);
    const deactivated = await checkDeactivated(u.id);
    if (!deactivated) {
      await loadRoles(u.id);
      subscribeToDeactivation(u.id);
    }
  }

  function onSignedOut() {
    setSession(null);
    setUser(null);
    setRoles([]);
    setDisplayName("");
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }

  useEffect(() => {
    // Bootstrap from existing session — runs once
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await onSignedIn(s.user, s);
      }
      setLoading(false);
    });

    // Listen only for *changes* after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // INITIAL_SESSION is handled by getSession above — skip to avoid double calls
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT" || !s?.user) {
        onSignedOut();
        return;
      }
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && s?.user) {
        await onSignedIn(s.user, s);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    roles,
    topRole: topRole(roles),
    isAuxPlus: isAuxPlus(roles),
    isManager: isManager(roles),
    displayName,
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
