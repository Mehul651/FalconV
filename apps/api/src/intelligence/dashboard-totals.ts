import { isApprovedStatus, sumApprovedValues } from '@falconv/shared';

export function startOfUtcIsoWeek(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

export function lastNUtcWeekStarts(n: number, now = new Date()): string[] {
  const monday = startOfUtcIsoWeek(now);
  return Array.from({ length: n }, (_, index) => {
    const week = new Date(monday);
    week.setUTCDate(monday.getUTCDate() - (n - 1 - index) * 7);
    return week.toISOString().slice(0, 10);
  });
}

export function dashboardApprovedFinance(rows: {
  budgets: Array<{ status: string; amount: number }>;
  expenditures: Array<{ status: string; amount: number }>;
}) {
  return {
    approvedBudget: sumApprovedValues(
      rows.budgets.map((row) => ({ status: row.status, value: row.amount })),
    ),
    approvedSpend: sumApprovedValues(
      rows.expenditures.map((row) => ({ status: row.status, value: row.amount })),
    ),
    pendingSpendExcluded: rows.expenditures
      .filter((row) => !isApprovedStatus(row.status) && row.status !== 'REJECTED')
      .reduce((sum, row) => sum + row.amount, 0),
  };
}
