import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/matrimony")({
  ssr: false,
  component: MatrimonyLayout,
});

function MatrimonyLayout() {
  return <Outlet />;
}
