import React, { useState } from 'react';
import {
  Wallet,
  Calculator,
  Equal,
  Repeat,
  TrendingUp,
  Info,
  CalendarDays,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency } from '../utils/statistics';
import { ExpenseStatistics } from '../types/expense';

interface OverviewMetricsProps {
  stats: ExpenseStatistics;
  onOpenStatistics: () => void;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ stats, onOpenStatistics }) => {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const toggleInfo = (id: string) => {
    setActiveInfo(activeInfo === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* 1. Total Gasto */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Total Gasto
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {stats.count} itens
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(stats.total)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Média por dia ativo:</span>
            <span className="font-mono text-slate-200 font-medium">
              {formatCurrency(stats.dailyAverage)}
            </span>
          </div>
        </div>

        {/* 2. Média (Mean) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden group hover:border-blue-500/30 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              Média (Ticket)
            </span>
            <button
              onClick={() => toggleInfo('mean')}
              className="text-slate-500 hover:text-blue-400 transition cursor-pointer"
              title="O que significa a Média?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(stats.mean)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Soma ÷ {stats.count || 1} compras</span>
            <span className="text-blue-400 text-[11px] font-medium">Valor padrão</span>
          </div>
        </div>

        {/* 3. Mediana (Median) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden group hover:border-purple-500/30 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Equal className="w-3.5 h-3.5 text-purple-400" />
              Mediana (50%)
            </span>
            <button
              onClick={() => toggleInfo('median')}
              className="text-slate-500 hover:text-purple-400 transition cursor-pointer"
              title="O que significa a Mediana?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(stats.median)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Metade das compras ≤</span>
            <span className="text-purple-400 text-[11px] font-medium">Imune a extremos</span>
          </div>
        </div>

        {/* 4. Moda (Mode) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-amber-400" />
              Moda (Frequência)
            </span>
            <button
              onClick={() => toggleInfo('mode')}
              className="text-slate-500 hover:text-amber-400 transition cursor-pointer"
              title="O que significa a Moda?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {stats.mode ? formatCurrency(stats.mode.value) : 'Sem repetição'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            {stats.mode ? (
              <>
                <span>Repetiu <strong className="text-amber-300 font-mono">{stats.mode.count}x</strong></span>
                <span className="text-amber-400 text-[11px] font-medium">
                  {stats.mode.percentage.toFixed(0)}% dos lançamentos
                </span>
              </>
            ) : (
              <span>Valores todos distintos</span>
            )}
          </div>
        </div>

        {/* 5. Maior Gasto & Dispersão */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden group hover:border-rose-500/30 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              Pico & Dispersão
            </span>
            <button
              onClick={() => toggleInfo('variance')}
              className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
              title="O que é o Desvio Padrão?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(stats.max)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Desvio padrão:</span>
            <span className="text-slate-300 font-mono text-[11px] font-medium">
              ±{formatCurrency(stats.stdDev)}
            </span>
          </div>
        </div>

      </div>

      {/* Expandable Didactic Explanation */}
      {activeInfo && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-3 transition">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            {activeInfo === 'mean' && (
              <p>
                <strong>Média Aritmética (Mean):</strong> É o ticket médio por compra. Obtido somando todos os gastos e dividindo pelo total de despesas ({stats.count}). Se a sua média for muito mais alta que a mediana, significa que você teve compras isoladas muito caras (ex: aluguel ou eletrônicos) que puxaram a média para cima.
              </p>
            )}
            {activeInfo === 'median' && (
              <p>
                <strong>Mediana (Median):</strong> É o valor que está exatamente no meio da sua lista de gastos ordenada. 50% das suas despesas custaram menos ou igual a {formatCurrency(stats.median)}, e 50% custaram mais. A mediana é excelente porque não se deixa distorcer por um gasto gigante pontual.
              </p>
            )}
            {activeInfo === 'mode' && (
              <p>
                <strong>Moda (Mode):</strong> É o valor de gasto mais frequente no seu dia a dia. Identifica seus hábitos rotineiros e despesas repetidas (como almoço diário de {stats.mode ? formatCurrency(stats.mode.value) : 'R$ X'}, cafés ou corridas de aplicativo). Prestar atenção na moda evita que despesas automáticas corroam seu salário.
              </p>
            )}
            {activeInfo === 'variance' && (
              <p>
                <strong>Dispersão e Desvio Padrão:</strong> Seu maior gasto no período foi de {formatCurrency(stats.max)} e o menor foi de {formatCurrency(stats.min)}. O desvio padrão de ±{formatCurrency(stats.stdDev)} indica o quanto seus gastos oscilam ao redor da média.
              </p>
            )}
          </div>
          <button
            onClick={() => setActiveInfo(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
