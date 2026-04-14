import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { GlobalChatButton } from "@/components/chat/GlobalChatButton";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EI SOLUIONS" },
      { name: "description", content: "EI Solutions Janasevana Kendram — CSC Platform for Admin, Distributor, Retailer, Trainer, and Staff" },
      { property: "og:title", content: "EI SOLUIONS" },
      { name: "twitter:title", content: "EI SOLUIONS" },
      { property: "og:description", content: "EI Solutions Janasevana Kendram — CSC Platform for Admin, Distributor, Retailer, Trainer, and Staff" },
      { name: "twitter:description", content: "EI Solutions Janasevana Kendram — CSC Platform for Admin, Distributor, Retailer, Trainer, and Staff" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DyxBbgWhnBSNhyfmmsMVltWbX9A2/social-images/social-1775881379745-EI_SOLUTIONS_logo_250x250.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DyxBbgWhnBSNhyfmmsMVltWbX9A2/social-images/social-1775881379745-EI_SOLUTIONS_logo_250x250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
