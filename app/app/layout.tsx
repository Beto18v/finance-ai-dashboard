"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/providers/auth-provider";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useSession();
  const { site } = useSitePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const [profileReady, setProfileReady] = useState(false);
  const navLinks = [
    { href: "/app/balance", label: site.appLayout.nav.balance },
    { href: "/app/transactions", label: site.appLayout.nav.transactions },
    { href: "/app/categories", label: site.appLayout.nav.categories },
    { href: "/app/profile", label: site.appLayout.nav.profile },
  ];

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/login");
      return;
    }

    if (!loading && session) {
      api
        .getProfile()
        .then(() => setProfileReady(true))
        .catch(async (err) => {
          if (err instanceof ApiError && err.status === 404) {
            await signOut();
            router.replace("/auth/register");
            return;
          }

          if (err instanceof ApiError && err.status === 401) {
            await signOut();
            router.replace("/auth/login");
            return;
          }

          setProfileReady(true);
        });
    }
  }, [session, loading, router, signOut]);

  if (loading || (session && !profileReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            {site.common.loading}
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/auth/login");
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <header className="bg-background border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Brand */}
          <Link
            href="/app/balance"
            className="flex items-center gap-1.5 shrink-0"
          >
            <span className="font-bold text-base tracking-tight text-green-600">
              Dine<span className="text-primary">rance</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-left gap-1 flex-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block max-w-45 truncate">
              {session.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              {site.appLayout.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
