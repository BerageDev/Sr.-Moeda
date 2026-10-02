import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  PlusCircle,
  MessageSquare,
  Flame,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Brain,
  Calculator,
  Compass,
  CreditCard,
  PiggyBank,
  Lightbulb,
} from 'lucide-react';
import {
  ExpenseStatistics,
  CategorySummary,
  Expense,
  SenhorMoedaMessage,
  SenhorMoedaVerdict,
  SenhorMoedaResponse,
  ExpenseCategory,
  PaymentMethod,
} from '../types/expense';
import { askSenhorMoeda } from '../services/aiService';
import { formatCurrency } from '../utils/statistics';

interface SenhorMoedaAdvisorProps {
  stats: ExpenseStatistics;
  categories: CategorySummary[];
  recentExpenses: Expense[];
  startDateFilter?: string;
  todayTotal: number;
  onAddExpense?: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
}

type TopicCategory = 'todas' | 'compras' | 'investimentos' | 'cartao' | 'planejamento';

export const SenhorMoedaAdvisor: React.FC<SenhorMoedaAdvisorProps> = ({
  stats,
  categories,
  recentExpenses,
  startDateFilter,
  todayTotal,
  onAddExpense,
}) => {
  // Simulator inputs
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemCategory, setItemCategory] = useState<ExpenseCategory>('Alimentação');
  const [activeTopic, setActiveTopic] = useState<TopicCategory>('todas');

  // Chat conversation
  const [messages, setMessages] = useState<SenhorMoedaMessage[]>([
    {
      id: 'welcome',
      sender: 'senhor-moeda',
      text: `Olá! Eu sou o Senhor Moeda 🪙, o seu conselheiro financeiro pessoal e guardião supremo do seu bolso!\n\nAgora estou com inteligência máxima integrada à API do Google para responder a TODAS as suas perguntas e dúvidas: desde avaliar se você deve ou não gastar em uma compra hoje, até explicar investimentos (Tesouro Selic, CDI, Reserva de Emergência), juros do cartão, regra 50-30-20 e estratégias de enriquecimento.\n\nSeus dados reais estão na ponta do meu lápis: acumulado de ${formatCurrency(stats.total)} desde 26/09 (sendo apenas ${formatCurrency(todayTotal)} hoje, ticket médio de ${formatCurrency(stats.mean)}). O que você quer me perguntar ou testar agora?`,
      verdict: 'ORIENTACAO',
      verdictLabel: 'Cérebro Financeiro Pronto',
      financialConcept: 'Educação Financeira & Decisão Consciente',
      mathProjection: `Seu teto diário recomendado é de ${formatCurrency(stats.mean)}, e seu gasto hoje está em ${formatCurrency(todayTotal)}.`,
      timestamp: Date.now(),
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<SenhorMoedaResponse | null>(null);
  const [expenseAddedSuccess, setExpenseAddedSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Topic Questions Bank
  const topicQuestions: Record<TopicCategory, string[]> = {
    todas: [
      'Devo pedir um delivery de R$ 60 hoje à noite?',
      'O que rende mais hoje: Poupança, Nubank ou Tesouro Selic?',
      'Quero comprar um tênis de R$ 220, vale a pena agora?',
      'Quanto devo ter na minha Reserva de Emergência?',
      'Onde estou gastando mais desde o dia 26 e como economizar?',
      'Vale a pena parcelar compras sem juros ou pedir desconto à vista?',
    ],
    compras: [
      'Devo pedir um delivery de R$ 60 hoje à noite?',
      'Quero comprar um tênis de R$ 220, vale a pena agora?',
      'Posso gastar R$ 45 no almoço executivo?',
      'Vale a pena comprar um celular de R$ 2.500 agora?',
      'Devo gastar R$ 150 em um jantar de fim de semana?',
    ],
    investimentos: [
      'O que rende mais hoje: Poupança, Nubank ou Tesouro Selic?',
      'Quanto devo ter na minha Reserva de Emergência e onde deixar?',
      'Se eu investir R$ 100 por mês no CDI a 100%, quanto terei em 5 anos?',
      'Qual a diferença prática entre CDI e Taxa Selic?',
      'Como começar a investir com pouco dinheiro?',
    ],
    cartao: [
      'Vale a pena parcelar compras sem juros ou pedir desconto à vista?',
      'O que fazer se a fatura do cartão vier maior do que posso pagar?',
      'Como funciona o rotativo do cartão e qual o perigo real dos juros?',
      'Quantos cartões de crédito é saudável ter na carteira?',
      'Como negociar anuidade ou taxa com meu banco?',
    ],
    planejamento: [
      'Como aplicar a regra 50-30-20 na minha vida?',
      'Onde estou gastando mais desde o dia 26 e como cortar 20%?',
      'Qual meta de economia você me recomenda para os próximos 7 dias?',
      'Como calcular meu custo de oportunidade em cada compra?',
      'Como montar um orçamento mensal que eu consiga seguir sem sofrer?',
    ],
  };

  const handleAskQuestion = async (
    questionText: string,
    simulationData?: { item: string; amount: number; category?: string }
  ) => {
    if (!questionText.trim() && !simulationData) return;

    const userText =
      questionText.trim() ||
      `Devo gastar ${formatCurrency(simulationData?.amount || 0)} em "${simulationData?.item}"?`;

    // Add user message to state
    const userMsg: SenhorMoedaMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);
    setExpenseAddedSuccess(null);

    try {
      const response = await askSenhorMoeda({
        question: userText,
        simulation: simulationData,
        conversationHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        userStats: { ...stats, todayTotal },
        categoryBreakdown: categories,
        recentExpenses,
        startDateFilter,
      });

      setLastVerdict(response);

      const aiMsg: SenhorMoedaMessage = {
        id: `sr-moeda-${Date.now()}`,
        sender: 'senhor-moeda',
        text: response.reply,
        verdict: response.verdict,
        verdictLabel: response.verdictLabel,
        financialImpact: response.financialImpact,
        suggestedAlternative: response.suggestedAlternative,
        financialConcept: response.financialConcept,
        mathProjection: response.mathProjection,
        actionSteps: response.actionSteps,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error asking Senhor Moeda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(itemAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return;

    const name = itemName.trim() || 'este item';
    const query = `Senhor Moeda, devo gastar ${formatCurrency(amountNum)} comprando "${name}" (${itemCategory})?`;

    handleAskQuestion(query, {
      item: name,
      amount: amountNum,
      category: itemCategory,
    });
  };

  const handleRegisterFromSimulation = (name: string, amount: number, category: ExpenseCategory) => {
    if (!onAddExpense) return;
    const todayStr = new Date().toISOString().split('T')[0];
    onAddExpense({
      description: name,
      amount,
      category,
      date: todayStr,
      paymentMethod: 'Cartão de Débito',
    });
    setExpenseAddedSuccess(`✓ Compra "${name}" de ${formatCurrency(amount)} foi lançada nas suas despesas de hoje!`);
    setTimeout(() => setExpenseAddedSuccess(null), 5000);
  };

  const getVerdictBadge = (verdict?: SenhorMoedaVerdict, label?: string) => {
    switch (verdict) {
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {label || 'Selo Sr. Moeda: Pode Gastar!'}
          </span>
        );
      case 'CAUTELA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {label || 'Alerta Amarelo: Pense Bem!'}
          </span>
        );
      case 'RECUSADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            {label || 'Segure o Bolso! Não Gaste Agora'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold shadow-sm">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            {label || 'Orientação Inteligente do Sr. Moeda'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Hero Banner of Senhor Moeda Inteligentíssimo */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Glow & Coin Aesthetics */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar and Persona Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {/* Senhor Moeda Golden Character with Brain Glow */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center flex-col relative overflow-hidden">
                  <span className="text-3xl sm:text-4xl filter drop-shadow">🪙</span>
                  <div className="absolute bottom-0 w-full bg-gradient-to-r from-amber-500/30 to-yellow-400/30 text-[9px] font-black text-amber-300 uppercase tracking-tighter text-center py-0.5 border-t border-amber-500/40">
                    Sr. Moeda Pro
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center" title="API Gemini Conectada">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Senhor Moeda
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Brain className="w-3 h-3 text-amber-400" />
                  Inteligentíssimo • API Gemini
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Conselheiro de elite que responde a <strong>todas as suas dúvidas financeiras</strong>: decisões de compras diárias, investimentos (Selic, CDI, Reserva), parcelamentos, juros, corte de despesas e planejamento estratégico.
              </p>
            </div>
          </div>

          {/* Real-Time Metrics Known by Sr. Moeda */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs w-full lg:w-auto">
            <div className="p-2 rounded-xl bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Total desde 26/09:</span>
              <strong className="text-sm font-bold text-white font-mono">{formatCurrency(stats.total)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Gasto Hoje:</span>
              <strong className="text-sm font-bold text-amber-300 font-mono">{formatCurrency(todayTotal)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Ticket Médio:</span>
              <strong className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(stats.mean)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Moda (Mais Frequente):</span>
              <strong className="text-sm font-bold text-blue-400 font-mono">
                {stats.mode ? formatCurrency(stats.mode.value) : 'R$ 35,00'}
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Purchase Simulator + Interactive Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 cols): "Devo Gastar ou Não?" Purchase Simulator & Quick Topics */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1-Click Purchase Decision Simulator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Simulador de Decisão</h3>
                  <span className="text-[11px] text-slate-400">Devo gastar ou não com isso?</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                Cálculo em Tempo Real
              </span>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  O que você quer comprar?
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Tênis novo, Delivery de sushi, Fone bluetooth..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">R$</span>
                    <input
                      type="text"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Alimentação">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Compras & Vestuário">Compras & Roupas</option>
                    <option value="Lazer & Entretenimento">Lazer / Delivery</option>
                    <option value="Serviços & Assinaturas">Serviços / Assinaturas</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !itemAmount}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Senhor Moeda está calculando...</span>
                  </>
                ) : (
                  <>
                    <span>🪙 Consultar Veredito do Sr. Moeda</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Success notification if added */}
            {expenseAddedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{expenseAddedSuccess}</span>
              </div>
            )}

            {/* Last Verdict Highlight Card */}
            {lastVerdict && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Último Veredito Emitido:
                  </span>
                  {getVerdictBadge(lastVerdict.verdict, lastVerdict.verdictLabel)}
                </div>

                <h4 className="text-xs font-bold text-white">
                  "{lastVerdict.headline}"
                </h4>

                {lastVerdict.financialConcept && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <Brain className="w-3 h-3 text-amber-400" />
                    <span>Conceito: {lastVerdict.financialConcept}</span>
                  </div>
                )}

                {lastVerdict.mathProjection && (
                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-blue-400 block text-[10px] uppercase tracking-wide flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> Projeção Matemática:
                    </strong>
                    {lastVerdict.mathProjection}
                  </div>
                )}

                {lastVerdict.financialImpact && (
                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block text-[10px] uppercase tracking-wide">Impacto no Bolso:</strong>
                    {lastVerdict.financialImpact}
                  </div>
                )}

                {lastVerdict.suggestedAlternative && (
                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400 block text-[10px] uppercase tracking-wide">Dica do Sr. Moeda:</strong>
                    {lastVerdict.suggestedAlternative}
                  </div>
                )}

                {/* Option to register as an expense if user decided to buy */}
                {itemName && itemAmount && onAddExpense && (
                  <button
                    type="button"
                    onClick={() => {
                      const amount = parseFloat(itemAmount.replace(',', '.'));
                      handleRegisterFromSimulation(itemName, amount, itemCategory);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Decidi gastar! Lançar como despesa de hoje</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Topic Categories & Frequently Asked Questions */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Tire dúvidas com o Senhor Moeda:
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">1 toque</span>
            </div>

            {/* Topic Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'compras', label: 'Devo Gastar?' },
                  { id: 'investimentos', label: 'Investimentos' },
                  { id: 'cartao', label: 'Cartão & Juros' },
                  { id: 'planejamento', label: 'Planejamento' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTopic(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    activeTopic === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Questions for active topic */}
            <div className="space-y-1.5 pt-1">
              {topicQuestions[activeTopic].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAskQuestion(q)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/40 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="truncate pr-2">{q}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (7 cols): Interactive Chat with Senhor Moeda */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[700px]">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-lg shadow-sm">
                🪙
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Conversa com o Senhor Moeda
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API do Google conectada • Inteligência máxima ativada
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'reset',
                    sender: 'senhor-moeda',
                    text: `Conversa reiniciada! Seus dados continuam no meu radar: total acumulado de ${formatCurrency(stats.total)} desde 26/09 (sendo ${formatCurrency(todayTotal)} hoje). Qual pergunta, dúvida de investimento ou compra você quer analisar agora?`,
                    verdict: 'ORIENTACAO',
                    verdictLabel: 'Pronto para Responder Tudo',
                    timestamp: Date.now(),
                  },
                ]);
                setLastVerdict(null);
              }}
              className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
              title="Limpar histórico da conversa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'senhor-moeda' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm flex items-center justify-center shrink-0 mt-1 shadow-md">
                    🪙
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'senhor-moeda' && msg.verdict && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      {getVerdictBadge(msg.verdict, msg.verdictLabel)}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Financial Concept Tag */}
                  {msg.financialConcept && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <Brain className="w-3 h-3 text-amber-400" />
                      <span>{msg.financialConcept}</span>
                    </div>
                  )}

                  {/* Message Main Body */}
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Math Projection Box */}
                  {msg.mathProjection && (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/30 text-[11px] text-slate-300 space-y-1">
                      <strong className="text-blue-400 block text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Calculator className="w-3 h-3" /> Projeção Matemática:
                      </strong>
                      <p>{msg.mathProjection}</p>
                    </div>
                  )}

                  {/* Financial Impact */}
                  {msg.financialImpact && (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/20 text-[11px] text-slate-300 space-y-1">
                      <strong className="text-amber-400 block text-[10px] uppercase tracking-wider">
                        Impacto no Bolso:
                      </strong>
                      <p>{msg.financialImpact}</p>
                    </div>
                  )}

                  {/* Suggested Alternative */}
                  {msg.suggestedAlternative && (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                      <strong className="text-emerald-400 block text-[10px] uppercase tracking-wider">
                        Dica Esperta do Sr. Moeda:
                      </strong>
                      <p>{msg.suggestedAlternative}</p>
                    </div>
                  )}

                  {/* Action Steps */}
                  {msg.actionSteps && msg.actionSteps.length > 0 && (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                      <strong className="text-slate-300 block text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Passos Práticos:
                      </strong>
                      <ul className="space-y-1 list-disc list-inside text-slate-400">
                        {msg.actionSteps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    Você
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm flex items-center justify-center shrink-0">
                  🪙
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Senhor Moeda está consultando dados, calculando juros e preparando seu conselho...</span>
                </div>
              </div>
            )}

            {/* Interactive follow-up suggestions from last verdict */}
            {lastVerdict?.quickQuestions && lastVerdict.quickQuestions.length > 0 && !isLoading && (
              <div className="pt-2 pb-1 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block flex items-center gap-1">
                  <Compass className="w-3 h-3 text-amber-400" />
                  Sugestões de perguntas para o Senhor Moeda responder em seguida:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {lastVerdict.quickQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => handleAskQuestion(q)}
                      className="text-left px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 border border-amber-500/30 hover:border-amber-400 transition cursor-pointer shadow-sm"
                    >
                      {q} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion(inputQuestion);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Pergunte qualquer coisa ao Senhor Moeda: 'Devo gastar R$ 80 hoje?', 'O que é Selic?', 'Como investir...?'"
                disabled={isLoading}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuestion.trim()}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Perguntar</span>
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-amber-400" />
                API do Google Gemini: Responde sobre gastos, investimentos, juros e matemática.
              </span>
              <span>Cruzando dados desde 26/09</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
