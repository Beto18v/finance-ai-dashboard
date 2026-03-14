import { createClient } from "@/lib/supabase/client";

function getApiBaseUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return apiBaseUrl.replace(/\/+$/, "");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ApiError(401, "No active session");
  }
  return session.access_token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getAccessToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) message = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface Category {
  id: string;
  name: string;
  direction: "income" | "expense";
  parent_id: string | null;
}

export interface Transaction {
  id: string;
  category_id: string;
  amount: string;
  currency: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface BalanceMonth {
  month_start: string;
  income: string;
  expense: string;
  balance: string;
}

export interface BalanceOverview {
  current: BalanceMonth;
  series: BalanceMonth[];
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  healthz: () => request<{ status: string }>("/healthz", {}, false),

  getProfile: () => request<UserProfile>("/users/me"),

  bootstrapProfile: (body?: { name?: string }) =>
    request<UserProfile>("/users/me/bootstrap", {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  createProfile: (body: { name: string; email: string }) =>
    request<UserProfile>("/users/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProfile: (body: { name?: string }) =>
    request<UserProfile>("/users/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteAccount: () => request<void>("/users/me", { method: "DELETE" }),

  getCategories: () => request<Category[]>("/categories/"),

  createCategory: (body: {
    name: string;
    direction: "income" | "expense";
    parent_id?: string | null;
  }) =>
    request<Category>("/categories/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCategory: (
    id: string,
    body: {
      name?: string;
      direction?: "income" | "expense";
      parent_id?: string | null;
    },
  ) =>
    request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),

  getTransactions: (params?: {
    category_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category_id) qs.set("category_id", params.category_id);
    if (params?.start_date) qs.set("start_date", params.start_date);
    if (params?.end_date) qs.set("end_date", params.end_date);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<Transaction[]>(`/transactions/${query}`);
  },

  getMonthlyBalance: (params?: { year?: number; month?: number }) => {
    const qs = new URLSearchParams();
    if (params?.year != null) qs.set("year", String(params.year));
    if (params?.month != null) qs.set("month", String(params.month));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<BalanceOverview>(`/balance/monthly${query}`);
  },

  createTransaction: (body: {
    category_id: string;
    amount: string;
    currency: string;
    description?: string | null;
    occurred_at: string;
  }) =>
    request<Transaction>("/transactions/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTransaction: (
    id: string,
    body: {
      category_id?: string;
      amount?: string;
      currency?: string;
      description?: string | null;
      occurred_at?: string;
    },
  ) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),
};
