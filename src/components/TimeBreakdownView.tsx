import React, { useState } from 'react';
import {
  Calendar,
  CalendarRange,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Flame,
} from 'lucide-react';
import {
  DaySummary,
  WeekSummary,
  MonthSummary,
  Expense,
  ExpenseStatistics,
} from '../types/expense';
import {
  CATEGORY_COLORS,
  formatCurrency,
  formatDateBr,
} from '../utils/statistics';

interface TimeBreakdownViewProps {
  dailySummaries: DaySummary[];
  weeklySummaries: WeekSummary[];
  monthlySummaries: MonthSummary[];
  stats: ExpenseStatistics;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
}

export const TimeBreakdownView: React.FC<TimeBreakdownViewProps> = ({
  dailySummaries,
  weeklySummaries,
  monthlySummaries,
  stats,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [expandedDay, setExpandedDay] = useState<string | null>(
    dailySummaries[0]?.date || null
  );
  const [expandedWeek, setExpandedWeek] = useState<string | null>(
    weeklySummaries[0]?.weekKey || null
  );

  // Maximum value for proportional bars
  const maxDailyTotal = Math.max(...dailySummaries.map((d) => d.total), 1);
  const maxWeeklyTotal = Math.max(...weeklySummaries.map((w) => w.total), 1);
  const maxMonthlyTotal = Math.max(...monthlySummaries.map((m) => m.total), 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Visão Temporal de Custos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analise a frequência e o ritmo do seu dinheiro ao longo do tempo.
          </p>
        </div>

        {/* Segmented Controller (Diariamente / Semanalmente / Mensalmente) */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Diariamente ({dailySummaries.length} dias)
          </button>

          <button
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'weekly'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Semanalmente ({weeklySummaries.length} semanas)
          </button>

          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Mensalmente ({monthlySummaries.length} meses)
          </button>
        </div>
      </div>

      {/* 1. DAILY VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Mini Interactive Bar Chart of Days */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-300">
                Histórico de Gastos por Dia
              </span>
              <span className="text-slate-400">
                Média do período: <strong className="text-emerald-400 font-mono">{formatCurrency(stats.dailyAverage)}/dia</strong>
              </span>
            </div>

            <div className="flex items-end gap-1.5 sm:gap-2 h-28 pt-2 overflow-x-auto scrollbar-thin">
              {dailySummaries.slice(0, 14).reverse().map((day) => {
                const heightPct = Math.max(8, (day.total / maxDailyTotal) * 100);
                const isSelected = expandedDay === day.date;
                const isAboveAverage = day.total > stats.dailyAverage;

                return (
                  <button
                    key={day.date}
                    onClick={() => setExpandedDay(day.date)}
                    className="flex-1 min-w-[36px] max-w-[54px] flex flex-col items-center gap-1.5 h-full group focus:outline-none cursor-pointer"
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isSelected
                            ? 'bg-emerald-400 shadow-md shadow-emerald-500/30'
                            : isAboveAverage
                            ? 'bg-amber-500/80 group-hover:bg-amber-400'
                            : 'bg-slate-700 group-hover:bg-slate-500'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${formatDateBr(day.date)}: ${formatCurrency(day.total)} (${day.count} gastos)`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200">
                      {day.date.split('-')[2]}/{day.date.split('-')[1]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1.5">
              <span>← Dias anteriores</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-500 inline-block"></span> Acima da média diária
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-slate-700 inline-block"></span> Dentro da média
                </span>
              </div>
              <span>Mais recentes →</span>
            </div>
          </div>

          {/* Daily Accordion List */}
          <div className="space-y-2.5">
            {dailySummaries.map((day) => {
              const isExpanded = expandedDay === day.date;
              const isAboveAvg = day.total > stats.dailyAverage;

              return (
                <div
                  key={day.date}
                  className={`rounded-xl border transition overflow-hidden ${
                    isExpanded
                      ? 'bg-slate-900 border-slate-700 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Day Row Header */}
                  <div
                    onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex flex-col items-center justify-center text-slate-300 font-mono">
                        <span className="text-[10px] uppercase font-sans text-slate-400 font-semibold leading-tight">
                          {day.dayOfWeek.slice(0, 3)}
                        </span>
                        <span className="text-sm font-bold text-white leading-tight">
                          {day.date.split('-')[2]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {formatDateBr(day.date)}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({day.dayOfWeek})
                          </span>
                          {isAboveAvg && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium hidden sm:inline-flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400" />
                              Dia de alto gasto
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {day.count} {day.count === 1 ? 'despesa' : 'despesas'} registradas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-extrabold font-mono text-white">
                          {formatCurrency(day.total)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {((day.total / stats.total) * 100).toFixed(1)}% do período
                        </div>
                      </div>
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 sm:p-4 space-y-2">
                      {day.expenses.map((exp) => {
                        const catStyle = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Outros'];
                        return (
                          <div
                            key={exp.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text}`}
                              >
                                {exp.category}
                              </span>
                              <span className="text-xs font-medium text-slate-200">
                                {exp.description}
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {exp.paymentMethod}
                              </span>
                              <span className="font-mono font-bold text-white text-sm">
                                {formatCurrency(exp.amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEKLY VIEW */}
      {viewMode === 'weekly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weeklySummaries.map((week, idx) => {
              const heightPct = Math.max(10, (week.total / maxWeeklyTotal) * 100);
              const isSelected = expandedWeek === week.weekKey;

              return (
                <div
                  key={week.weekKey}
                  onClick={() => setExpandedWeek(isSelected ? null : week.weekKey)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/40 shadow-lg'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">
                      {week.weekKey}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {week.count} lançamentos
                    </span>
                  </div>

                  <div className="text-2xl font-extrabold font-mono text-white tracking-tight my-2">
                    {formatCurrency(week.total)}
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-2.5">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${heightPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Média diária na semana:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {formatCurrency(week.meanDaily)}/dia
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details of Selected Week */}
          {expandedWeek && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Detalhamento: {expandedWeek}</span>
                <span className="text-slate-400 font-normal">
                  Total: {formatCurrency(weeklySummaries.find((w) => w.weekKey === expandedWeek)?.total || 0)}
                </span>
              </h3>

              <div className="space-y-2">
                {weeklySummaries
                  .find((w) => w.weekKey === expandedWeek)
                  ?.expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-xs border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {formatDateBr(exp.date)}
                        </span>
                        <span className="text-white font-medium">{exp.description}</span>
                        <span className="text-[10px] text-slate-400">({exp.category})</span>
                      </div>
                      <span className="font-mono font-bold text-white text-sm">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MONTHLY VIEW */}
      {viewMode === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthlySummaries.map((month) => {
              const heightPct = Math.max(10, (month.total / maxMonthlyTotal) * 100);

              return (
                <div
                  key={month.monthKey}
                  className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{month.label}</h3>
                      <span className="text-xs text-slate-400">
                        {month.count} gastos computados
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold font-mono text-emerald-400">
                        {formatCurrency(month.total)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {formatCurrency(month.meanDaily)} por dia
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${heightPct}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
                    <span>Proporção do Histórico Geral:</span>
                    <span className="font-bold text-white font-mono">
                      {((month.total / stats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
