import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BalancePage from "./page";
import { getSiteText } from "@/lib/site";

const { getMonthlyBalanceMock, toastErrorMock } = vi.hoisted(() => ({
  getMonthlyBalanceMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  api: {
    getMonthlyBalance: getMonthlyBalanceMock,
  },
}));

vi.mock("@/components/providers/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    site: getSiteText("es"),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

describe("BalancePage", () => {
  beforeEach(() => {
    getMonthlyBalanceMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("loads and renders the current balance overview", async () => {
    getMonthlyBalanceMock.mockResolvedValue({
      current: {
        month_start: "2026-03-01",
        income: "2500000.00",
        expense: "1200000.00",
        balance: "1300000.00",
      },
      series: [
        {
          month_start: "2026-03-01",
          income: "2500000.00",
          expense: "1200000.00",
          balance: "1300000.00",
        },
      ],
    });

    render(<BalancePage />);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();

    await waitFor(() => {
      expect(getMonthlyBalanceMock).toHaveBeenCalledWith(undefined);
    });

    expect(
      await screen.findAllByText(/Resumen financiero - marzo de 2026/i),
    ).toHaveLength(2);
    expect(screen.getAllByText(/\$\s?2\.500\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$\s?1\.200\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$\s?1\.300\.000/).length).toBeGreaterThan(0);
  });

  it("refetches balance when the selected month changes", async () => {
    getMonthlyBalanceMock
      .mockResolvedValueOnce({
        current: {
          month_start: "2026-03-01",
          income: "2500000.00",
          expense: "1200000.00",
          balance: "1300000.00",
        },
        series: [],
      })
      .mockResolvedValueOnce({
        current: {
          month_start: "2026-02-01",
          income: "2000000.00",
          expense: "800000.00",
          balance: "1200000.00",
        },
        series: [],
      });

    render(<BalancePage />);

    const monthInput = await screen.findByLabelText("Mes");
    fireEvent.change(monthInput, { target: { value: "2026-02" } });

    await waitFor(() => {
      expect(getMonthlyBalanceMock).toHaveBeenNthCalledWith(2, {
        year: 2026,
        month: 2,
      });
    });

    expect(screen.getByDisplayValue("2026-02")).toBeInTheDocument();
  });
});
