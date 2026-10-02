import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  PieChart,
  Lightbulb,
  AlertTriangle,
  Target,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Send,
  Loader2,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import {
  CategorySummary,
  ExpenseStatistics,
  Expense,
  AIAdvice,
} from '../types/expense';
import { getFinancialAdvisorAdvice } from '../services/aiService';
import { formatCurrency, CATEGORY_COLORS } from '../utils/statistics';

interface FinancialAdvisorProps {
  stats: ExpenseStatistics;
  categories: CategorySummary[];
  recentExpenses: Expense[];
}

export const FinancialAdvisor: React.FC<FinancialAdvisorProps> = ({
  stats,
  categories,
  recentExpenses,
}) => {
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [customAdviceHistory, setCustomAdviceHistory] = useState<
    Array<{ question: string; answer: string }>
  >([]);

  // Top spending category
  const topCategory = categories[0] || null;
  const topThreeCategories = categories.slice(0, 3);
  const topThreePercentage = topThreeCategories.reduce((s, c) => s + c.percentage, 0);

  // Fetch AI advice
  const fetchAdvice = async (customGoal?: string) => {
    setIsLoading(true);
    try {
      const payload = {
        statistics: stats,
        categoryBreakdown: categories,
        timeBreakdown: {
          dailyTotalAvg: stats.dailyAverage,
          topSpendingDay: recentExpenses[0]?.date,
          activeDays: stats.activeDaysCount,
        },
        recentExpenses: recentExpenses.slice(0, 20),
        userGoal: customGoal,
      };

      const result = await getFinancialAdvisorAdvice(payload);
      if (result.advice) {
        setAdvice(result.advice);
      }
    } catch (e) {
      console.error('Error fetching advice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!advice && stats.count > 0) {
      fetchAdvice();
    }
  }, [stats.count]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    setIsAsking(true);
    const q = userQuestion;
    setUserQuestion('');

    try {
      const payload = {
        statistics: stats,
        categoryBreakdown: categories,
        timeBreakdown: {
          dailyTotalAvg: stats.dailyAverage,
          activeDays: stats.activeDaysCount,
        },
        recentExpenses: recentExpenses.slice(0, 20),
        userGoal: q,
      };

      const result = await getFinancialAdvisorAdvice(payload);
      if (result.advice) {
        setCustomAdviceHistory((prev) => [
          ...prev,
          {
            question: q,
            answer: result.advice.consumptionDiagnosis + ' ' + result.advice.headline,
          },
        ]);
        setAdvice(result.advice);
      }
    } catch (err) {
      console.error('Error asking:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ONDE VOCÊ ESTÁ GASTANDO MAIS (Visual Breakdown & Diagnosis) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              Onde Você Está Gastando e Consumindo Mais?
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificação clara dos maiores focos de consumo e categorias que drenam sua renda.
            </p>
          </div>

          {topCategory && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300">
                Vilão principal: <strong className="text-white">{topCategory.category}</strong> ({topCategory.percentage.toFixed(0)}% do orçamento)
              </span>
            </div>
          )}
        </div>

        {/* Top 3 Concentration Callout */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-xs text-slate-300 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Índice de Concentração de Gastos
            </span>
            <p>
              Suas 3 principais categorias somam <strong className="text-emerald-400 font-mono text-sm">{topThreePercentage.toFixed(1)}%</strong> do seu custo total.
              Concentrar esforços nessas 3 categorias gera mais de 80% do resultado financeiro.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {topThreeCategories.map((c, i) => (
              <span
                key={c.category}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-medium"
              >
                #{i + 1} {c.category} ({c.percentage.toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>

        {/* Category Visual Bars */}
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const catColors = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Outros'];

            return (
              <div
                key={cat.category}
                className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-bold text-[11px]">
                      #{idx + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-white text-sm">
                      {cat.category}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({cat.count} compras • ticket médio {formatCurrency(cat.mean)})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-bold font-mono text-sm">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md min-w-[50px] text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CONSELHOS E DICAS PERSONALIZADAS DA IA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Conselheiro Financeiro IA
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Gemini 3.8
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Diagnóstico estatístico, metas de economia e conselhos práticos para o seu bolso.
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAdvice()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition cursor-pointer"
            title="Atualizar diagnóstico com IA"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recalcular Conselhos</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            <p>O Consultor Financeiro IA está processando suas médias, medianas e categorias...</p>
          </div>
        ) : advice ? (
          <div className="space-y-5">
            {/* Headline Callout */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-900 border border-emerald-500/30 rounded-2xl p-4.5 flex items-start gap-3.5">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {advice.headline}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {advice.consumptionDiagnosis}
                </p>
              </div>
            </div>

            {/* Statistical Insight (Média, Mediana & Moda explicadas pelo Gemini) */}
            <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="font-mono text-sm">Σ</span> O Que a Média, Mediana e Moda Revelam Sobre Seus Hábitos:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {advice.statisticalInsight}
              </p>
            </div>

            {/* Top Practical Recommendations with Savings Estimates */}
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-emerald-400" />
                Recomendações Práticas de Otimização & Economia
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {advice.topRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Dica #{i + 1}
                        </span>
                        {rec.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {rec.category}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[10px]">Economia Estimada:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {rec.potentialMonthlySaving}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaks & Challenge Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Leaks Alert */}
              <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/20 space-y-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Alerta de Pequenos Ralos de Dinheiro (Vazamentos)
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {advice.leaksAlert.map((leak, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{leak}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Saving Challenge */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  Desafio de Economia Sugerido
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {advice.savingChallenge}
                </p>
                <div className="pt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Projeção: {advice.monthlyProjection}</span>
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* 3. PERGUNTAR QUALQUER COISA AO CONSULTOR IA */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            Tire Dúvidas ou Peça Conselhos Específicos
          </h3>

          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ex: Como posso economizar R$ 400 no próximo mês cortando alimentação e lazer?"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={isAsking || !userQuestion.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 font-bold text-slate-950 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Consultar</span>
            </button>
          </form>

          {/* Custom Question History */}
          {customAdviceHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              {customAdviceHistory.map((item, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-emerald-400 block">Você: {item.question}</span>
                  <p className="text-slate-300">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
