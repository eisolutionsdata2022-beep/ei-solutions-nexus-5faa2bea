/**
 * React context for the Finance subsite. Completely separate from the main
 * AuthProvider — only routes nested under /finance use this.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  financeSignIn,
  financeSignOut,
  onFinanceAuthChange,
  getFinanceUserProfile,
  type FinanceUserProfile,
} from "./finance-auth";

interface FinanceAuthContextValue {
  user: FinanceUserProfile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<FinanceUserProfile>;
  signOut: () => Promise<void>;
}

const FinanceAuthContext = createContext<FinanceAuthContextValue | null>(null);

export function FinanceAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FinanceUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onFinanceAuthChange(async (fu) => {
      if (!fu) {
        setUser(null);
        setLoading(false);
        return;
      }
      const profile = await getFinanceUserProfile(fu.uid);
      // Enforce 'active' flag on every refresh — admin can revoke at any time.
      if (!profile || !profile.active) {
        await financeSignOut().catch(() => {});
        setUser(null);
      } else {
        setUser(profile);
      }
      setLoading(false);
    });
  }, []);

  const value: FinanceAuthContextValue = {
    user,
    loading,
    signIn: async (u, p) => {
      const profile = await financeSignIn(u, p);
      setUser(profile);
      return profile;
    },
    signOut: async () => {
      await financeSignOut();
      setUser(null);
    },
  };

  return (
    <FinanceAuthContext.Provider value={value}>
      {children}
    </FinanceAuthContext.Provider>
  );
}

export function useFinanceAuth() {
  const ctx = useContext(FinanceAuthContext);
  if (!ctx) throw new Error("useFinanceAuth must be used within FinanceAuthProvider");
  return ctx;
}
