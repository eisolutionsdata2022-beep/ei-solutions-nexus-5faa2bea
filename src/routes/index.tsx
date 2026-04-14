import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/LoginForm";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI Solutions CSC Platform — Login" },
      { name: "description", content: "EI Solutions Janasevana Kendram CSC Platform. Secure login for Admin, Distributor, Retailer, Trainer, and Staff." },
    ],
  }),
});

function Index() {
  return <LoginForm />;
}
