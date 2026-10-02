import {
  AIAdvice,
  ExpenseStatistics,
  CategorySummary,
  Expense,
  SenhorMoedaResponse,
  SenhorMoedaVerdict,
} from '../types/expense';

export async function parseExpenseWithAI(message: string, referenceDate?: string): Promise<{
  expenses: Array<{
    amount: number;
    description: string;
    category: string;
    date: string;
    paymentMethod?: string;
    note?: string;
  }>;
  isFallback?: boolean;
}> {
  try {
    const res = await fetch('/api/ai/parse-expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, referenceDate }),
    });

    if (!res.ok) {
      throw new Error(`Falha no servidor (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Erro ao chamar /api/ai/parse-expense, usando extrator local:', error);
    // Client-side quick regex fallback if server is unreachable
    return {
      expenses: localExtractExpense(message, referenceDate),
      isFallback: true,
    };
  }
}

export async function parseSpreadsheetWithAI(rawText: string, referenceDate?: string): Promise<{
  expenses: Array<{
    amount: number;
    description: string;
    category: string;
    date: string;
    paymentMethod?: string;
  }>;
}> {
  const res = await fetch('/api/ai/parse-spreadsheet-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, referenceDate }),
  });

  if (!res.ok) {
    throw new Error('Falha ao processar tabela com IA');
  }

  return await res.json();
}

export async function getFinancialAdvisorAdvice(payload: {
  statistics: ExpenseStatistics;
  categoryBreakdown: CategorySummary[];
  timeBreakdown: {
    dailyTotalAvg: number;
    topSpendingDay?: string;
    activeDays: number;
  };
  recentExpenses: Expense[];
  userGoal?: string;
}): Promise<{ advice: AIAdvice; isFallback?: boolean }> {
  try {
    const res = await fetch('/api/ai/financial-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Falha no servidor (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Erro ao obter conselhos de IA, gerando conselho analítico local:', error);
    return {
      advice: generateClientAdvice(payload.statistics, payload.categoryBreakdown),
      isFallback: true,
    };
  }
}

export async function askSenhorMoeda(payload: {
  question?: string;
  simulation?: { item: string; amount: number; category?: string };
  conversationHistory?: Array<{ sender: 'user' | 'senhor-moeda'; text: string }>;
  userStats: ExpenseStatistics & { todayTotal: number };
  categoryBreakdown: CategorySummary[];
  recentExpenses: Expense[];
  startDateFilter?: string;
}): Promise<SenhorMoedaResponse> {
  try {
    const res = await fetch('/api/ai/senhor-moeda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Falha no servidor (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Erro ao consultar o Senhor Moeda via API, usando conselho local:', error);
    const amount = payload.simulation?.amount || 0;
    const item = payload.simulation?.item || 'este item';
    const today = payload.userStats?.todayTotal || 52;
    const total = payload.userStats?.total || 384;
    const mean = payload.userStats?.mean || 35;

    let verdict: SenhorMoedaVerdict = 'CAUTELA';
    let verdictLabel = 'Pense Duas Vezes';
    let verdictScore = 6;
    let headline = 'Atenção aos pequenos vazamentos!';
    let reply = `Com base nos seus gastos desde 26/09 (total de R$ ${total.toFixed(2)} e R$ ${today.toFixed(2)} hoje), `;

    if (amount > 0) {
      if (amount <= 30 && today + amount <= 90) {
        verdict = 'APROVADO';
        verdictLabel = 'Selo Sr. Moeda: Aprovado!';
        verdictScore = 9;
        headline = 'Pode gastar com consciência, está dentro da sua margem!';
        reply += `gastar R$ ${amount.toFixed(2)} com "${item}" não vai desregular sua média (que é de R$ ${mean.toFixed(2)}). Aproveite com sabedoria!`;
      } else if (amount > 150) {
        verdict = 'RECUSADO';
        verdictLabel = 'Segure a Carteira! Risco de Descontrole';
        verdictScore = 2;
        headline = 'Pare tudo! Essa compra vai pesar demais no seu orçamento!';
        reply += `gastar R$ ${amount.toFixed(2)} com "${item}" é muito alto em comparação com seu ticket médio (R$ ${mean.toFixed(2)}). Recomendo dormir sobre a decisão e esperar 48 horas.`;
      } else {
        verdict = 'CAUTELA';
        verdictLabel = 'Alerta Amarelo: Cuidado com o Impulso';
        verdictScore = 5;
        headline = 'Vale a pena apenas se você economizar em outro item hoje!';
        reply += `gastar R$ ${amount.toFixed(2)} com "${item}" vai elevar seu total de hoje para R$ ${(today + amount).toFixed(2)}. Pergunte a si mesmo: isso é necessidade imediata ou desejo passageiro?`;
      }
    } else {
      verdict = 'ORIENTACAO';
      verdictLabel = 'Conselho do Sr. Moeda';
      verdictScore = 8;
      headline = 'O segredo da riqueza é tapar os ralos da carteira!';
      reply += 'Diga-me o que você está pensando em comprar e o valor em reais, e eu calculo o impacto exato na sua média e te dou meu veredito sincero!';
    }

    return {
      verdict,
      verdictLabel,
      verdictScore,
      headline,
      reply,
      financialImpact: amount > 0 ? `Seu gasto de hoje subiria para R$ ${(today + amount).toFixed(2)}.` : undefined,
      suggestedAlternative: 'Se for um desejo e não urgência, aplique a regra dos 3 dias: se ainda quiser após 72h, compre sem culpa.',
      quickQuestions: [
        'Devo pedir delivery de R$ 60 hoje?',
        'Onde estou gastando mais desde o dia 26?',
        'Posso comprar uma roupa de R$ 180?',
      ],
      isFallback: true,
    };
  }
}

function localExtractExpense(text: string, referenceDate?: string) {
  const todayStr = referenceDate || new Date().toISOString().split('T')[0];
  const regex = /(?:r\$|reais)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:reais)?/gi;
  const expenses: any[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const rawVal = match[1].replace(',', '.');
    const amount = parseFloat(rawVal);
    if (!isNaN(amount) && amount > 0) {
      const snippet = text.slice(Math.max(0, match.index - 25), Math.min(text.length, match.index + 35)).trim();
      expenses.push({
        amount,
        description: snippet || 'Gasto registrado',
        category: 'Outros',
        date: todayStr,
        paymentMethod: 'Pix',
      });
    }
  }

  return expenses;
}

function generateClientAdvice(statistics: ExpenseStatistics, categoryBreakdown: CategorySummary[]): AIAdvice {
  const topCat = categoryBreakdown[0]?.category || 'Geral';
  const topPct = categoryBreakdown[0]?.percentage?.toFixed(1) || '0';
  const meanVal = statistics.mean.toFixed(2);
  const medianVal = statistics.median.toFixed(2);
  const modeVal = statistics.mode
    ? `R$ ${statistics.mode.value.toFixed(2)} (${statistics.mode.count} repetições)`
    : 'Sem valor repetido';

  return {
    headline: `Maior foco de consumo identificado em "${topCat}" (${topPct}% dos gastos).`,
    consumptionDiagnosis: `Você alocou ${topPct}% do total gasto no período em ${topCat}. Essa categoria representa o maior peso do seu orçamento.`,
    statisticalInsight: `Sua Média é de R$ ${meanVal}, enquanto a Mediana é de R$ ${medianVal}. A Moda mais comum é ${modeVal}. A diferença entre média e mediana indica se você tem compras atípicas elevando a média global.`,
    topRecommendations: [
      {
        title: `Teto orçamentário para ${topCat}`,
        description: 'Estabeleça uma cota semanal e evite compras não essenciais na categoria líder.',
        potentialMonthlySaving: 'R$ 150 - R$ 300',
        category: topCat,
      },
      {
        title: 'Controle de microgastos repetidos',
        description: `Compras de valor modal frequente acumulam um impacto expressivo no fechamento do mês.`,
        potentialMonthlySaving: 'R$ 100 - R$ 250',
        category: 'Variados',
      },
      {
        title: 'Revisão periódica de assinaturas e contas fixas',
        description: 'Audite contas de serviços recorrentes e busque planos mais econômicos.',
        potentialMonthlySaving: 'R$ 60 - R$ 140',
        category: 'Moradia / Serviços',
      },
    ],
    leaksAlert: [
      'Pequenos gastos diários repetitivos (cafés, taxas, delivery por impulso).',
      'Concentração de pagamentos no cartão de crédito.',
    ],
    savingChallenge: 'Desafio 7 dias: corte 15% dos gastos não essenciais nesta semana.',
    monthlyProjection: 'R$ 310 a R$ 690 de economia mensal aplicando os ajustes recomendados.',
  };
}
