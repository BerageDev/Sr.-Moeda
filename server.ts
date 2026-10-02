import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini on server-side
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const app = express();
app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint 1: Parse natural language message to expenses
app.post('/api/ai/parse-expense', async (req, res) => {
  try {
    const { message, referenceDate } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];

    if (!ai) {
      // Fallback rule-based extraction if API key is not present
      const fallbackExpenses = parseExpenseRegexFallback(message, todayStr);
      return res.json({ expenses: fallbackExpenses, isFallback: true });
    }

    const prompt = `Você é um assistente financeiro de ponta. Analise a seguinte mensagem do usuário em português e extraia TODOS os gastos/despesas mencionados nela.
Mensagem do usuário: "${message}"
Data de referência de hoje: "${todayStr}".
Caso o usuário use termos como "hoje", "ontem", "anteontem", "segunda-feira passada", calcule a data exata no formato YYYY-MM-DD. Se nenhuma data for mencionada, use a data de referência "${todayStr}".
Identifique:
- amount: número decimal positivo (ex: 45.50, 120, etc). Converta se o usuário disser "45 reais", "R$ 45,90", "vinte e cinco reais", etc.
- description: breve descrição clara do item ou serviço gasto (ex: "Almoço no restaurante", "Conta de luz", "Gasolina Shell").
- category: atribua a categoria mais adequada dentre: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer & Entretenimento', 'Educação', 'Compras & Vestuário', 'Serviços & Assinaturas', 'Finanças & Contas', 'Outros'.
- date: data no formato YYYY-MM-DD.
- paymentMethod: meio de pagamento se citado ('Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro', 'Boleto', ou 'Outro').
- note: detalhes adicionais se houver.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: 'Valor numérico do gasto em reais' },
                  description: { type: Type.STRING, description: 'Descrição clara da despesa' },
                  category: { type: Type.STRING, description: 'Categoria da despesa' },
                  date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD' },
                  paymentMethod: { type: Type.STRING, description: 'Forma de pagamento deduzida ou Outro' },
                  note: { type: Type.STRING, description: 'Observações' },
                },
                required: ['amount', 'description', 'category', 'date'],
              },
            },
          },
          required: ['expenses'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"expenses":[]}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing expense via Gemini:', error);
    // Graceful fallback to regex parsing on error
    const todayStr = req.body?.referenceDate || new Date().toISOString().split('T')[0];
    const fallback = parseExpenseRegexFallback(req.body?.message || '', todayStr);
    res.json({ expenses: fallback, isFallback: true, warning: 'Processado com mecanismo local.' });
  }
});

// Endpoint 2: Parse raw table/spreadsheet text if user pastes messy tabular data
app.post('/api/ai/parse-spreadsheet-text', async (req, res) => {
  try {
    const { rawText, referenceDate } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Texto da planilha é obrigatório' });
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];

    if (!ai) {
      return res.status(500).json({ error: 'Chave Gemini não configurada' });
    }

    const prompt = `Analise os seguintes dados brutos extraídos de uma planilha, extrato bancário ou tabela financeira e converta cada linha válida de despesa em um objeto estruturado.
Ignore linhas de cabeçalho irrelevantes, linhas de saldo ou totais.
Data de referência: "${todayStr}".
Dados da planilha:
"""
${rawText.slice(0, 15000)}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: 'Valor positivo gasto' },
                  description: { type: Type.STRING, description: 'Nome/descrição do item' },
                  category: { type: Type.STRING, description: 'Categoria' },
                  date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD' },
                  paymentMethod: { type: Type.STRING, description: 'Meio de pagamento' },
                },
                required: ['amount', 'description', 'category', 'date'],
              },
            },
          },
          required: ['expenses'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"expenses":[]}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing spreadsheet text via Gemini:', error);
    res.status(500).json({ error: 'Falha ao processar dados da planilha com IA' });
  }
});

// Endpoint 3: Financial Advisor AI (Conselhos e dicas personalizadas com base em média, mediana, moda e categorias)
app.post('/api/ai/financial-advisor', async (req, res) => {
  try {
    const { statistics, categoryBreakdown, timeBreakdown, recentExpenses, userGoal } = req.body;

    if (!ai) {
      return res.json({
        advice: generateLocalAdvice(statistics, categoryBreakdown),
        isFallback: true,
      });
    }

    const prompt = `Você é um Consultor Financeiro Pessoal e Cientista de Dados Sênior.
Sua missão é dar uma consultoria financeira completa, empática, ultra prática e altamente personalizada ao usuário, em português brasileiro, baseando-se nas métricas estatísticas (Média, Mediana e Moda) e no comportamento de gastos dele.

DADOS ESTATÍSTICOS DO USUÁRIO:
- Total Gasto no Período: R$ ${statistics?.total?.toFixed(2) || '0.00'}
- Quantidade de Transações: ${statistics?.count || 0}
- Média dos Gastos (Mean): R$ ${statistics?.mean?.toFixed(2) || '0.00'}
- Mediana dos Gastos (Median): R$ ${statistics?.median?.toFixed(2) || '0.00'}
- Moda dos Gastos (Mode): ${statistics?.mode ? `R$ ${statistics.mode.value.toFixed(2)} (ocorreu ${statistics.mode.count} vezes)` : 'Não houve repetição única'}
- Desvio Padrão / Dispersão: R$ ${statistics?.stdDev?.toFixed(2) || '0.00'}
- Maior Gasto Único: R$ ${statistics?.max?.toFixed(2) || '0.00'}
- Menor Gasto Único: R$ ${statistics?.min?.toFixed(2) || '0.00'}

DISTRIBUIÇÃO POR CATEGORIAS (Onde está gastando mais):
${JSON.stringify(categoryBreakdown || [], null, 2)}

DISTRIBUIÇÃO TEMPORAL (Diária / Semanal / Mensal):
${JSON.stringify(timeBreakdown || {}, null, 2)}

AMOSTRA DE GASTOS RECENTES:
${JSON.stringify((recentExpenses || []).slice(0, 15), null, 2)}

META OU DÚVIDA DO USUÁRIO:
${userGoal ? `"${userGoal}"` : 'Fornecer diagnóstico completo e dicas para economizar e consumir de forma mais consciente.'}

ESTRUTURA DE RESPOSTA NECESSÁRIA (JSON):
Forneça:
1. "headline": Frase de impacto resumindo a saúde financeira do período.
2. "consumptionDiagnosis": Análise detalhada de ONDE o usuário está gastando e consumindo mais (principais vilões do orçamento e categorias dominantes).
3. "statisticalInsight": Explicação clara em linguagem simples do que a MÉDIA, MEDIANA e MODA revelam sobre os hábitos dele (ex: se a média é muito maior que a mediana devido a compras de alto impacto, ou o que o valor modal indica sobre micropagamentos e compras frequentes).
4. "topRecommendations": Lista de 3 a 5 recomendações práticas, pontuais e com meta de economia estimada em R$.
5. "leaksAlert": Identificação de "pequenos ralos de dinheiro" ou gastos repetitivos.
6. "savingChallenge": Um desafio prático para os próximos 7 a 30 dias (ex: cortar 20% em delivery).
7. "monthlyProjection": Estimativa de economia mensal caso aplique as recomendações.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            consumptionDiagnosis: { type: Type.STRING },
            statisticalInsight: { type: Type.STRING },
            topRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  potentialMonthlySaving: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ['title', 'description', 'potentialMonthlySaving'],
              },
            },
            leaksAlert: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            savingChallenge: { type: Type.STRING },
            monthlyProjection: { type: Type.STRING },
          },
          required: [
            'headline',
            'consumptionDiagnosis',
            'statisticalInsight',
            'topRecommendations',
            'savingChallenge',
            'monthlyProjection',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ advice: parsed });
  } catch (error: any) {
    console.error('Error generating financial advice via Gemini:', error);
    const local = generateLocalAdvice(req.body?.statistics, req.body?.categoryBreakdown);
    res.json({ advice: local, isFallback: true });
  }
});

// Endpoint 4: SENHOR MOEDA (Conselheiro financeiro pessoal e avaliador de gastos "Devo gastar ou não?")
app.post('/api/ai/senhor-moeda', async (req, res) => {
  try {
    const {
      question,
      simulation, // optional: { item: string, amount: number, category?: string }
      conversationHistory = [],
      userStats,
      categoryBreakdown,
      recentExpenses,
      startDateFilter,
      userProfile,
    } = req.body;

    if (!question && !simulation) {
      return res.status(400).json({ error: 'Pergunta ou simulação de compra é obrigatória' });
    }

    const currentQuestion = question || `Devo gastar R$ ${simulation?.amount} com "${simulation?.item}"?`;

    // Local fallback handler if no Gemini instance
    if (!ai) {
      const fallbackResponse = generateLocalSenhorMoedaReply(currentQuestion, simulation, userStats);
      return res.json(fallbackResponse);
    }

    const systemInstruction = `Você é o "Senhor Moeda" (Sr. Moeda 🪙), a mais brilhante inteligência financeira pessoal, conselheiro de elite e guardião do bolso do usuário.
Você combina a precisão matemática de um economista sênior e planejador financeiro CFP com o pragmatismo e a didática de quem domina as finanças do cotidiano no Brasil (Selic, CDI, IPCA, Tesouro Direto, cartões, parcelamentos, juros compostos, reserva de emergência, taxas e inflação).

SUA MISSÃO SUPREMA:
1. DECIDIR COMPRAS ("Devo gastar ou não?"): Emitir um veredito cirúrgico e fundamentado sobre se o usuário deve ou não gastar em determinada compra, desejo ou serviço, cruzando o valor com seus dados reais e calculando o custo de oportunidade.
2. TIRA-DÚVIDAS FINANCEIRO UNIVERSAL: Responder a QUALQUER pergunta, dúvida, conceito ou estratégia financeira com clareza cristalina, profundidade analítica, exemplos práticos e cálculos matemáticos exatos.

SUA PERSONALIDADE:
- Inteligentíssimo, bem-humorado, direto ao ponto, didático e protetor incansável do patrimônio do usuário.
- Você comemora cada moeda poupada como uma semente de liberdade financeira e combate compras por impulso com argumentos matemáticos irrefutáveis.
${userProfile?.name ? `- O usuário se chama "${userProfile.name}"${userProfile.age ? ` e tem ${userProfile.age} anos` : ''}. Chame-o pelo nome e calibre suas recomendações para a sua faixa etária e fase financeira.` : ''}
- Você SEMPRE cita os dados reais do usuário para embasar suas análises quando o contexto permitir:
${userStats && userStats.count > 0 ? `  * Início da contagem: ${startDateFilter || 'Data inicial da planilha'}
  * Total acumulado no período: R$ ${userStats.total.toFixed(2)} (${userStats.count} lançamentos)
  * Gasto registrado hoje: R$ ${(userStats.todayTotal || 0).toFixed(2)}
  * Ticket Médio por transação: R$ ${userStats.mean.toFixed(2)}
  * Mediana dos gastos: R$ ${userStats.median.toFixed(2)}
  * Moda (gasto mais frequente): ${userStats.mode ? `R$ ${userStats.mode.value.toFixed(2)} (${userStats.mode.count}x)` : 'Sem valor modal único'}
  * Top Categorias: ${JSON.stringify((categoryBreakdown || []).slice(0, 3))}` : `  * O usuário limpou todos os dados de conta anteriores e ainda não carregou uma planilha de gastos.
  * Responda de forma brilhante com princípios financeiros e lembre-o de que ao conectar seu Google Drive ou enviar uma planilha, você fará diagnósticos em cima dos números exatos dele.`}

REGRAS DE VEREDITO:
- 'APROVADO': Despesa essencial, investimento no bem-estar com retorno claro, ou compra dentro da margem segura sem distorcer a média.
- 'CAUTELA': Despesa supérflua, compra com risco de arrependimento ou acima do ticket médio diário. Recomende regra de reflexão (24h a 72h) ou corte equivalente.
- 'RECUSADO': Compra por impulso, luxo desproporcional à média atual, ou gasto que sabota as metas do usuário.
- 'ORIENTACAO': Dúvidas conceituais, perguntas sobre investimentos, estratégias de economia, matemática financeira, inflação, dívidas, etc.

SEMPRE retorne a resposta no formato JSON estruturado com todos os campos requisitados.`;

    const prompt = `Pergunta/Dúvida do Usuário: "${currentQuestion}"
${simulation ? `Dados da Compra em Avaliação: Item: "${simulation.item}", Valor: R$ ${simulation.amount}, Categoria: "${simulation.category || 'Geral'}"` : ''}
Histórico da conversa: ${JSON.stringify(conversationHistory.slice(-4))}

Como Senhor Moeda em sua versão de inteligência máxima, responda com profundidade, precisão matemática, conselho prático e veredito.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let responseText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                verdict: {
                  type: Type.STRING,
                  description: "Exatamente: 'APROVADO', 'CAUTELA', 'RECUSADO' ou 'ORIENTACAO'",
                },
                verdictLabel: {
                  type: Type.STRING,
                  description: "Ex: 'Selo Sr. Moeda: Pode Gastar!', 'Segure a Carteira!', 'Pense Duas Vezes (Regra 24h)', 'Aula Estratégica do Sr. Moeda'",
                },
                verdictScore: {
                  type: Type.NUMBER,
                  description: 'Nota de viabilidade de 1 a 10 (10 = totalmente seguro/excelente decisão, 1 = perigo financeiro)',
                },
                headline: {
                  type: Type.STRING,
                  description: 'Frase de impacto inicial do Senhor Moeda com inteligência, sagacidade e estilo marcante',
                },
                reply: {
                  type: Type.STRING,
                  description: 'Resposta conversacional completa, ultra inteligente, didática e aprofundada, conectando teoria, números reais e orientações práticas',
                },
                financialImpact: {
                  type: Type.STRING,
                  description: 'Impacto objetivo no bolso e nos números (ex: Eleva gasto de hoje para R$ X e total para R$ Y, ou cálculo de juros/custo de oportunidade)',
                },
                suggestedAlternative: {
                  type: Type.STRING,
                  description: 'Alternativa estratégica para economizar, negociar ou multiplicar esse dinheiro',
                },
                financialConcept: {
                  type: Type.STRING,
                  description: 'Conceito financeiro ensinado (ex: Custo de Oportunidade, Juros Compostos, Regra 50-30-20, Custo por Uso, Reserva de Emergência, Efeito Manada)',
                },
                mathProjection: {
                  type: Type.STRING,
                  description: 'Simulação matemática com números exatos (ex: R$ 50/mês a 10% a.a. vira R$ 3.870 em 5 anos; ou Esta compra equivale a 3 dias da sua média)',
                },
                actionSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '1 a 3 passos práticos para o usuário executar imediatamente',
                },
                quickQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 perguntas inteligentes de acompanhamento para o usuário continuar',
                },
              },
              required: ['verdict', 'verdictLabel', 'verdictScore', 'headline', 'reply', 'quickQuestions'],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} encountered error, trying next available model:`, err?.message);
      }
    }

    if (!responseText) {
      throw new Error('Todos os modelos Gemini estavam temporariamente indisponíveis.');
    }

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in Senhor Moeda endpoint:', error);
    const fallback = generateLocalSenhorMoedaReply(
      req.body?.question || '',
      req.body?.simulation,
      req.body?.userStats
    );
    res.json(fallback);
  }
});

function generateLocalSenhorMoedaReply(question: string, simulation: any, userStats: any) {
  const amount = simulation?.amount || 0;
  const item = simulation?.item || 'este item';
  const total = userStats?.total || 384;
  const today = userStats?.todayTotal || 52;
  const mean = userStats?.mean || 35;

  let verdict: 'APROVADO' | 'CAUTELA' | 'RECUSADO' | 'ORIENTACAO' = 'CAUTELA';
  let verdictLabel = 'Pense Duas Vezes';
  let verdictScore = 6;
  let headline = 'Atenção aos pequenos vazamentos na carteira!';
  let reply = `Analisando seus dados desde o dia 26/09, você acumula R$ ${total.toFixed(2)} em gastos (com R$ ${today.toFixed(2)} hoje e ticket médio de R$ ${mean.toFixed(2)}).`;

  if (amount > 0) {
    if (amount <= 30 && today + amount <= 90) {
      verdict = 'APROVADO';
      verdictLabel = 'Selo Sr. Moeda: Aprovado!';
      verdictScore = 9;
      headline = 'Pode gastar com consciência, cabe no orçamento de hoje!';
      reply += ` Gastar R$ ${amount.toFixed(2)} com "${item}" está dentro do seu padrão habitual de gastos. Só certifique-se de registrar logo em seguida!`;
    } else if (amount > 150) {
      verdict = 'RECUSADO';
      verdictLabel = 'Segure o Bolso! Compra de Alto Impacto';
      verdictScore = 3;
      headline = 'Pare tudo! Essa compra vai desregular sua média semanal!';
      reply += ` Gastar R$ ${amount.toFixed(2)} com "${item}" representa quase metade do que você gastou desde o dia 26 inteiro (R$ ${total.toFixed(2)}). Recomendo esperar 48 horas antes de bater o martelo.`;
    } else {
      verdict = 'CAUTELA';
      verdictLabel = 'Alerta Amarelo: Cuidado com o impulso';
      verdictScore = 5;
      headline = 'Vale a pena se você compensar cortando outro gasto hoje!';
      reply += ` Gastar R$ ${amount.toFixed(2)} com "${item}" vai elevar seu gasto de hoje para R$ ${(today + amount).toFixed(2)}. Se for essencial, corte algo de alimentação ou lazer amanhã.`;
    }
  } else {
    verdict = 'ORIENTACAO';
    verdictLabel = 'Conselho do Sr. Moeda';
    verdictScore = 8;
    headline = 'O segredo da riqueza não é ganhar mais, é não deixar o balde furado!';
    reply += ' Se você tiver uma compra em mente agora, me diga o que quer comprar e o valor, que eu te digo na hora se você deve ou não gastar!';
  }

  return {
    verdict,
    verdictLabel,
    verdictScore,
    headline,
    reply,
    financialImpact: amount > 0 ? `Seu gasto de hoje subiria para R$ ${(today + amount).toFixed(2)}.` : undefined,
    suggestedAlternative: 'Aplique a regra das 24 horas: se ainda desejar amanhã sem comprometer o dia, compre à vista.',
    quickQuestions: [
      'Devo pedir um delivery de R$ 60 hoje?',
      'Onde estou gastando mais desde o dia 26?',
      'Posso comprar uma roupa de R$ 180?',
    ],
    isFallback: true,
  };
}

// Helper for local regex-based parsing when offline or fallback
function parseExpenseRegexFallback(text: string, todayStr: string) {
  const expenses: any[] = [];
  // Match currency patterns like "45,50", "120", "R$ 300,00"
  const regex = /(?:r\$|reais)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:reais)?/gi;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const rawVal = match[1].replace(',', '.');
    const amount = parseFloat(rawVal);
    if (!isNaN(amount) && amount > 0) {
      // Find nearby words
      const snippet = text.slice(Math.max(0, match.index - 30), Math.min(text.length, match.index + 50)).trim();
      let category = 'Outros';
      const lower = snippet.toLowerCase();
      if (lower.includes('almoço') || lower.includes('jantar') || lower.includes('comida') || lower.includes('lanche') || lower.includes('mercado') || lower.includes('cafe')) {
        category = 'Alimentação';
      } else if (lower.includes('uber') || lower.includes('gasolina') || lower.includes('onibus') || lower.includes('combustivel')) {
        category = 'Transporte';
      } else if (lower.includes('farmacia') || lower.includes('remedio') || lower.includes('medico')) {
        category = 'Saúde';
      } else if (lower.includes('aluguel') || lower.includes('luz') || lower.includes('agua') || lower.includes('internet') || lower.includes('condominio')) {
        category = 'Moradia';
      }

      expenses.push({
        amount,
        description: snippet.slice(0, 40) || 'Gasto registrado',
        category,
        date: todayStr,
        paymentMethod: 'Pix',
      });
    }
  }

  if (expenses.length === 0) {
    // If no numbers parsed, return empty
    return [];
  }
  return expenses;
}

// Helper for local advice when Gemini is unavailable
function generateLocalAdvice(statistics: any, categoryBreakdown: any[]) {
  const topCategory = categoryBreakdown?.[0]?.category || 'Geral';
  const topPercentage = categoryBreakdown?.[0]?.percentage?.toFixed(1) || '0';
  const mean = statistics?.mean?.toFixed(2) || '0,00';
  const median = statistics?.median?.toFixed(2) || '0,00';
  const modeVal = statistics?.mode ? `R$ ${statistics.mode.value.toFixed(2)} (${statistics.mode.count}x)` : 'Sem valor predominante';

  return {
    headline: `Seu maior foco de consumo atual está em "${topCategory}" (${topPercentage}% do total).`,
    consumptionDiagnosis: `Você concentrou uma parcela expressiva do orçamento na categoria "${topCategory}". Controlar compras por impulso neste setor trará alívio imediato no fechamento do mês.`,
    statisticalInsight: `Sua média por gasto é de R$ ${mean}, enquanto sua mediana é de R$ ${median}. A moda identificada foi ${modeVal}. Quando a média é superior à mediana, indica que despesas atípicas de maior valor estão elevando o custo global.`,
    topRecommendations: [
      {
        title: `Estabelecer teto semanal para ${topCategory}`,
        description: `Defina um limite prévio e acompanhe dia a dia para não ultrapassar a meta mensal.`,
        potentialMonthlySaving: 'R$ 150 - R$ 350',
        category: topCategory,
      },
      {
        title: 'Atenção aos gastos modais e recorrentes',
        description: `Seus gastos repetidos mais frequentes somam um valor substancial ao final de 30 dias.`,
        potentialMonthlySaving: 'R$ 80 - R$ 200',
        category: 'Variados',
      },
      {
        title: 'Revisão de assinaturas e serviços',
        description: 'Faça um pente fino em serviços recorrentes e débitos automáticos pouco utilizados.',
        potentialMonthlySaving: 'R$ 50 - R$ 120',
        category: 'Serviços & Assinaturas',
      },
    ],
    leaksAlert: [
      'Microgastos diários com lanches, transportes curtos ou taxas não planejadas.',
      'Compras não essenciais efetuadas no cartão de crédito nos finais de semana.',
    ],
    savingChallenge: 'Desafio dos 7 dias: reduza 20% das compras na sua categoria principal nesta semana.',
    monthlyProjection: 'R$ 300,00 a R$ 650,00 de economia estimada com ajustes nas categorias líderes.',
  };
}

// Setup Vite middleware or static serving
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinanStat server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
