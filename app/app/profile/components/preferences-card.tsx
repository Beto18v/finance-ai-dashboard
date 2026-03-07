"use client";

import { useTheme } from "next-themes";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PreferencesCard() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, site } = useSitePreferences();
  const t = site.pages.profile;
  const selectedTheme = theme ?? "system";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.preferencesTitle}</CardTitle>
        <CardDescription>{t.preferencesDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t.languageLabel}</Label>
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as "es" | "en")}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">{t.languageEs}</SelectItem>
              <SelectItem value="en">{t.languageEn}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t.appearanceLabel}</Label>
          <Select
            value={selectedTheme}
            onValueChange={(value) => setTheme(value)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t.themeSystem}</SelectItem>
              <SelectItem value="light">{t.themeLight}</SelectItem>
              <SelectItem value="dark">{t.themeDark}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
