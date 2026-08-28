import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";
import { withBase } from "@/lib/base";
import appCss from "../styles.css?url";

const APP_NAME = "Hoorspel";
const pages = import.meta.env.VITE_GITHUB_PAGES === "1";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#1C1915" },
      {
        name: "description",
        content: "Authentic Dutch listening and speaking lessons for English speakers.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: withBase("favicon.svg") },
      { rel: "stylesheet", href: appCss },
      {
        rel: "manifest",
        href: pages ? withBase("manifest.webmanifest") : "/__grok/manifest.webmanifest",
      },
      {
        rel: "apple-touch-icon",
        href: pages ? withBase("icon-192.png") : "/__grok/icon-180.png",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster position="top-center" richColors={false} />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
