<<<<<<< HEAD
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";
import { isAdmPlus, isAuxPlus, isManager, topRole, type Role } from "@/lib/portal";
=======
import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAuxPlus, isManager, topRole, type Role } from "@/lib/portal";
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  topRole: Role;
  isAuxPlus: boolean;
  isAdmPlus: boolean;
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
        (payload) => {
          const p = payload.new as any;
          if (p?.deactivated === true) {
            // Fire and forget — never await inside a realtime callback
            supabase.auth.signOut();
            toast.error("Your account has been deactivated. Contact a manager.");
          }
          if (p?.display_name) setDisplayName(p.display_name);
        }
      )
      .subscribe();
    realtimeChannelRef.current = ch;
  }

  // Hydrate profile + roles WITHOUT awaiting inside onAuthStateChange.
  // Awaiting Supabase calls inside the auth callback deadlocks the client and
  // causes the sign-in spinner to hang forever.
  function hydrateUser(uid: string) {
    supabase
      .from("profiles")
      .select("deactivated, display_name")
      .eq("id", uid)
      .single()
      .then(({ data }) => {
        const d = data as any;
        if (d?.display_name) setDisplayName(d.display_name);
        if (d?.deactivated) {
          supabase.auth.signOut();
          toast.error("Your account has been deactivated. Contact a manager.");
          return;
        }
        loadRoles(uid);
        subscribeToDeactivation(uid);
      });
  }

  function onSignedIn(u: User, s: Session) {
    setSession(s);
    setUser(u);
    // Defer DB calls to next tick — must NOT await inside auth callback
    setTimeout(() => hydrateUser(u.id), 0);
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
    // Set up listener FIRST so we never miss an event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT" || !s?.user) {
        onSignedOut();
        return;
      }
      if (s?.user) {
        onSignedIn(s.user, s);
      }
    });

    // Then bootstrap any existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        onSignedIn(s.user, s);
      }
      setLoading(false);
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
    isAdmPlus: isAdmPlus(roles),
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
