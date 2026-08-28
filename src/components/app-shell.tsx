import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Home, Layers, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "./logo";
import { Onboarding } from "./onboarding";
import { registerServiceWorker } from "@/lib/share-target";
import { dueCardsOf, useHoorspel } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shelf", label: "Clips", icon: Layers },
  { to: "/review", label: "Review", icon: BookOpen },
  { to: "/settings", label: "You", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const profile = useHoorspel((s) => s.profile);
  const dark = useHoorspel((s) => s.dark);
  const due = useHoorspel((s) => dueCardsOf(s.cards).length);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    registerServiceWorker();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dyslexic", profile.dyslexia_font);
  }, [dark, profile.dyslexia_font]);

  return (
    <div className="paper-grain min-h-dvh bg-background text-foreground">
      {hydrated && !profile.onboarded ? <Onboarding /> : null}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="text-foreground">
            <Wordmark />
          </Link>
          <Link
            to="/settings"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Settings
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.label}
                  {item.to === "/review" && due > 0 ? (
                    <span className="absolute top-1.5 right-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] text-primary-foreground tabular">
                      {due}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
