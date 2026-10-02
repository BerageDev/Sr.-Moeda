import * as XLSX from 'xlsx';
import {
  ParseResult,
  parseSpreadsheetWorkbook,
  parseSpreadsheetText,
  findBestSheet,
} from '../utils/spreadsheetParser';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
}

/**
 * Searches user's Google Drive for recent spreadsheets (Google Sheets, Excel, CSV)
 */
export async function listRecentDriveSpreadsheets(accessToken: string): Promise<DriveFileItem[]> {
  const query = [
    'trashed = false',
    "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'text/csv' or mimeType = 'application/vnd.ms-excel' or name contains 'controle' or name contains 'gasto' or name contains 'despesa' or name contains '.xlsx' or name contains '.xls' or name contains '.csv')",
  ].join(' and ');

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('pageSize', '30');
  url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, size, iconLink)');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao listar arquivos do Google Drive (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const files: DriveFileItem[] = data.files || [];

  // Sort prioritizing exact matches like "controle_de_gastos" or files with "gasto"
  return files.sort((a, b) => {
    const aIsControle = a.name.toLowerCase().includes('controle_de_gastos');
    const bIsControle = b.name.toLowerCase().includes('controle_de_gastos');
    if (aIsControle && !bIsControle) return -1;
    if (!aIsControle && bIsControle) return 1;
    return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
  });
}

/**
 * Fetches and parses a spreadsheet file from Google Drive into structured table rows,
 * targeting specifically a sheet like "Lançamentos"
 */
export async function fetchDriveSpreadsheetData(
  fileId: string,
  mimeType: string,
  fileName: string,
  accessToken: string,
  preferredSheet = 'Lançamentos'
): Promise<ParseResult> {
  // If it's a native Google Sheets document
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    try {
      // 1. Fetch spreadsheet metadata to get all sheet names
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title || '');
        const targetSheet = findBestSheet(sheetTitles, preferredSheet);

        // 2. Fetch all values from that specific sheet
        const valRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(targetSheet)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (valRes.ok) {
          const valData = await valRes.json();
          const rows: any[][] = valData.values || [];
          // Build XLSX worksheet
          const ws = XLSX.utils.aoa_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, targetSheet);
          return parseSpreadsheetWorkbook(wb, fileName, targetSheet);
        }
      }
    } catch (e) {
      console.warn('Sheets API direct query failed, falling back to export CSV:', e);
    }

    // Fallback: Export CSV directly
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Falha ao exportar Google Sheets como CSV (${res.status})`);
    }

    const csvText = await res.text();
    return parseSpreadsheetText(csvText, preferredSheet);
  }

  // Otherwise, it's an uploaded file (like .xlsx / controle_de_gastos-5.xlsx)
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo do Google Drive (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  // Parse targeting the preferred sheet (e.g. "Lançamentos")
  return parseSpreadsheetWorkbook(workbook, fileName, preferredSheet);
}

/**
 * Returns available sheet tabs for a Drive file if it's an Excel or Sheets file
 */
export async function getDriveFileSheets(
  fileId: string,
  mimeType: string,
  accessToken: string
): Promise<string[]> {
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      return (meta.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);
    }
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true });
    return workbook.SheetNames || [];
  }

  return ['Lançamentos'];
}
