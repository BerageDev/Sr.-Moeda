import React from 'react';
import {
  TrendingDown,
  FileSpreadsheet,
  Plus,
  Download,
  RotateCcw,
  Sparkles,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../utils/statistics';

interface HeaderProps {
  totalAmount: number;
  expensesCount: number;
  selectedMonth: string; // YYYY-MM or 'all'
  availableMonths: Array<{ value: string; label: string }>;
  onSelectMonth: (month: string) => void;
  startDateFilter: string;
  onSetStartDateFilter: (date: string) => void;
  todayTotal: number;
  onOpenSpreadsheetModal: () => void;
  onOpenAddModal: () => void;
  onExport: () => void;
  onResetData: () => void;
  activeTab: 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses';
  setActiveTab: (tab: 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses') => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalAmount,
  expensesCount,
  selectedMonth,
  availableMonths,
  onSelectMonth,
  startDateFilter,
  onSetStartDateFilter,
  todayTotal,
  onOpenSpreadsheetModal,
  onOpenAddModal,
  onExport,
  onResetData,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
              <TrendingDown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  FinanStat <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-semibold uppercase tracking-wider">AI</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Gestão e Análise de Custos Diários, Semanais e Mensais
              </p>
            </div>
          </div>

          {/* Quick Summary Pill & Month Picker */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Start Date Control (Contar desde 26 e após) */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-amber-500/40 rounded-xl px-2.5 py-1 text-xs text-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-400">Contar desde:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => onSetStartDateFilter(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
                title="Filtrar gastos a partir desta data (ex: 26/09/2026)"
              />
              {startDateFilter && (
                <button
                  type="button"
                  onClick={() => onSetStartDateFilter('')}
                  className="text-slate-400 hover:text-white text-[11px] px-1 cursor-pointer"
                  title="Ver todo o histórico sem data inicial"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filtrar por período"
                value={selectedMonth}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900 text-slate-200">Todo o Histórico</option>
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Period & Today Badges */}
            <div className="hidden lg:flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-3 py-1 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-emerald-400 font-semibold leading-tight">
                  {startDateFilter ? `Total desde ${startDateFilter.split('-')[2]}/${startDateFilter.split('-')[1]}:` : 'Total no Período:'}
                </span>
                <span className="text-white font-extrabold font-mono text-sm leading-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="pl-2 border-l border-emerald-500/30 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold leading-tight">Gasto Hoje:</span>
                <span className="text-amber-300 font-bold font-mono text-xs leading-tight">
                  {formatCurrency(todayTotal)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto md:ml-0">
              <button
                onClick={onOpenSpreadsheetModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                title="Importar planilha Excel ou CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Importar Planilha</span>
                <span className="sm:hidden">Planilha</span>
              </button>

              <button
                onClick={onExport}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
                title="Exportar despesas para Excel"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onResetData}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 transition cursor-pointer"
                title="Reiniciar com dados de demonstração"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Novo Gasto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Visão Geral (Dia, Semana, Mês)
          </button>

          <button
            onClick={() => setActiveTab('senhor-moeda')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'senhor-moeda'
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <span className="text-sm">🪙</span>
            Senhor Moeda (Devo Gastar?)
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'statistics'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span className="flex items-center justify-center w-3.5 h-3.5 font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded">
              Σ
            </span>
            Média, Mediana & Moda
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Diagnóstico de Consumo
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Lista de Despesas ({expensesCount})
          </button>
        </div>

      </div>
    </header>
  );
};
