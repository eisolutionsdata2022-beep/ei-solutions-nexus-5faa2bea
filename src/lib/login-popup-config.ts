import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Login popup shown to retailers right after they sign in.
 * Stored at platformConfig/loginPopup.
 */
export type LoginPopupAudience = "all" | "selected";

export interface LoginPopupConfig {
  enabled: boolean;
  title: string;
  message: string;
  audience: LoginPopupAudience;
  /** UIDs of retailers who should see the popup when audience === "selected". */
  selectedUids: string[];
  /** ISO timestamp — used to re-show the popup after admin updates the message. */
  version: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DOC_PATH = ["platformConfig", "loginPopup"] as const;

export const DEFAULT_LOGIN_POPUP: LoginPopupConfig = {
  enabled: false,
  title: "Announcement",
  message: "",
  audience: "all",
  selectedUids: [],
  version: "",
};

function normalize(data: Partial<LoginPopupConfig> | undefined): LoginPopupConfig {
  return {
    enabled: Boolean(data?.enabled),
    title: String(data?.title ?? DEFAULT_LOGIN_POPUP.title),
    message: String(data?.message ?? ""),
    audience: (data?.audience === "selected" ? "selected" : "all"),
    selectedUids: Array.isArray(data?.selectedUids) ? data!.selectedUids! : [],
    version: String(data?.version ?? ""),
    updatedAt: data?.updatedAt,
    updatedBy: data?.updatedBy,
  };
}

export async function getLoginPopupConfig(): Promise<LoginPopupConfig> {
  const snap = await getDoc(doc(db, DOC_PATH[0], DOC_PATH[1]));
  if (!snap.exists()) return { ...DEFAULT_LOGIN_POPUP };
  return normalize(snap.data() as Partial<LoginPopupConfig>);
}

export function subscribeLoginPopupConfig(cb: (cfg: LoginPopupConfig) => void) {
  return onSnapshot(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    (snap) => {
      if (!snap.exists()) {
        cb({ ...DEFAULT_LOGIN_POPUP });
        return;
      }
      cb(normalize(snap.data() as Partial<LoginPopupConfig>));
    },
    (error) => {
      console.warn("[LoginPopup] listener skipped:", error.message);
      cb({ ...DEFAULT_LOGIN_POPUP });
    },
  );
}

export async function saveLoginPopupConfig(
  patch: Partial<Omit<LoginPopupConfig, "version" | "updatedAt" | "updatedBy">> & {
    /** When true, bumps the version so the popup re-shows even for users who already dismissed it. */
    bumpVersion?: boolean;
  },
  updatedBy?: string,
): Promise<void> {
  const ref = doc(db, DOC_PATH[0], DOC_PATH[1]);
  const snap = await getDoc(ref);
  const current = snap.exists() ? normalize(snap.data() as Partial<LoginPopupConfig>) : { ...DEFAULT_LOGIN_POPUP };

  const next: LoginPopupConfig = {
    enabled: patch.enabled ?? current.enabled,
    title: (patch.title ?? current.title).toString(),
    message: (patch.message ?? current.message).toString(),
    audience: patch.audience ?? current.audience,
    selectedUids: patch.selectedUids ?? current.selectedUids,
    version: patch.bumpVersion ? new Date().toISOString() : (current.version || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? null as any,
  };

  await setDoc(ref, next, { merge: true });
}

/**
 * Determine if a given retailer should see the popup right now.
 * Audience filter only — caller still checks `seen-version` locally to avoid re-showing after dismissal.
 */
export function shouldShowLoginPopup(cfg: LoginPopupConfig | null, uid: string): boolean {
  if (!cfg || !cfg.enabled) return false;
  if (!cfg.message.trim()) return false;
  if (cfg.audience === "all") return true;
  return Array.isArray(cfg.selectedUids) && cfg.selectedUids.includes(uid);
}

export function loginPopupSeenKey(uid: string): string {
  return `loginPopup:lastSeenVersion:${uid}`;
}
