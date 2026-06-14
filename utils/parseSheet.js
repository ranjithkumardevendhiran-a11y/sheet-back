import XLSX from 'xlsx';

export function parseWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!data.length) {
    throw new Error('The uploaded file is empty');
  }

  const [headerRow, ...bodyRows] = data;
  const headers = headerRow.map((cell, index) => {
    const value = String(cell ?? '').trim();
    return value || `Column ${index + 1}`;
  });

  const rows = bodyRows
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => headers.map((_, index) => row[index] ?? ''));

  return { headers, rows };
}

export function extractGoogleSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
