"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { api, ApiError, type Category } from "@/lib/api";
import { getCache, setCache } from "@/lib/cache";
import { useSitePreferences } from "@/components/providers/site-preferences-provider";
import { getSiteText } from "@/lib/site";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CACHE_KEY = "cache:categories";
const schemaText = getSiteText().pages.categories;

const schema = z.object({
  name: z.string().min(1, schemaText.validations.nameRequired),
  direction: z.enum(["income", "expense"]),
  parent_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CategoriesPage() {
  const { site } = useSitePreferences();
  const t = site.pages.categories;
  const [categories, setCategories] = useState<Category[]>(
    () => getCache<Category[]>(CACHE_KEY) ?? [],
  );
  const [listLoading, setListLoading] = useState(
    () => !getCache<Category[]>(CACHE_KEY),
  );

  // Editing / deleting
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [filterDirection, setFilterDirection] = useState<string>("");
  const [filterNameId, setFilterNameId] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { direction: "expense" },
  });

  const directionValue = watch("direction");
  const parentIdValue = watch("parent_id");

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitting: editIsSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const editDirectionValue = watchEdit("direction");
  const editParentIdValue = watchEdit("parent_id");

  const loadCategories = useCallback(
    async (silent = false) => {
      if (!silent) setListLoading(true);
      try {
        const data = await api.getCategories();
        setCategories(data);
        setCache(CACHE_KEY, data);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error(t.failedLoad);
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [t.failedLoad],
  );

  useEffect(() => {
    loadCategories(!!getCache(CACHE_KEY));
  }, [loadCategories]);

  async function onSubmit(values: FormValues) {
    try {
      await api.createCategory({
        name: values.name,
        direction: values.direction,
        parent_id: values.parent_id || null,
      });
      toast.success(t.created);
      reset({ direction: "expense" });
      loadCategories(true);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(t.failedCreate);
    }
  }

  function openEditDialog(cat: Category) {
    setEditingCat(cat);
    resetEdit({
      name: cat.name,
      direction: cat.direction,
      parent_id: cat.parent_id ?? "__none__",
    });
  }

  async function onEditSubmit(values: FormValues) {
    if (!editingCat) return;
    try {
      await api.updateCategory(editingCat.id, {
        name: values.name,
        direction: values.direction,
        parent_id:
          values.parent_id === "__none__" ? null : values.parent_id || null,
      });
      toast.success(t.updated);
      setEditingCat(null);
      loadCategories(true);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(t.failedUpdate);
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteCat) return;
    setDeletingId(confirmDeleteCat.id);
    setConfirmDeleteCat(null);
    try {
      await api.deleteCategory(confirmDeleteCat.id);
      toast.success(t.deleted);
      loadCategories(true);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(t.failedDelete);
    } finally {
      setDeletingId(null);
    }
  }

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  function getParentName(id: string | null) {
    if (!id) return site.common.dash;
    return categoryMap.get(id)?.name ?? site.common.dash;
  }

  // Derived: filtered view
  const visibleCategories = categories.filter((c) => {
    if (filterDirection && c.direction !== filterDirection) return false;
    if (filterNameId && c.id !== filterNameId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.newCardTitle}</CardTitle>
          <CardDescription>{t.newCardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.name}</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder={t.namePlaceholder}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t.direction}</Label>
                <Select
                  value={directionValue}
                  onValueChange={(v) =>
                    setValue("direction", v as "income" | "expense")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{site.common.income}</SelectItem>
                    <SelectItem value="expense">
                      {site.common.expense}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.parentOptional}</Label>
                <Select
                  value={parentIdValue ?? "__none__"}
                  onValueChange={(v) =>
                    setValue("parent_id", v === "__none__" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={site.common.none} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{site.common.none}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.creating : t.create}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Filters */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">{t.filters}</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>{t.direction}</Label>
            <Select
              value={filterDirection || "__all__"}
              onValueChange={(v) =>
                setFilterDirection(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={site.common.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{site.common.all}</SelectItem>
                <SelectItem value="income">{site.common.income}</SelectItem>
                <SelectItem value="expense">{site.common.expense}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{site.common.category}</Label>
            <Select
              value={filterNameId || "__all__"}
              onValueChange={(v) => setFilterNameId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={site.common.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{site.common.all}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filterDirection || filterNameId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterDirection("");
                setFilterNameId("");
              }}
            >
              {site.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            {t.listTitle}
            {visibleCategories.length !== categories.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t.ofTotal(visibleCategories.length, categories.length)}
              </span>
            )}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCategories(false)}
            disabled={listLoading}
          >
            {site.common.refresh}
          </Button>
        </div>

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.direction}</TableHead>
                <TableHead>{t.parentOptional}</TableHead>
                <TableHead className="text-right">
                  {site.common.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t.loading}
                  </TableCell>
                </TableRow>
              ) : visibleCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t.empty}
                  </TableCell>
                </TableRow>
              ) : (
                visibleCategories.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {c.direction === "income" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {site.common.income}
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                          {site.common.expense}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getParentName(c.parent_id)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(c)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title={site.common.edit}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(c)}
                          disabled={deletingId === c.id}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-40"
                          title={site.common.delete}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editingCat}
        onOpenChange={(o) => !o && setEditingCat(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_name">{t.name}</Label>
              <Input id="edit_name" {...registerEdit("name")} />
              {editErrors.name && (
                <p className="text-sm text-destructive">
                  {editErrors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t.direction}</Label>
              <Select
                value={editDirectionValue}
                onValueChange={(v) =>
                  setEditValue("direction", v as "income" | "expense")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{site.common.income}</SelectItem>
                  <SelectItem value="expense">{site.common.expense}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t.parentOptional}</Label>
              <Select
                value={editParentIdValue ?? "__none__"}
                onValueChange={(v) =>
                  setEditValue("parent_id", v === "__none__" ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={site.common.none} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{site.common.none}</SelectItem>
                  {categories
                    .filter((c) => c.id !== editingCat?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingCat(null)}
              >
                {site.common.cancel}
              </Button>
              <Button type="submit" disabled={editIsSubmitting}>
                {editIsSubmitting ? t.saving : t.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog
        open={!!confirmDeleteCat}
        onOpenChange={(o) => !o && setConfirmDeleteCat(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>
              {t.deleteDescription(confirmDeleteCat?.name ?? "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCat(null)}>
              {site.common.cancel}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {site.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
