import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { OverviewMetrics } from './components/OverviewMetrics';
import { NaturalLanguageInput } from './components/NaturalLanguageInput';
import { StatisticsDeepDive } from './components/StatisticsDeepDive';
import { TimeBreakdownView } from './components/TimeBreakdownView';
import { FinancialAdvisor } from './components/FinancialAdvisor';
import { SenhorMoedaAdvisor } from './components/SenhorMoedaAdvisor';
import { ExpenseList } from './components/ExpenseList';
import { SpreadsheetImportModal } from './components/SpreadsheetImportModal';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { GoogleDriveSyncCard } from './components/GoogleDriveSyncCard';
import { Expense } from './types/expense';
import { generateSeedExpenses } from './utils/seedData';
import {
  calculateStatistics,
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
  getCategoryBreakdown,
  formatCurrency,
} from './utils/statistics';
import { exportExpensesToExcel } from './utils/spreadsheetParser';

const STORAGE_KEY = 'finanstat_expenses_v4';

export default function App() {
  // Load expenses from localStorage or generate seed starting from 26/09
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading expenses from storage:', e);
    }
    return generateSeedExpenses();
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('2026-09-26');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses'>('dashboard');

  // Modals state
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // Save to localStorage whenever expenses change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses to storage:', e);
    }
  }, [expenses]);

  // Available months list
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      if (e.date) monthSet.add(e.date.substring(0, 7));
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => {
        const [y, m] = ym.split('-');
        const idx = parseInt(m, 10) - 1;
        return {
          value: ym,
          label: `${monthNames[idx] || ym} ${y}`,
        };
      });
  }, [expenses]);

  // Filtered expenses by period and start date
  const periodExpenses = useMemo(() => {
    let list = expenses;
    if (startDateFilter) {
      list = list.filter((e) => e.date >= startDateFilter);
    }
    if (selectedMonth !== 'all') {
      list = list.filter((e) => e.date.startsWith(selectedMonth));
    }
    return list;
  }, [expenses, startDateFilter, selectedMonth]);

  // Today's total spent (e.g. today is 2026-10-01)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  // Statistical calculations
  const stats = useMemo(() => calculateStatistics(periodExpenses), [periodExpenses]);
  const dailySummaries = useMemo(() => getDailySummary(periodExpenses), [periodExpenses]);
  const weeklySummaries = useMemo(() => getWeeklySummary(periodExpenses), [periodExpenses]);
  const monthlySummaries = useMemo(() => getMonthlySummary(periodExpenses), [periodExpenses]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(periodExpenses), [periodExpenses]);

  // Handlers for expenses
  const handleAddExpenses = (newExpenses: Omit<Expense, 'id' | 'createdAt'>[]) => {
    const timestamp = Date.now();
    const prepared: Expense[] = newExpenses.map((e, idx) => ({
      ...e,
      id: `exp-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: timestamp + idx,
    }));

    setExpenses((prev) => [...prepared, ...prev]);
  };

  const handleReplaceExpensesWithDriveData = (newExpenses: Omit<Expense, 'id' | 'createdAt'>[]) => {
    const timestamp = Date.now();
    const prepared: Expense[] = newExpenses.map((e, idx) => ({
      ...e,
      id: `drive-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: timestamp + idx,
    }));
    setExpenses(prepared);
    setSelectedMonth('all');
  };

  const handleSaveExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>, existingId?: string) => {
    if (existingId) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === existingId ? { ...e, ...expenseData } : e))
      );
    } else {
      handleAddExpenses([expenseData]);
    }
    setExpenseToEdit(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    setExpenses([]);
  };

  const handleResetData = () => {
    if (window.confirm('Deseja recarregar a base com dados realistas de exemplo?')) {
      const fresh = generateSeedExpenses();
      setExpenses(fresh);
      setSelectedMonth('all');
    }
  };

  const handleExport = () => {
    const filename = `gastos_finanstat_${selectedMonth === 'all' ? 'completo' : selectedMonth}.xlsx`;
    exportExpensesToExcel(periodExpenses, filename);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        totalAmount={stats.total}
        expensesCount={stats.count}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onSelectMonth={setSelectedMonth}
        startDateFilter={startDateFilter}
        onSetStartDateFilter={setStartDateFilter}
        todayTotal={todayTotal}
        onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
        onOpenAddModal={() => {
          setExpenseToEdit(null);
          setIsAddModalOpen(true);
        }}
        onExport={handleExport}
        onResetData={handleResetData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Active Date Scope Info Banner */}
        {startDateFilter && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-slate-300">
                Contagem iniciada em <strong className="text-amber-300 font-mono">26/09/2026 e após</strong>: total acumulado de <strong className="text-white font-mono text-sm">{formatCurrency(stats.total)}</strong> ({stats.count} despesas distribuídas pelos dias, sendo apenas <strong className="text-emerald-400 font-mono">{formatCurrency(todayTotal)}</strong> hoje).
              </span>
            </div>
            <button
              onClick={() => setStartDateFilter('')}
              className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Ver histórico completo
            </button>
          </div>
        )}

        {/* Central Metric Cards (Total, Média, Mediana, Moda, Maior Gasto) */}
        <OverviewMetrics
          stats={stats}
          onOpenStatistics={() => setActiveTab('statistics')}
        />

        {/* Tab 1: Dashboard Principal */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Sincronização direta com Google Drive (para puxar a planilha recém-enviada) */}
            <GoogleDriveSyncCard
              onReplaceExpensesWithDriveData={handleReplaceExpensesWithDriveData}
              onAppendExpensesFromDrive={handleAddExpenses}
            />

            {/* Lançamento Rápido (Mensagem Natural com IA / Voz / Quick Add) */}
            <NaturalLanguageInput onAddExpenses={handleAddExpenses} />

            {/* Visão Temporal (Diária, Semanal, Mensal) */}
            <TimeBreakdownView
              dailySummaries={dailySummaries}
              weeklySummaries={weeklySummaries}
              monthlySummaries={monthlySummaries}
              stats={stats}
              onEditExpense={(item) => {
                setExpenseToEdit(item);
                setIsAddModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
            />

            {/* Quick Preview of Top Categories & AI Advisor Link */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Category mini summary */}
              <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Principais Fontes de Custo
                  </h3>
                  <button
                    onClick={() => setActiveTab('advisor')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Ver Diagnóstico Completo →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {categoryBreakdown.slice(0, 5).map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white font-bold">{formatCurrency(cat.total)}</span>
                          <span className="font-mono text-slate-400 text-[11px]">({cat.percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Senhor Moeda Featured Card */}
              <div className="bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                      <span>🪙</span> Novo Conselheiro
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h4 className="text-base font-black text-white flex items-center gap-1.5">
                    Senhor Moeda 🪙
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Em dúvida se deve comprar algo hoje? Peça conselho ao Senhor Moeda e receba o veredito se deve gastar ou não com base nos seus gastos reais.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('senhor-moeda')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span>Perguntar: Devo Gastar ou Não?</span>
                  <span>→</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Senhor Moeda Conselheiro Interativo */}
        {activeTab === 'senhor-moeda' && (
          <SenhorMoedaAdvisor
            stats={stats}
            categories={categoryBreakdown}
            recentExpenses={periodExpenses}
            startDateFilter={startDateFilter}
            todayTotal={todayTotal}
            onAddExpense={(item) => handleAddExpenses([item])}
          />
        )}

        {/* Tab 3: Estatísticas Aprofundadas (Média, Mediana & Moda) */}
        {activeTab === 'statistics' && (
          <StatisticsDeepDive stats={stats} expenses={periodExpenses} />
        )}

        {/* Tab 3: Conselheiro Financeiro IA */}
        {activeTab === 'advisor' && (
          <FinancialAdvisor
            stats={stats}
            categories={categoryBreakdown}
            recentExpenses={periodExpenses}
          />
        )}

        {/* Tab 4: Lista Completa de Despesas */}
        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={periodExpenses}
            onEditExpense={(item) => {
              setExpenseToEdit(item);
              setIsAddModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onClearAll={handleClearAll}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FinanStat AI • Análise Estatística de Custos (Média, Mediana & Moda)</span>
          <span className="text-[11px] text-slate-600">Entende planilhas, textos naturais e comandos de voz</span>
        </div>
      </footer>

      {/* Modals */}
      <SpreadsheetImportModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        onImportExpenses={(imported) => {
          handleAddExpenses(imported);
          setActiveTab('dashboard');
        }}
      />

      <ExpenseFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
      />
    </div>
  );
}
