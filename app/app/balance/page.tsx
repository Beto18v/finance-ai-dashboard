"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError, type BalanceOverview } from "@/lib/api";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const monthFormatters = {
  es: new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }),
  en: new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }),
};

export default function BalancePage() {
  const { site } = useSitePreferences();
  const t = site.pages.balance;
  const [overview, setOverview] = useState<BalanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  const loadBalance = useCallback(
    async (params?: { year?: number; month?: number }) => {
      setLoading(true);
      try {
        const data = await api.getMonthlyBalance(params);
        setOverview(data);
        setSelectedMonth(data.current.month_start.slice(0, 7));
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error(site.common.unexpectedError);
      } finally {
        setLoading(false);
      }
    },
    [site.common.unexpectedError],
  );

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const current = overview?.current;
  const history = overview?.series ?? [];
  const monthHeadingDate =
    current?.month_start ?? `${selectedMonth || getCurrentMonthValue()}-01`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
          <p className="mt-3 text-lg font-semibold text-foreground">
            {t.heading(
              formatMonthLabel(monthHeadingDate, site.metadata.htmlLang),
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.latestMonthHint}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="balance-month">
              {t.monthLabel}
            </label>
            <Input
              id="balance-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMonth(value);
                const [year, month] = value.split("-").map(Number);
                if (year && month) {
                  loadBalance({ year, month });
                }
              }}
              className="w-44"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              if (!selectedMonth) {
                loadBalance();
                return;
              }

              const [year, month] = selectedMonth.split("-").map(Number);
              loadBalance(year && month ? { year, month } : undefined);
            }}
            disabled={loading}
          >
            {site.common.refresh}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t.heading(
              formatMonthLabel(monthHeadingDate, site.metadata.htmlLang),
            )}
          </CardTitle>
          <CardDescription>{t.currentCardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <BalanceStatCard
              label={site.common.income}
              value={formatMoney(current?.income ?? "0")}
              tone="emerald"
            />
            <BalanceStatCard
              label={site.common.expense}
              value={formatMoney(current?.expense ?? "0")}
              tone="rose"
            />
            <BalanceStatCard
              label={t.title}
              value={formatMoney(current?.balance ?? "0")}
              tone="sky"
            />
          </div>
          {current &&
            current.income === "0.00" &&
            current.expense === "0.00" &&
            current.balance === "0.00" && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t.selectedMonthEmpty}
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.historyTitle}</CardTitle>
          <CardDescription>{t.historyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t.monthLabel}</TableHead>
                  <TableHead>{site.common.income}</TableHead>
                  <TableHead>{site.common.expense}</TableHead>
                  <TableHead>{t.title}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {site.common.loading}
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t.noHistory}
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow
                      key={item.month_start}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium">
                        {formatMonthLabel(
                          item.month_start,
                          site.metadata.htmlLang,
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-emerald-700">
                        {formatMoney(item.income)}
                      </TableCell>
                      <TableCell className="font-mono text-rose-700">
                        {formatMoney(item.expense)}
                      </TableCell>
                      <TableCell className="font-mono text-sky-700">
                        {formatMoney(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "sky";
}) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value || 0));
}

function formatMonthLabel(value: string, locale: string) {
  return (locale === "es" ? monthFormatters.es : monthFormatters.en).format(
    new Date(`${value}T00:00:00`),
  );
}

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}
