import { google } from 'googleapis';
import { extractGoogleSheetId } from './parseSheet.js';

function getSheetsClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured on the server');
  }
  return google.sheets({ version: 'v4', auth: apiKey });
}

export async function fetchGoogleSheetData(url) {
  const sheetId = extractGoogleSheetId(url);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1',
  });

  const values = response.data.values || [];
  if (!values.length) {
    throw new Error('Google Sheet is empty');
  }

  const [headerRow, ...bodyRows] = values;
  const headers = headerRow.map((cell, index) => {
    const value = String(cell ?? '').trim();
    return value || `Column ${index + 1}`;
  });

  const rows = bodyRows.map((row) => headers.map((_, index) => row[index] ?? ''));

  return { sheetId, headers, rows };
}
