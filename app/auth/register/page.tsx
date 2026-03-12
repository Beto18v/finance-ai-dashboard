"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/providers/auth-provider";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import { getSiteText } from "@/lib/site";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";

const schemaText = getSiteText().auth.register;

const schema = z
  .object({
    name: z.string().min(1, schemaText.validations.nameRequired),
    email: z.string().email(schemaText.validations.invalidEmail),
    password: z.string().min(8, schemaText.validations.passwordMin),
    confirmPassword: z.string().min(1, schemaText.validations.confirmRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: schemaText.validations.passwordsDontMatch,
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const { site } = useSitePreferences();
  const t = site.auth.register;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const bootstrapProfile = useCallback(
    async (values: { name: string; email: string }) => {
      try {
        await api.createProfile({ name: values.name, email: values.email });
        toast.success(t.profileCreatedToast);
        router.replace("/app/balance");
        return true;
      } catch (err) {
        // If profile already exists, continue to dashboard.
        if (err instanceof ApiError && err.status === 409) {
          router.replace("/app/balance");
          return true;
        }
        toast.error(
          err instanceof ApiError ? err.message : site.common.unexpectedError,
        );
        return false;
      }
    },
    [router, t.profileCreatedToast, site.common.unexpectedError],
  );

  useEffect(() => {
    if (!loading && session) {
      api
        .getProfile()
        .then(() => router.replace("/app/balance"))
        .catch(async (err) => {
          if (err instanceof ApiError && err.status === 404) {
            const bootstrapName =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              "User";
            const bootstrapEmail = session.user.email;

            if (bootstrapEmail) {
              const ok = await bootstrapProfile({
                name: bootstrapName,
                email: bootstrapEmail,
              });
              if (!ok) await createClient().auth.signOut();
              return;
            }
          }

          if (err instanceof ApiError) toast.error(err.message);
          else toast.error(site.common.unexpectedError);
          await createClient().auth.signOut();
        });
    }
  }, [session, loading, router, bootstrapProfile, site.common.unexpectedError]);

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.name },
      },
    });

    if (error) {
      const alreadyRegistered =
        /already registered|already exists|user exists/i.test(error.message);

      if (!alreadyRegistered) {
        toast.error(error.message);
        return;
      }

      const signIn = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signIn.error) {
        toast.error(signIn.error.message);
        return;
      }

      if (!(await bootstrapProfile(values))) {
        await supabase.auth.signOut();
      }
      return;
    }

    // If session is already available, bootstrap and continue directly.
    if (data.session) {
      if (!(await bootstrapProfile(values))) {
        await supabase.auth.signOut();
      }
      return;
    }

    // Fallback: try immediate login to avoid email-confirm required UX.
    const signIn = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (!signIn.error) {
      if (!(await bootstrapProfile(values))) {
        await supabase.auth.signOut();
      }
      return;
    }

    toast.error(signIn.error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image
            src="/logo_Dinerance-removebg.png"
            alt="Dinerance Logo"
            width={100}
            height={100}
            className="mx-auto"
          />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" type="text" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">{t.password}</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t.submitting : t.submit}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.hasAccount}{" "}
              <Link href="/auth/login" className="underline">
                {t.signIn}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
