/**
 * Legacy `/finance` URL — the standalone finance subsite has been retired.
 * Finance is now part of the regular retailer dashboard at /retailer/finance.
 * Anyone landing on the old URL is redirected there (authenticated users go
 * straight in; unauthenticated users hit the normal /login first).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/finance")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/retailer/finance" });
  },
  component: () => null,
});
