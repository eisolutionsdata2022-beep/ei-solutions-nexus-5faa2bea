import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type UserRole = "admin" | "distributor" | "retailer" | "trainer" | "staff";

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
  kycStatus?: "pending" | "approved" | "rejected";
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  register: (email: string, password: string, data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setAppUser({ ...userDoc.data(), uid: firebaseUser.uid } as AppUser);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string): Promise<AppUser> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    const userData = userDoc.data() as AppUser;
    setAppUser(userData);
    return userData;
  };

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const register = async (email: string, password: string, data: Partial<AppUser>) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData: AppUser = {
      uid: cred.user.uid,
      email,
      role: (data.role as UserRole) || "retailer",
      name: data.name || "",
      phone: data.phone || "",
      kycStatus: "pending",
    };
    await setDoc(doc(db, "users", cred.user.uid), userData);
    // Create wallet
    await setDoc(doc(db, "wallets", cred.user.uid), {
      userId: cred.user.uid,
      balance: 0,
      createdAt: new Date().toISOString(),
    });
    setAppUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout, resetPassword, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
