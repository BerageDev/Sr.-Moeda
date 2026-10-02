import * as XLSX from 'xlsx';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/expense';

export interface ParsedSpreadsheetRow {
  id: string;
  originalRow: Record<string, any>;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  isValid: boolean;
  validationError?: string;
  selected: boolean;
}

export interface ParseResult {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  totalRows: number;
  validRows: number;
  rows: ParsedSpreadsheetRow[];
  headers: string[];
  detectedColumns: {
    amountCol?: string;
    descriptionCol?: string;
    dateCol?: string;
    categoryCol?: string;
    paymentCol?: string;
  };
}

export function findBestSheet(sheetNames: string[], requested?: string): string {
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  if (requested) {
    const match = sheetNames.find((s) => norm(s) === norm(requested) || norm(s).includes(norm(requested)));
    if (match) return match;
  }

  // Priority keywords for expense tabs in PT-BR (e.g. "Lançamentos")
  const priorityKeywords = [
    'lancamento',
    'lancamentos',
    'lançamento',
    'lançamentos',
    'gasto',
    'gastos',
    'despesa',
    'despesas',
    'extrato',
    'transacao',
    'transacoes',
    'movimentacao',
    'movimentacoes',
  ];

  for (const kw of priorityKeywords) {
    const match = sheetNames.find((s) => norm(s).includes(norm(kw)));
    if (match) return match;
  }

  return sheetNames[0] || 'Sheet1';
}

/**
 * Parses file (Excel .xlsx, .xls, .csv, .tsv) with sheet preference support
 */
export async function parseSpreadsheetFile(file: File, preferredSheet?: string): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  return parseSpreadsheetWorkbook(workbook, file.name, preferredSheet);
}

/**
 * Parses an XLSX.WorkBook instance with smart sheet & header detection
 */
export function parseSpreadsheetWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  preferredSheet?: string
): ParseResult {
  const sheetNames = workbook.SheetNames || ['Sheet1'];
  const targetSheetName = findBestSheet(sheetNames, preferredSheet);
  const worksheet = workbook.Sheets[targetSheetName];

  return processWorksheet(worksheet, fileName, sheetNames, targetSheetName);
}

/**
 * Parses pasted raw text (CSV, TSV, or tab-delimited copied from Excel)
 */
export function parseSpreadsheetText(rawText: string, preferredSheet?: string): ParseResult {
  const workbook = XLSX.read(rawText, { type: 'string' });
  const sheetNames = workbook.SheetNames || ['Sheet1'];
  const targetSheetName = findBestSheet(sheetNames, preferredSheet);
  const worksheet = workbook.Sheets[targetSheetName];

  return processWorksheet(worksheet, 'Texto Colado.csv', sheetNames, targetSheetName);
}

/**
 * Robust worksheet processor with multi-row title banner detection
 */
function processWorksheet(
  worksheet: XLSX.WorkSheet | undefined,
  fileName: string,
  sheetNames: string[],
  selectedSheet: string
): ParseResult {
  if (!worksheet) {
    return {
      fileName,
      sheetNames,
      selectedSheet,
      totalRows: 0,
      validRows: 0,
      rows: [],
      headers: [],
      detectedColumns: {},
    };
  }

  // 1. Convert to raw 2D array to find actual header row if row 0 has a title banner
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return {
      fileName,
      sheetNames,
      selectedSheet,
      totalRows: 0,
      validRows: 0,
      rows: [],
      headers: [],
      detectedColumns: {},
    };
  }

  // Find header row index
  let headerRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    for (const cell of row) {
      const str = String(cell || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (str.includes('valor') || str.includes('amount') || str.includes('preco') || str.includes('custo') || str.includes('r$') || str.includes('saida')) score += 3;
      if (str.includes('data') || str.includes('date') || str.includes('dia') || str.includes('vencimento')) score += 3;
      if (str.includes('desc') || str.includes('historico') || str.includes('item') || str.includes('detalhe')) score += 2;
      if (str.includes('categoria') || str.includes('tipo') || str.includes('classificacao')) score += 2;
      if (str.includes('pagamento') || str.includes('forma') || str.includes('metodo') || str.includes('cartao')) score += 2;
    }

    if (score > maxScore && score >= 3) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  // Extract headers
  const headerCells: any[] = rawRows[headerRowIndex] || [];
  const headers = headerCells.map((c, i) => String(c || '').trim() || `Coluna_${i + 1}`);
  const detected = detectColumns(headers);

  // Convert subsequent rows to objects
  const dataRows = rawRows.slice(headerRowIndex + 1);
  const todayStr = new Date().toISOString().split('T')[0];

  const rows: ParsedSpreadsheetRow[] = [];

  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip completely empty rows
    }

    // Build row record
    const rowRecord: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowRecord[h] = row[colIdx];
    });

    let rawAmount = detected.amountCol ? rowRecord[detected.amountCol] : findAmountInRow(rowRecord);
    let rawDate = detected.dateCol ? rowRecord[detected.dateCol] : findDateInRow(rowRecord);
    let rawDesc = detected.descriptionCol ? rowRecord[detected.descriptionCol] : findDescInRow(rowRecord);
    let rawCat = detected.categoryCol ? rowRecord[detected.categoryCol] : '';
    let rawPay = detected.paymentCol ? rowRecord[detected.paymentCol] : '';

    const parsedAmount = parseCurrencyValue(rawAmount);
    const parsedDate = parseDateValue(rawDate, todayStr);
    const cleanDesc = String(rawDesc || '').trim() || `Lançamento ${index + 1}`;
    const cleanCat = normalizeCategory(rawCat, cleanDesc);
    const cleanPay = normalizePaymentMethod(rawPay);

    const isValid = parsedAmount > 0;
    let validationError = '';
    if (parsedAmount <= 0) {
      validationError = 'Valor monetário inválido ou zerado';
    }

    // Ignore typical non-expense summary/footer rows like "TOTAL", "SALDO FINAL", etc.
    const upperDesc = cleanDesc.toUpperCase();
    if (
      upperDesc.includes('TOTAL') ||
      upperDesc.includes('SUBTOTAL') ||
      upperDesc.includes('SALDO') ||
      upperDesc.includes('SOMA') ||
      upperDesc.includes('RESUMO') ||
      upperDesc.includes('FECHAMENTO')
    ) {
      continue;
    }

    rows.push({
      id: `row-${index}-${Date.now()}`,
      originalRow: rowRecord,
      amount: parsedAmount,
      description: cleanDesc,
      category: cleanCat,
      date: parsedDate,
      paymentMethod: cleanPay,
      isValid,
      validationError,
      selected: isValid,
    });
  }

  const validRows = rows.filter((r) => r.isValid).length;

  return {
    fileName,
    sheetNames,
    selectedSheet,
    totalRows: rows.length,
    validRows,
    rows,
    headers,
    detectedColumns: detected,
  };
}

function detectColumns(headers: string[]) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  let amountCol: string | undefined;
  let descriptionCol: string | undefined;
  let dateCol: string | undefined;
  let categoryCol: string | undefined;
  let paymentCol: string | undefined;

  for (const h of headers) {
    const key = norm(h);
    if (!amountCol && (key.includes('valor') || key.includes('amount') || key.includes('preco') || key.includes('custo') || key.includes('gasto') || key.includes('total') || key.includes('saida') || key.includes('debito'))) {
      amountCol = h;
    } else if (!dateCol && (key.includes('data') || key.includes('date') || key.includes('dia') || key.includes('vencimento') || key.includes('dt'))) {
      dateCol = h;
    } else if (!categoryCol && (key.includes('categoria') || key.includes('category') || key.includes('tipo') || key.includes('classificacao') || key.includes('subcategoria'))) {
      categoryCol = h;
    } else if (!paymentCol && (key.includes('pagamento') || key.includes('forma') || key.includes('metodo') || key.includes('meio') || key.includes('cartao') || key.includes('conta'))) {
      paymentCol = h;
    } else if (!descriptionCol && (key.includes('desc') || key.includes('historico') || key.includes('item') || key.includes('nome') || key.includes('estabelecimento') || key.includes('detalhe') || key.includes('titulo') || key.includes('lancamento'))) {
      descriptionCol = h;
    }
  }

  // Fallbacks if not exact
  if (!descriptionCol && headers.length > 0) {
    descriptionCol = headers.find((h) => h !== amountCol && h !== dateCol && h !== categoryCol && h !== paymentCol);
  }

  return { amountCol, descriptionCol, dateCol, categoryCol, paymentCol };
}

function findAmountInRow(row: Record<string, any>): any {
  for (const val of Object.values(row)) {
    if (typeof val === 'number' && val > 0) return val;
    if (typeof val === 'string' && /r\$|[$€£]/i.test(val)) return val;
  }
  return 0;
}

function findDateInRow(row: Record<string, any>): any {
  for (const val of Object.values(row)) {
    if (val instanceof Date) return val;
    if (typeof val === 'string' && /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(val)) return val;
  }
  return '';
}

function findDescInRow(row: Record<string, any>): any {
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === 'string' && val.length > 2 && isNaN(Number(val))) {
      return val;
    }
  }
  return '';
}

export function parseCurrencyValue(raw: any): number {
  if (typeof raw === 'number') {
    return Math.abs(raw);
  }
  if (!raw) return 0;

  let str = String(raw).trim();
  str = str.replace(/[R$€£]/gi, '').trim();

  // If Brazilian format like 1.234,56
  if (/\d+\.\d{3},\d{2}/.test(str) || (str.includes(',') && !str.includes('.'))) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

export function parseDateValue(raw: any, fallbackToday: string): string {
  if (!raw) return fallbackToday;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split('T')[0];
  }

  const str = String(raw).trim();

  // Excel numeric date (e.g. 45200)
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // DD/MM (without year, e.g. 26/09 or 26/10)
  const dayMonthMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dayMonthMatch) {
    const day = dayMonthMatch[1].padStart(2, '0');
    const month = dayMonthMatch[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month}-${day}`;
  }

  // Day only (e.g. "26" or "dia 26")
  const dayOnlyMatch = str.match(/^(?:dia\s*)?(\d{1,2})(?:º)?$/i);
  if (dayOnlyMatch) {
    const dayNum = parseInt(dayOnlyMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      const now = new Date();
      const day = String(dayNum).padStart(2, '0');
      let m = now.getMonth() + 1;
      let y = now.getFullYear();
      if (dayNum > now.getDate()) {
        m = m - 1;
        if (m === 0) {
          m = 12;
          y = y - 1;
        }
      }
      return `${y}-${String(m).padStart(2, '0')}-${day}`;
    }
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return fallbackToday;
}

export function normalizeCategory(catRaw: string, descRaw: string): ExpenseCategory {
  const normCat = (catRaw || '').toLowerCase();
  const normDesc = (descRaw || '').toLowerCase();

  const text = `${normCat} ${normDesc}`;

  if (text.includes('aliment') || text.includes('restaurante') || text.includes('almoço') || text.includes('almoco') || text.includes('jantar') || text.includes('lanche') || text.includes('cafe') || text.includes('café') || text.includes('padaria') || text.includes('mercado') || text.includes('supermercado') || text.includes('ifood') || text.includes('rappi') || text.includes('acougue') || text.includes('açougue') || text.includes('hortifruti')) {
    return 'Alimentação';
  }
  if (text.includes('transport') || text.includes('uber') || text.includes('99') || text.includes('gasolina') || text.includes('combustivel') || text.includes('combustível') || text.includes('onibus') || text.includes('ônibus') || text.includes('metro') || text.includes('metrô') || text.includes('posto') || text.includes('pedagio') || text.includes('estacionamento') || text.includes('ipva')) {
    return 'Transporte';
  }
  if (text.includes('moradia') || text.includes('aluguel') || text.includes('condominio') || text.includes('condomínio') || text.includes('luz') || text.includes('energia') || text.includes('enel') || text.includes('agua') || text.includes('água') || text.includes('sabesp') || text.includes('gas') || text.includes('gás') || text.includes('iptu') || text.includes('reforma')) {
    return 'Moradia';
  }
  if (text.includes('saude') || text.includes('saúde') || text.includes('farmacia') || text.includes('farmácia') || text.includes('drogaria') || text.includes('remedio') || text.includes('remédio') || text.includes('medico') || text.includes('médico') || text.includes('consulta') || text.includes('dentista') || text.includes('exame') || text.includes('plano de saude') || text.includes('hospital')) {
    return 'Saúde';
  }
  if (text.includes('lazer') || text.includes('cinema') || text.includes('show') || text.includes('viagem') || text.includes('bar') || text.includes('cerveja') || text.includes('hotel') || text.includes('praia') || text.includes('festa') || text.includes('jogo') || text.includes('games') || text.includes('steam')) {
    return 'Lazer & Entretenimento';
  }
  if (text.includes('educacao') || text.includes('educação') || text.includes('escola') || text.includes('faculdade') || text.includes('curso') || text.includes('livro') || text.includes('mensalidade') || text.includes('udemy') || text.includes('idioma') || text.includes('ingles')) {
    return 'Educação';
  }
  if (text.includes('compra') || text.includes('roupa') || text.includes('calcado') || text.includes('calçado') || text.includes('tenis') || text.includes('tênis') || text.includes('shopping') || text.includes('shein') || text.includes('zara') || text.includes('eletronico') || text.includes('eletrônico') || text.includes('amazon') || text.includes('mercado livre') || text.includes('shopee')) {
    return 'Compras & Vestuário';
  }
  if (text.includes('servico') || text.includes('serviço') || text.includes('assinatura') || text.includes('netflix') || text.includes('spotify') || text.includes('amazon prime') || text.includes('disney') || text.includes('hbo') || text.includes('youtube') || text.includes('internet') || text.includes('celular') || text.includes('vivo') || text.includes('claro') || text.includes('tim')) {
    return 'Serviços & Assinaturas';
  }
  if (text.includes('financa') || text.includes('finança') || text.includes('banco') || text.includes('tarifa') || text.includes('juros') || text.includes('emprestimo') || text.includes('empréstimo') || text.includes('investimento') || text.includes('seguro') || text.includes('iof') || text.includes('imposto')) {
    return 'Finanças & Contas';
  }

  return 'Outros';
}

export function normalizePaymentMethod(methodRaw: string): PaymentMethod {
  const norm = (methodRaw || '').toLowerCase();
  if (norm.includes('pix')) return 'Pix';
  if (norm.includes('credito') || norm.includes('crédito') || norm.includes('cc')) return 'Cartão de Crédito';
  if (norm.includes('debito') || norm.includes('débito') || norm.includes('cd')) return 'Cartão de Débito';
  if (norm.includes('dinheiro') || norm.includes('cash') || norm.includes('especie') || norm.includes('espécie')) return 'Dinheiro';
  if (norm.includes('boleto')) return 'Boleto';
  if (norm.includes('ted') || norm.includes('doc') || norm.includes('transf')) return 'Transferência';
  return 'Outro';
}

/**
 * Export expenses list to Excel / CSV
 */
export function exportExpensesToExcel(expenses: Expense[], filename = 'despesas_finanstat.xlsx') {
  const data = expenses.map((e) => ({
    'Data': e.date,
    'Descrição': e.description,
    'Categoria': e.category,
    'Valor (R$)': e.amount,
    'Forma de Pagamento': e.paymentMethod,
    'Observações': e.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  XLSX.writeFile(workbook, filename);
}
