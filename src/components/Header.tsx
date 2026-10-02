import React from 'react';
import {
  TrendingDown,
  FileSpreadsheet,
  Plus,
  Download,
  Trash2,
  Sparkles,
  BarChart3,
  Calendar,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
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
  activeTab: 'login-planilha' | 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses';
  setActiveTab: (tab: 'login-planilha' | 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses') => void;
  googleUser?: User | null;
  onGoogleSignIn?: () => void;
  onGoogleLogout?: () => void;
  newlyAddedCount?: number;
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
  googleUser,
  onGoogleSignIn,
  onGoogleLogout,
  newlyAddedCount = 0,
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

            {/* Action Buttons & Google Account */}
            <div className="flex items-center gap-2 ml-auto md:ml-0 flex-wrap justify-end">
              
              {/* Google Auth Status / Login */}
              {googleUser ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      {googleUser.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <span className="text-[11px] text-slate-200 font-medium max-w-[90px] truncate hidden sm:inline">
                    {googleUser.displayName || googleUser.email}
                  </span>
                  {onGoogleLogout && (
                    <button
                      onClick={onGoogleLogout}
                      className="text-slate-400 hover:text-rose-400 p-0.5 ml-1 transition cursor-pointer"
                      title="Desconectar do Google"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : onGoogleSignIn ? (
                <button
                  onClick={onGoogleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer"
                  title="Conectar com a conta Google para buscar planilhas"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Entrar com Google</span>
                  <span className="sm:hidden">Google</span>
                </button>
              ) : null}

              {/* Envio de Planilhas */}
              <button
                onClick={onOpenSpreadsheetModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer"
                title="Enviar ou importar planilha Excel/CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Enviar Planilha</span>
                <span className="sm:hidden">Planilha</span>
              </button>

              {/* Export */}
              {expensesCount > 0 && (
                <button
                  onClick={onExport}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
                  title="Exportar despesas para Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Apagar todos os dados */}
              <button
                onClick={onResetData}
                className="flex items-center gap-1 p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 hover:border-rose-500/30 transition cursor-pointer"
                title="Apagar todos os dados da conta"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Apagar Dados</span>
              </button>

              {/* Novo Gasto */}
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Novo Gasto</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('login-planilha')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'login-planilha'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>🔐 Login & Planilha</span>
            {newlyAddedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] animate-pulse">
                +{newlyAddedCount} novos
              </span>
            )}
          </button>

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
