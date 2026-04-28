/**
 * IPPB native software download config.
 * Stored in Firestore at: settings/ippbSoftware
 *
 * - PC Agent (Windows .exe) — installed by RETAILER on shop PC.
 *   Connects to fingerprint scanner (Mantra/Morpho/Startek) and relays
 *   biometric capture to staff via Firestore.
 *
 * - Staff APK (Android) — installed by STAFF on tablet to drive the
 *   IPPB BC App workflow + receive capture confirmations.
 *
 * Admin can update version + URL anytime from /admin/ippb-settings.
 */
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface IPPBSoftwareConfig {
  pcAgent: {
    enabled: boolean;
    version: string;
    url: string;          // direct download link (.exe / .msi / .zip)
    sizeMB?: number;
    releaseNotes?: string;
  };
  staffApk: {
    enabled: boolean;
    version: string;
    url: string;          // direct download link (.apk)
    sizeMB?: number;
    releaseNotes?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_IPPB_SOFTWARE: IPPBSoftwareConfig = {
  pcAgent: {
    enabled: false,
    version: "1.0.0",
    url: "",
    sizeMB: 0,
    releaseNotes: "Initial release — Mantra MFS100, Morpho MSO1300, Startek FM220 supported.",
  },
  staffApk: {
    enabled: false,
    version: "1.0.0",
    url: "",
    sizeMB: 0,
    releaseNotes: "Initial release — IPPB BC App workflow + Firestore relay.",
  },
};

const REF = () => doc(db, "settings", "ippbSoftware");

export async function getIPPBSoftwareConfig(): Promise<IPPBSoftwareConfig> {
  const snap = await getDoc(REF());
  if (!snap.exists()) return DEFAULT_IPPB_SOFTWARE;
  const data = snap.data() as Partial<IPPBSoftwareConfig>;
  return {
    pcAgent: { ...DEFAULT_IPPB_SOFTWARE.pcAgent, ...(data.pcAgent ?? {}) },
    staffApk: { ...DEFAULT_IPPB_SOFTWARE.staffApk, ...(data.staffApk ?? {}) },
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export async function saveIPPBSoftwareConfig(
  cfg: Omit<IPPBSoftwareConfig, "updatedAt" | "updatedBy">,
  updatedBy: string
): Promise<void> {
  await setDoc(REF(), {
    ...cfg,
    updatedAt: new Date().toISOString(),
    updatedBy,
    _ts: serverTimestamp(),
  });
}
