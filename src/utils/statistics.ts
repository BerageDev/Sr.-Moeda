import { Expense, ExpenseStatistics, ModeValue, DaySummary, WeekSummary, MonthSummary, CategorySummary, ExpenseCategory } from '../types/expense';

export const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; hex: string }> = {
  'Alimentação': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', hex: '#10b981' },
  'Transporte': { bg: 'bg-blue-500/15', text: 'text-blue-400', hex: '#3b82f6' },
  'Moradia': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', hex: '#6366f1' },
  'Saúde': { bg: 'bg-rose-500/15', text: 'text-rose-400', hex: '#f43f5e' },
  'Lazer & Entretenimento': { bg: 'bg-amber-500/15', text: 'text-amber-400', hex: '#f59e0b' },
  'Educação': { bg: 'bg-purple-500/15', text: 'text-purple-400', hex: '#a855f7' },
  'Compras & Vestuário': { bg: 'bg-pink-500/15', text: 'text-pink-400', hex: '#ec4899' },
  'Serviços & Assinaturas': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', hex: '#06b6d4' },
  'Finanças & Contas': { bg: 'bg-orange-500/15', text: 'text-orange-400', hex: '#f97316' },
  'Outros': { bg: 'bg-slate-500/15', text: 'text-slate-400', hex: '#64748b' },
};

/**
 * Calculates Média, Mediana, Moda and variance statistics for a list of expenses
 */
export function calculateStatistics(expenses: Expense[]): ExpenseStatistics {
  if (!expenses || expenses.length === 0) {
    return {
      count: 0,
      total: 0,
      mean: 0,
      median: 0,
      mode: null,
      topModes: [],
      min: 0,
      max: 0,
      range: 0,
      variance: 0,
      stdDev: 0,
      dailyAverage: 0,
      activeDaysCount: 0,
    };
  }

  const values = expenses.map((e) => Number(e.amount)).filter((v) => !isNaN(v) && v >= 0);
  const count = values.length;
  if (count === 0) {
    return calculateStatistics([]);
  }

  // 1. Total & Média (Mean)
  const total = values.reduce((acc, curr) => acc + curr, 0);
  const mean = total / count;

  // 2. Mediana (Median)
  const sortedValues = [...values].sort((a, b) => a - b);
  let median = 0;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  } else {
    median = sortedValues[mid];
  }

  // 3. Moda (Mode) - Frequency map rounded to 2 decimal places
  const freqMap = new Map<number, number>();
  for (const val of values) {
    const rounded = Math.round(val * 100) / 100;
    freqMap.set(rounded, (freqMap.get(rounded) || 0) + 1);
  }

  const sortedFrequencies: ModeValue[] = Array.from(freqMap.entries())
    .map(([val, freq]) => ({
      value: val,
      count: freq,
      percentage: (freq / count) * 100,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.value - b.value;
    });

  // Main mode (only if count > 1 or single element exists)
  const highestFreq = sortedFrequencies[0]?.count || 0;
  let primaryMode: ModeValue | null = null;
  if (highestFreq > 1 || count === 1) {
    primaryMode = sortedFrequencies[0] || null;
  }

  const topModes = sortedFrequencies.slice(0, 5);

  // 4. Min, Max, Range, Standard Deviation
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const range = max - min;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  // 5. Daily Average (based on unique active days in this expense set)
  const uniqueDates = new Set(expenses.map((e) => e.date));
  const activeDaysCount = Math.max(1, uniqueDates.size);
  const dailyAverage = total / activeDaysCount;

  return {
    count,
    total,
    mean,
    median,
    mode: primaryMode,
    topModes,
    min,
    max,
    range,
    variance,
    stdDev,
    dailyAverage,
    activeDaysCount,
  };
}

/**
 * Groups expenses by day
 */
export function getDailySummary(expenses: Expense[]): DaySummary[] {
  const groups = new Map<string, Expense[]>();

  for (const exp of expenses) {
    const list = groups.get(exp.date) || [];
    list.push(exp);
    groups.set(exp.date, list);
  }

  // Sort dates descending (newest first)
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  const weekDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return sortedDates.map((dateStr) => {
    const items = groups.get(dateStr) || [];
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = weekDayNames[dateObj.getDay()] || '';

    return {
      date: dateStr,
      dayOfWeek,
      total,
      count: items.length,
      expenses: items.sort((a, b) => b.createdAt - a.createdAt),
    };
  });
}

/**
 * Groups expenses by week
 */
export function getWeeklySummary(expenses: Expense[]): WeekSummary[] {
  if (expenses.length === 0) return [];

  // Group by ISO week (Monday to Sunday)
  const weekMap = new Map<string, { start: Date; end: Date; items: Expense[] }>();

  for (const exp of expenses) {
    const date = new Date(exp.date + 'T00:00:00');
    // Find Monday of this week
    const day = date.getDay();
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekKey = `${formatDateShort(monday)} a ${formatDateShort(sunday)}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { start: monday, end: sunday, items: [] });
    }
    weekMap.get(weekKey)!.items.push(exp);
  }

  // Sort weeks by date descending
  return Array.from(weekMap.entries())
    .sort((a, b) => b[1].start.getTime() - a[1].start.getTime())
    .map(([weekKey, { start, end, items }], index, arr) => {
      const total = items.reduce((sum, e) => sum + e.amount, 0);
      const uniqueDays = new Set(items.map((e) => e.date)).size;
      const meanDaily = total / Math.max(1, uniqueDays);
      const weekNumber = arr.length - index;

      return {
        weekKey: `Semana ${weekNumber} (${weekKey})`,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        total,
        count: items.length,
        meanDaily,
        expenses: items.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
}

/**
 * Groups expenses by month
 */
export function getMonthlySummary(expenses: Expense[]): MonthSummary[] {
  const monthMap = new Map<string, Expense[]>();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  for (const exp of expenses) {
    const monthKey = exp.date.substring(0, 7); // YYYY-MM
    const list = monthMap.get(monthKey) || [];
    list.push(exp);
    monthMap.set(monthKey, list);
  }

  return Array.from(monthMap.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => {
      const items = monthMap.get(monthKey) || [];
      const [year, month] = monthKey.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      const label = `${monthNames[monthIdx]} ${year}`;
      const total = items.reduce((sum, e) => sum + e.amount, 0);
      const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      const meanDaily = total / daysInMonth;

      return {
        monthKey,
        label,
        total,
        count: items.length,
        meanDaily,
        expenses: items.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
}

/**
 * Summarizes breakdown by category
 */
export function getCategoryBreakdown(expenses: Expense[]): CategorySummary[] {
  if (expenses.length === 0) return [];

  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);
  const catMap = new Map<ExpenseCategory, Expense[]>();

  for (const exp of expenses) {
    const list = catMap.get(exp.category) || [];
    list.push(exp);
    catMap.set(exp.category, list);
  }

  return Array.from(catMap.entries())
    .map(([cat, list]) => {
      const total = list.reduce((sum, e) => sum + e.amount, 0);
      const count = list.length;
      const percentage = totalAll > 0 ? (total / totalAll) * 100 : 0;
      const mean = count > 0 ? total / count : 0;

      const sorted = list.map((e) => e.amount).sort((a, b) => a - b);
      const mid = Math.floor(count / 2);
      const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

      return {
        category: cat,
        total,
        count,
        percentage,
        mean,
        median,
        color: CATEGORY_COLORS[cat]?.hex || '#64748b',
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
