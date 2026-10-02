export type ExpenseCategory =
  | 'Alimentação'
  | 'Transporte'
  | 'Moradia'
  | 'Saúde'
  | 'Lazer & Entretenimento'
  | 'Educação'
  | 'Compras & Vestuário'
  | 'Serviços & Assinaturas'
  | 'Finanças & Contas'
  | 'Outros';

export type PaymentMethod =
  | 'Pix'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Dinheiro'
  | 'Boleto'
  | 'Transferência'
  | 'Outro';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export type TimeViewMode = 'daily' | 'weekly' | 'monthly';

export interface ModeValue {
  value: number;
  count: number;
  percentage: number;
}

export interface ExpenseStatistics {
  count: number;
  total: number;
  mean: number; // Média
  median: number; // Mediana
  mode: ModeValue | null; // Moda principal
  topModes: ModeValue[]; // Top valores mais frequentes
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number; // Desvio padrão
  dailyAverage: number; // Média diária
  activeDaysCount: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
  mean: number;
  median: number;
  color: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  total: number;
  count: number;
  expenses: Expense[];
}

export interface WeekSummary {
  weekKey: string; // e.g. "Semana 1 (01-07/10)"
  startDate: string;
  endDate: string;
  total: number;
  count: number;
  meanDaily: number;
  expenses: Expense[];
}

export interface MonthSummary {
  monthKey: string; // e.g. "2026-10"
  label: string; // e.g. "Outubro 2026"
  total: number;
  count: number;
  meanDaily: number;
  expenses: Expense[];
}

export interface AIAdvice {
  headline: string;
  consumptionDiagnosis: string;
  statisticalInsight: string;
  topRecommendations: Array<{
    title: string;
    description: string;
    potentialMonthlySaving: string;
    category?: string;
  }>;
  leaksAlert: string[];
  savingChallenge: string;
  monthlyProjection: string;
}

export type SenhorMoedaVerdict = 'APROVADO' | 'CAUTELA' | 'RECUSADO' | 'ORIENTACAO';

export interface SenhorMoedaResponse {
  verdict: SenhorMoedaVerdict;
  verdictLabel: string;
  verdictScore: number;
  headline: string;
  reply: string;
  financialImpact?: string;
  suggestedAlternative?: string;
  financialConcept?: string;
  mathProjection?: string;
  actionSteps?: string[];
  quickQuestions?: string[];
  isFallback?: boolean;
}

export interface UserProfile {
  name: string;
  age: number | null;
}

export interface SenhorMoedaMessage {
  id: string;
  sender: 'user' | 'senhor-moeda';
  text: string;
  verdict?: SenhorMoedaVerdict;
  verdictLabel?: string;
  financialImpact?: string;
  suggestedAlternative?: string;
  financialConcept?: string;
  mathProjection?: string;
  actionSteps?: string[];
  timestamp: number;
}
