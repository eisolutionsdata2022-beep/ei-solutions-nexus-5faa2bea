import { useEffect, useState } from "react";
import {
  getLandingContent,
  DEFAULT_LANDING_CONTENT,
  type LandingContent,
} from "@/lib/landing-cms";

/**
 * Read landing/booklet CMS content with a static fallback so the page
 * never blanks while Firestore loads.
 */
export function useLandingContent() {
  const [content, setContent] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getLandingContent()
      .then((c) => { if (alive) setContent(c); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { content, loading };
}
