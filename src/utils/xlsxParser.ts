import * as XLSX from 'xlsx';
import { RawCategoryRow } from './csvParser';

export function parseXlsxBuffer(buffer: Buffer): RawCategoryRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row) => {
    const normalizedRow: RawCategoryRow = {};
    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^\w]/g, '');
      normalizedRow[normalizedKey] = typeof val === 'string' ? val.trim() : val;
    }
    return normalizedRow;
  });
}
