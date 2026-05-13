import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";
import { isAuxPlus, isManager, topRole, type Role } from "@/lib/portal";
import { toast } from "sonner";

interface AuthUser {
  id: string;
  displayName: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  roles: Role[];
  topRole: Role;
  isAuxPlus: boolean;
  isManager: boolean;
  displayName: string;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async (uid: string) => {
    try {
      const rows = await api.roles.me();
      setRoles((rows ?? []).map((r: any) => r.role) as Role[]);
    } catch {
      setRoles([]);
    }
  }, []);

  const checkDeactivated = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const profile = await api.profiles.get(uid);
      return profile?.deactivated === true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    api.auth.me()
      .then(async ({ user: u }) => {
        if (u) {
          const deactivated = await checkDeactivated(u.id);
          if (deactivated) {
            await api.auth.logout();
            toast.error("Your account has been deactivated. Contact a manager.");
            setUser(null);
          } else {
            setUser(u);
            await loadRoles(u.id);
          }
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
    setRoles([]);
  };

  const refreshRoles = async () => {
    if (user) await loadRoles(user.id);
  };

  const value: AuthContextValue = {
    user,
    loading,
    roles,
    topRole: topRole(roles),
    isAuxPlus: isAuxPlus(roles),
    isManager: isManager(roles),
    displayName: user?.displayName ?? "",
    signOut,
    refreshRoles,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
