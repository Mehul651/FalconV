import { canTransitionCapa, canTransitionRisk, sumApprovedValues } from '@falconv/shared';
import { dashboardApprovedFinance, lastNUtcWeekStarts, startOfUtcIsoWeek } from './dashboard-totals';

describe('executive dashboard approved totals', () => {
  it('does not let pending KPI or expenditure imports change dashboard finance totals', () => {
    const published = {
      budgets: [{ status: 'APPROVED', amount: 1000 }],
      expenditures: [{ status: 'APPROVED', amount: 200 }],
    };
    const withPendingImport = {
      budgets: [...published.budgets, { status: 'PENDING_APPROVAL', amount: 50_000 }],
      expenditures: [...published.expenditures, { status: 'PENDING_APPROVAL', amount: 9_999 }],
    };
    expect(dashboardApprovedFinance(published)).toEqual({
      approvedBudget: 1000,
      approvedSpend: 200,
      pendingSpendExcluded: 0,
    });
    expect(dashboardApprovedFinance(withPendingImport).approvedBudget).toBe(1000);
    expect(dashboardApprovedFinance(withPendingImport).approvedSpend).toBe(200);
    expect(dashboardApprovedFinance(withPendingImport).pendingSpendExcluded).toBe(9_999);
    expect(sumApprovedValues([{ status: 'APPROVED', value: 12 }, { status: 'DRAFT', value: 400 }])).toBe(12);
  });
});

describe('12-week snapshot buckets', () => {
  it('returns 12 Monday week starts ending on the current UTC week', () => {
    const now = new Date('2026-10-18T12:00:00.000Z');
    const weeks = lastNUtcWeekStarts(12, now);
    expect(weeks).toHaveLength(12);
    expect(weeks[weeks.length - 1]).toBe(startOfUtcIsoWeek(now).toISOString().slice(0, 10));
    expect(weeks[0]).toBe('2026-07-27');
  });

  it('returns 4 Monday week starts for the overview spend strip', () => {
    const now = new Date('2026-10-18T12:00:00.000Z');
    const weeks = lastNUtcWeekStarts(4, now);
    expect(weeks).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
  });
});

describe('risk and CAPA transitions', () => {
  it('enforces OPEN → MITIGATING → CLOSED for risks', () => {
    expect(canTransitionRisk('OPEN', 'CLOSED')).toBe(false);
    expect(canTransitionRisk('OPEN', 'MITIGATING')).toBe(true);
    expect(canTransitionRisk('MITIGATING', 'CLOSED')).toBe(true);
  });

  it('requires IN_PROGRESS before CAPA verification', () => {
    expect(canTransitionCapa('OPEN', 'VERIFIED')).toBe(false);
    expect(canTransitionCapa('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionCapa('IN_PROGRESS', 'VERIFIED')).toBe(true);
  });
});
