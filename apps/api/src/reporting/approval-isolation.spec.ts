import {
  parseExpenditureImportRow,
  parseKpiImportRow,
  sumApprovedValues,
} from '@falconv/shared';

describe('approved totals isolation', () => {
  it('excludes draft and pending KPI/expenditure amounts from approved totals', () => {
    const rows = [
      { status: 'APPROVED', value: 100 },
      { status: 'PENDING_APPROVAL', value: 9999 },
      { status: 'DRAFT', value: 50 },
      { status: 'REJECTED', value: 25 },
    ];
    expect(sumApprovedValues(rows)).toBe(100);
  });

  it('does not let a pending import row change the approved total', () => {
    const published = [{ status: 'APPROVED', value: 10 }];
    const withPendingImport = [...published, { status: 'PENDING_APPROVAL', value: 500 }];
    expect(sumApprovedValues(published)).toBe(10);
    expect(sumApprovedValues(withPendingImport)).toBe(10);
  });
});

describe('import row parsing', () => {
  it('accepts a valid KPI row', () => {
    expect(
      parseKpiImportRow({
        rowNumber: 2,
        code: 'utilization_pct',
        period: '2026-10',
        value: '82.5',
      }),
    ).toMatchObject({ code: 'UTILIZATION_PCT', period: '2026-10', amount: 82.5 });
  });

  it('rejects a KPI row that would be unsafe to publish', () => {
    expect(parseKpiImportRow({ rowNumber: 2, code: 'X', period: 'October', value: 'nope' }).error).toBeTruthy();
  });

  it('rejects expenditure rows without an amount', () => {
    expect(
      parseExpenditureImportRow({
        rowNumber: 2,
        date: '2026-10-01',
        amount: '',
        category: 'Travel',
        description: 'Flight',
      }).error,
    ).toBeTruthy();
  });
});
