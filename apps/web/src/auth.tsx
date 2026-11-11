// Who is signed in. Loaded once from GET /api/me; a 401 anywhere later signs the app out.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Me } from "@dailydsa/shared";
import { api, ApiErr, setSessionLostHandler } from "./api";

interface AuthState {
  /** undefined = still loading; null = signed out. */
  user: Me | null | undefined;
  /** Couldn't reach the server on the first load. */
  bootError: string | null;
  setUser: (u: Me | null) => void;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

const SIGNED_IN_KEY = "dsa.signedIn";

/** True when this browser was signed out the last time the app checked. Only a hint for first paint. */
export function wasSignedOut(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === "0";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    api.me().then(setUser, (e: unknown) => {
      if (e instanceof ApiErr && e.code === "unauthorized") setUser(null);
      else {
        setBootError(e instanceof Error ? e.message : "Can't reach the server.");
        setUser(null);
      }
    });
    return () => setSessionLostHandler(undefined);
  }, []);

  // Remember whether this browser was signed in, so "/" can show the landing page without waiting for /api/me.
  useEffect(() => {
    if (user === undefined) return;
    try {
      localStorage.setItem(SIGNED_IN_KEY, user ? "1" : "0");
    } catch {
      /* storage blocked: the landing page just waits for /api/me */
    }
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      bootError,
      setUser: (u) => {
        setBootError(null);
        setUser(u);
      },
      logout: async () => {
        await api.logout().catch(() => {});
        setUser(null);
      },
    }),
    [user, bootError],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const a = useContext(AuthCtx);
  if (!a) throw new Error("useAuth outside AuthProvider");
  return a;
}

/** Only call where the shell guarantees a signed-in user. */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error("useMe without a user");
  return user;
}

export const isStaff = (u: Me) => u.role === "admin" || u.role === "setter";
