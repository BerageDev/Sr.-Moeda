import React from 'react';
import {
  Calculator,
  Equal,
  Repeat,
  TrendingUp,
  BarChart2,
  PieChart,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '../utils/statistics';
import { ExpenseStatistics, Expense, ModeValue } from '../types/expense';

interface StatisticsDeepDiveProps {
  stats: ExpenseStatistics;
  expenses: Expense[];
}

export const StatisticsDeepDive: React.FC<StatisticsDeepDiveProps> = ({ stats, expenses }) => {
  // Compute histogram/bins for distribution
  const amounts = expenses.map((e) => e.amount).sort((a, b) => a - b);
  const minVal = stats.min;
  const maxVal = stats.max;

  // Analysis of skewness (assimetria)
  const meanVsMedianDiff = stats.mean - stats.median;
  const isRightSkewed = meanVsMedianDiff > 5;
  const isLeftSkewed = meanVsMedianDiff < -5;
  const isSymmetric = !isRightSkewed && !isLeftSkewed;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-sm">
                Σ
              </span>
              Laboratório Estatístico: Média, Mediana & Moda
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Entenda a ciência por trás das suas despesas. A média mostra o patamar geral, a mediana elimina distorções causadas por gastos fora da curva, e a moda revela seus hábitos e padrões repetitivos de consumo.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Total de Amostras:</span>
            <span className="font-mono text-white font-bold">{stats.count} gastos analisados</span>
          </div>
        </div>
      </div>

      {/* The 3 Core Pillars in Big Interactive Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Pillar 1: Média */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-blue-400">MÉDIA (Mean)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">
              Ticket Médio
            </span>
          </div>

          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-2">
            {formatCurrency(stats.mean)}
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Média diária (dias ativos):</span>
              <span className="font-mono font-medium text-white">{formatCurrency(stats.dailyAverage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fórmula aplicada:</span>
              <span className="font-mono text-slate-400 text-[11px]">Σ Gastos ÷ N</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Representa o valor padrão de cada compra sua. Útil para estimar orçamentos futuros multiplicando o número de saídas esperadas.
            </p>
          </div>
        </div>

        {/* Pillar 2: Mediana */}
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Equal className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-purple-400">MEDIANA (Median)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
              Percentil 50%
            </span>
          </div>

          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-2">
            {formatCurrency(stats.median)}
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Posição central:</span>
              <span className="font-mono font-medium text-white">Item {Math.ceil(stats.count / 2)} de {stats.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sensibilidade a Outliers:</span>
              <span className="text-emerald-400 font-semibold">Baixíssima (Resiliente)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Exatamente metade das suas compras (50%) custaram no máximo {formatCurrency(stats.median)}. Se você tem um gasto gigante (ex: aluguel de {formatCurrency(stats.max)}), a mediana não é distorcida!
            </p>
          </div>
        </div>

        {/* Pillar 3: Moda */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Repeat className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-amber-400">MODA (Mode)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
              Maior Frequência
            </span>
          </div>

          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-2">
            {stats.mode ? formatCurrency(stats.mode.value) : 'Sem valor único'}
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Vezes repetido:</span>
              <span className="font-mono font-bold text-amber-300">
                {stats.mode ? `${stats.mode.count} ocorrências` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Impacto acumulado da moda:</span>
              <span className="font-mono font-medium text-amber-400">
                {stats.mode ? formatCurrency(stats.mode.value * stats.mode.count) : 'R$ 0,00'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              É o valor mais repetido no seu dia a dia (ex: seu almoço habitual ou transporte). Revela suas escolhas e microcomportamentos automáticos.
            </p>
          </div>
        </div>

      </div>

      {/* Skewness & Behavioral Interpretation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          Diagnóstico de Assimetria e Comportamento dos Gastos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Comparativo Média vs Mediana
            </span>
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold font-mono text-white">
                Diferença: {formatCurrency(Math.abs(meanVsMedianDiff))}
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                isRightSkewed
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : isLeftSkewed
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isRightSkewed
                  ? 'Assimetria Positiva (Cauda Longa à Direita)'
                  : isLeftSkewed
                  ? 'Assimetria Negativa'
                  : 'Distribuição Simétrica e Equilibrada'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isRightSkewed ? (
                <>
                  Sua <strong>Média ({formatCurrency(stats.mean)})</strong> é consideravelmente maior que sua <strong>Mediana ({formatCurrency(stats.median)})</strong>. Isso indica que a maioria das suas despesas diárias é de valor mais contido, mas existem gastos atípicos ou esporádicos elevados (como contas fixas altas ou compras maiores) que puxam a média para cima. A mediana reflete melhor o seu dia a dia real.
                </>
              ) : isLeftSkewed ? (
                <>
                  Sua Mediana é superior à Média, o que costuma ocorrer quando você tem uma grande quantidade de pequenos descontos ou estornos pontuais.
                </>
              ) : (
                <>
                  Sua Média e Mediana estão muito próximas! Isso demonstra consistência nos seus gastos, sem desvios abruptos ou compras fora do padrão regular.
                </>
              )}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Dispersão e Amplitude dos Dados
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Menor Despesa:</span>
                <span className="font-mono font-bold text-white text-sm">{formatCurrency(stats.min)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Maior Despesa:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{formatCurrency(stats.max)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Amplitude Total (Max - Min):</span>
                <span className="font-mono font-bold text-white text-sm">{formatCurrency(stats.range)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Desvio Padrão:</span>
                <span className="font-mono font-bold text-blue-300 text-sm">±{formatCurrency(stats.stdDev)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              O desvio padrão mede a volatilidade do seu consumo. Quanto menor o desvio, mais previsível é seu mês financeiro.
            </p>
          </div>
        </div>
      </div>

      {/* Top Modal Values Table (Valores que mais se repetem) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-amber-400" />
              Ranking dos Gastos Modais (Valores Mais Repetidos)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estes são os valores específicos que mais saem da sua conta:
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Top {stats.topModes.length} Modas
          </span>
        </div>

        {stats.topModes.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhum gasto repetido identificado até o momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Posição</th>
                  <th className="py-2.5 px-3">Valor do Gasto (R$)</th>
                  <th className="py-2.5 px-3">Frequência (Vezes)</th>
                  <th className="py-2.5 px-3">% do Total de Lançamentos</th>
                  <th className="py-2.5 px-3">Impacto Acumulado no Período</th>
                  <th className="py-2.5 px-3">Exemplo de Itens Nesse Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stats.topModes.map((modeItem: ModeValue, idx: number) => {
                  const itemsWithValue = expenses.filter(
                    (e) => Math.round(e.amount * 100) / 100 === modeItem.value
                  );
                  const sampleDesc = itemsWithValue.slice(0, 2).map((e) => e.description).join(', ');
                  const totalModalSum = modeItem.value * modeItem.count;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-slate-400 font-sans">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold text-sm">
                        {formatCurrency(modeItem.value)}
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-bold">
                        {modeItem.count}x
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{modeItem.percentage.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${Math.min(100, modeItem.percentage * 2)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">
                        {formatCurrency(totalModalSum)}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans text-xs truncate max-w-xs">
                        {sampleDesc || 'Diversos'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
