import ExcelJS from 'exceljs';
import {
  parseExpenditureImportRow,
  parseKpiImportRow,
  type ImportKind,
  type ParsedImportLine,
} from '@falconv/shared';

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && 'text' in value) {
    return String(value.text ?? '').trim();
  }
  if (typeof value === 'object' && 'result' in value) {
    return String((value as { result?: unknown }).result ?? '').trim();
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

export async function parseImportWorkbook(kind: ImportKind, buffer: Buffer): Promise<ParsedImportLine[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return [{ rowNumber: 1, error: 'Workbook has no sheets' }];
  }
  const header = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((cell) => cellText(cell).toLowerCase());
  const index = (name: string) => header.findIndex((item) => item === name || item.replaceAll(' ', '') === name);

  const lines: ParsedImportLine[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
    if (kind === 'KPI') {
      lines.push(
        parseKpiImportRow({
          rowNumber,
          code: values[index('code')] ?? values[0],
          period: values[index('period')] ?? values[1],
          value: values[index('value')] ?? values[2],
          notes: values[index('notes')] ?? values[3],
        }),
      );
      return;
    }
    lines.push(
      parseExpenditureImportRow({
        rowNumber,
        date: values[index('date')] ?? values[0],
        amount: values[index('amount')] ?? values[1],
        currency: values[index('currency')] ?? values[2],
        category: values[index('category')] ?? values[3],
        description: values[index('description')] ?? values[4],
        projectNumber: values[index('projectnumber')] ?? values[5],
      }),
    );
  });
  return lines;
}

export async function buildImportTemplate(kind: ImportKind): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(kind === 'KPI' ? 'KPI' : 'Expenditure');
  if (kind === 'KPI') {
    sheet.addRow(['code', 'period', 'value', 'notes']);
    sheet.addRow(['UTILIZATION_PCT', '2026-10', '82.5', 'example row — replace before import']);
  } else {
    sheet.addRow(['date', 'amount', 'currency', 'category', 'description', 'projectNumber']);
    sheet.addRow(['2026-10-01', '1500.00', 'USD', 'Travel', 'example row — replace before import', '']);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
