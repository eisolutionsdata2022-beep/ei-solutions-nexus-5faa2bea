import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/LoginForm";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — EI Solutions CSC Platform" },
      { name: "description", content: "Secure sign-in for EI Solutions Janasevana Kendram. Admin, Distributor, Retailer, Trainer, and Staff portal." },
    ],
  }),
  component: () => <LoginForm />,
});
