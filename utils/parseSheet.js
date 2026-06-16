import XLSX from 'xlsx';

function normalizeRgbColor(rgb) {
  if (!rgb) return null;
  if (typeof rgb !== 'string') return null;
  const value = rgb.trim();
  if (value.length === 6) {
    return `#${value}`;
  }
  if (value.length === 8) {
    return `#${value.slice(2)}`;
  }
  return null;
}

function styleFromCell(cell) {
  if (!cell?.s) return {};
  const style = {};
  const { s } = cell;

  if (s.fill?.patternType === 'solid' && s.fill.fgColor) {
    const backgroundColor = normalizeRgbColor(s.fill.fgColor.rgb || s.fill.fgColor.theme);
    if (backgroundColor) style.backgroundColor = backgroundColor;
  }

  if (s.font?.color) {
    const color = normalizeRgbColor(s.font.color.rgb || s.font.color.theme);
    if (color) style.color = color;
    if (s.font.bold) style.fontWeight = 'bold';
    if (s.font.italic) style.fontStyle = 'italic';
  }

  if (s.alignment?.horizontal) {
    style.textAlign = s.alignment.horizontal;
  }

  if (s.alignment?.vertical) {
    style.verticalAlign = s.alignment.vertical;
  }

  return style;
}

export function parseWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellStyles: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet || !worksheet['!ref']) {
    throw new Error('The uploaded file is empty');
  }

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const headers = [];
  const headerStyles = [];
  const rows = [];
  const rowStyles = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const rowValues = [];
    const rowStyleValues = [];

    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = worksheet[cellAddress];
      const value = cell ? (cell.w ?? cell.v ?? '') : '';
      rowValues.push(value == null ? '' : String(value));
      rowStyleValues.push(styleFromCell(cell));
    }

    if (rowIndex === range.s.r) {
      rowValues.forEach((cellValue, colIndex) => {
        const value = String(cellValue ?? '').trim();
        headers.push(value || `Column ${colIndex + 1}`);
        headerStyles.push(rowStyleValues[colIndex] || {});
      });
      continue;
    }

    if (rowValues.some((cellValue) => String(cellValue ?? '').trim() !== '')) {
      rows.push(rowValues);
      rowStyles.push(rowStyleValues);
    }
  }

  return { headers, headerStyles, rows, rowStyles };
}

export function extractGoogleSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
