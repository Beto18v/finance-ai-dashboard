"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, ApiError, type UserProfile } from "@/lib/api";
import { getCache, setCache, clearUserCache } from "@/lib/cache";
import { useSession } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import { PreferencesCard } from "./components/preferences-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const CACHE_KEY = "cache:profile";

type SaveStatus = "idle" | "saving" | "saved";

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useSession();
  const { site } = useSitePreferences();
  const t = site.pages.profile;

  const [profile, setProfile] = useState<UserProfile | null>(() =>
    getCache<UserProfile>(CACHE_KEY),
  );
  const [name, setName] = useState(
    () => getCache<UserProfile>(CACHE_KEY)?.name ?? "",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getProfile()
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        setName(data.name);
        setCache(CACHE_KEY, data);
      })
      .catch((err) => {
        if (err instanceof ApiError) toast.error(err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveName(val), 800);
  }

  async function saveName(val: string) {
    if (!val.trim()) return;
    try {
      const updated = await api.updateProfile({ name: val.trim() });
      setProfile(updated);
      setCache(CACHE_KEY, updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("idle");
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(t.failedSaveName);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.deleteAccount();
      clearUserCache();
      const supabase = createClient();
      await supabase.auth.signOut();
      await signOut();
      toast.success(t.deleted);
      router.replace("/auth/register");
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(t.failedDeleteAccount);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.infoCardTitle}</CardTitle>
          <CardDescription>{t.infoCardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">{t.fullName}</Label>
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground">
                  {t.saving}
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-600 font-medium">
                  {t.saved}
                </span>
              )}
            </div>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder={t.fullNamePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t.email}</Label>
            <Input
              value={profile?.email ?? ""}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">{t.emailHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t.memberSince}</Label>
            <Input
              value={
                profile
                  ? new Date(profile.created_at).toLocaleDateString(
                      t.dateLocale,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : ""
              }
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <PreferencesCard />

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {t.dangerTitle}
          </CardTitle>
          <CardDescription>{t.dangerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            {t.deleteAccount}
          </Button>
        </CardContent>
      </Card>

      {/* Confirm delete account */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmDeleteTitle}</DialogTitle>
            <DialogDescription>{t.confirmDeleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              {site.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? t.deleting : t.confirmDeleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
