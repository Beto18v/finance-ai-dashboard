"use client";

import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const AUTH_CALLBACK_PATH = "/auth/callback";

function normalizeSiteUrl(value: string): string {
  const trimmedValue = value.trim();
  const siteUrl = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  return siteUrl.replace(/\/+$/, "");
}

function getSiteUrl(): string {
  // Prefer the current browser origin so preview and production deployments
  // always redirect back to the exact host serving the app.
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl?.trim()) {
    return normalizeSiteUrl(configuredSiteUrl);
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl?.trim()) {
    return normalizeSiteUrl(vercelUrl);
  }

  throw new Error(
    "Missing site URL. Set NEXT_PUBLIC_SITE_URL or run this in the browser.",
  );
}

export async function signInWithGoogle() {
  const redirectTo = new URL(AUTH_CALLBACK_PATH, getSiteUrl()).toString();
  return createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function bootstrapAuthenticatedProfile(name?: string) {
  const trimmedName = name?.trim();
  return api.bootstrapProfile(trimmedName ? { name: trimmedName } : undefined);
}
