"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultSiteLocale,
  getSiteText,
  isSiteLocale,
  type SiteLocale,
  type SiteText,
} from "@/lib/site";

const LOCALE_STORAGE_KEY = "site:locale";

type SitePreferencesContextValue = {
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
  site: SiteText;
};

const SitePreferencesContext = createContext<SitePreferencesContextValue>({
  locale: defaultSiteLocale,
  setLocale: () => {},
  site: getSiteText(defaultSiteLocale),
});

export function SitePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<SiteLocale>(() => {
    if (typeof window === "undefined") return defaultSiteLocale;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored && isSiteLocale(stored) ? stored : defaultSiteLocale;
  });

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: SiteLocale) => {
    setLocaleState(nextLocale);
  }, []);

  const site = useMemo(() => getSiteText(locale), [locale]);

  return (
    <SitePreferencesContext.Provider value={{ locale, setLocale, site }}>
      {children}
    </SitePreferencesContext.Provider>
  );
}

export function useSitePreferences() {
  return useContext(SitePreferencesContext);
}
