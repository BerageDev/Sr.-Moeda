import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  Download,
  CheckCircle2,
} from 'lucide-react';
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
import { LoginAndSpreadsheetPortal } from './components/LoginAndSpreadsheetPortal';
import { Expense } from './types/expense';
import {
  initAuth,
  googleSignIn,
  logout,
} from './services/googleDriveAuth';
import {
  calculateStatistics,
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
  getCategoryBreakdown,
  formatCurrency,
} from './utils/statistics';
import { exportExpensesToExcel } from './utils/spreadsheetParser';

const STORAGE_KEY = 'finanstat_user_expenses_clean';

export default function App() {
  // Load expenses from localStorage (only user imported data, strictly NO seed/mock data)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      // Clear old demo/mock storage keys to guarantee all prior test data is wiped
      ['finanstat_expenses_v1', 'finanstat_expenses_v2', 'finanstat_expenses_v3', 'finanstat_expenses_v4'].forEach((k) => {
        localStorage.removeItem(k);
      });
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading expenses from storage:', e);
    }
    return [];
  });

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'login-planilha' | 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses'>('login-planilha');
  const [currentFileName, setCurrentFileName] = useState<string>(() => {
    return localStorage.getItem('finanstat_spreadsheet_name') || 'controle_de_gastos.xlsx';
  });
  const [newlyAddedCount, setNewlyAddedCount] = useState<number>(0);
  const [downloadAlert, setDownloadAlert] = useState<string | null>(null);

  // Modals state
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // Monitor Google Authentication state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
      }
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
    setNewlyAddedCount((prev) => prev + newExpenses.length);
    setDownloadAlert(`✓ ${newExpenses.length} novo(s) gasto(s) somado(s) à sua planilha! Baixe a planilha atualizada para usar sempre como login.`);
  };

  const handleImportSpreadsheetData = (newExpenses: Omit<Expense, 'id' | 'createdAt'>[], fileName?: string) => {
    const timestamp = Date.now();
    const prepared: Expense[] = newExpenses.map((e, idx) => ({
      ...e,
      id: `imp-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: timestamp + idx,
    }));
    setExpenses(prepared);
    if (fileName) {
      setCurrentFileName(fileName);
      localStorage.setItem('finanstat_spreadsheet_name', fileName);
    }
    setNewlyAddedCount(0);
    setSelectedMonth('all');
    setDownloadAlert(null);
  };

  const handleReplaceExpensesWithDriveData = (newExpenses: Omit<Expense, 'id' | 'createdAt'>[]) => {
    handleImportSpreadsheetData(newExpenses, 'Google Drive');
  };

  const handleDownloadUpdatedSpreadsheet = () => {
    if (expenses.length === 0) return;
    const cleanName = currentFileName
      .replace(/\.(xlsx|xls|csv)$/i, '')
      .replace(/_atualizado.*$/i, '');
    const filename = `${cleanName}_atualizado.xlsx`;
    exportExpensesToExcel(expenses, filename);
    setNewlyAddedCount(0);
    setDownloadAlert(`✓ Planilha "${filename}" com todos os ${expenses.length} lançamentos somados foi baixada com sucesso! Guarde-a para usar como login na próxima vez.`);
    setTimeout(() => setDownloadAlert(null), 7000);
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
    setNewlyAddedCount(0);
  };

  const handleClearAllData = () => {
    if (window.confirm('Tem certeza de que deseja apagar todos os dados de conta e despesas? Seus dados só serão preenchidos via login do Google ou envio de planilhas.')) {
      setExpenses([]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('finanstat_spreadsheet_name');
      setCurrentFileName('controle_de_gastos.xlsx');
      setNewlyAddedCount(0);
      setSelectedMonth('all');
      setStartDateFilter('');
      setActiveTab('login-planilha');
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
        onResetData={handleClearAllData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleLogout={handleGoogleLogout}
        newlyAddedCount={newlyAddedCount}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Floating/Inline Alert when new expenses have been added to the spreadsheet */}
        {newlyAddedCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 px-4 py-3 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📊</span>
              <div>
                <span className="font-extrabold block">
                  {newlyAddedCount} novo(s) gasto(s) somado(s) à sua planilha!
                </span>
                <span className="text-slate-800 text-[11px]">
                  Todos os lançamentos estão consolidados. Baixe o arquivo atualizado para guardá-lo e usar como login na próxima vez.
                </span>
              </div>
            </div>
            <button
              onClick={handleDownloadUpdatedSpreadsheet}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha Atualizada (.xlsx)</span>
            </button>
          </div>
        )}

        {/* Temporary Notice after action */}
        {downloadAlert && newlyAddedCount === 0 && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{downloadAlert}</span>
            </div>
            <button
              onClick={() => setDownloadAlert(null)}
              className="text-emerald-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Date Scope Info Banner if active and has expenses */}
        {startDateFilter && expenses.length > 0 && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-slate-300">
                Contagem iniciada em <strong className="text-amber-300 font-mono">{startDateFilter} e após</strong>: total acumulado de <strong className="text-white font-mono text-sm">{formatCurrency(stats.total)}</strong> ({stats.count} despesas, sendo apenas <strong className="text-emerald-400 font-mono">{formatCurrency(todayTotal)}</strong> hoje).
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

        {/* Tab 0: Tela Inicial - Login & Planilha */}
        {activeTab === 'login-planilha' && (
          <LoginAndSpreadsheetPortal
            googleUser={googleUser}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleLogout={handleGoogleLogout}
            expenses={expenses}
            currentFileName={currentFileName}
            newlyAddedCount={newlyAddedCount}
            onImportExpenses={handleImportSpreadsheetData}
            onDownloadUpdatedSpreadsheet={handleDownloadUpdatedSpreadsheet}
            onClearAllData={handleClearAllData}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToSenhorMoeda={() => setActiveTab('senhor-moeda')}
          />
        )}

        {/* Central Metric Cards (visible on dashboard, statistics, senhor-moeda, advisor, expenses) */}
        {activeTab !== 'login-planilha' && (
          <OverviewMetrics
            stats={stats}
            onOpenStatistics={() => setActiveTab('statistics')}
          />
        )}

        {/* Tab 1: Dashboard Principal */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* If zero expenses: Onboarding clean state explaining data comes only from Google login or spreadsheet upload */}
            {expenses.length === 0 && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl">
                      🛡️
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Dados de Conta Zerados
                      </h3>
                      <p className="text-xs text-slate-300">
                        Nenhum dado mockado carregado. Como solicitado, seus dados serão obtidos <strong>apenas via Login do Google</strong> ou <strong>Envio de Planilha</strong>.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                    Aguardando Seus Dados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Google Login & Drive */}
                  <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Método 1: Login com o Google</h4>
                          <span className="text-[10px] text-slate-400">Google Drive & Google Sheets</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Faça login com a sua conta Google para listar e carregar planilhas do seu Drive (como "controle_de_gastos-5.xlsx" na aba "Lançamentos").
                      </p>
                    </div>

                    {googleUser ? (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                        <span className="truncate">✓ Conectado: {googleUser.displayName || googleUser.email}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Pronto</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleGoogleSignIn}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 hover:border-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>Entrar com Conta Google</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Option 2: Upload de Planilha */}
                  <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Método 2: Enviar Planilha Local</h4>
                          <span className="text-[10px] text-slate-400">Excel (.xlsx, .xls) ou CSV</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Se você tem a planilha salva no seu computador, envie o arquivo diretamente para importar todos os seus lançamentos e gastos.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsSpreadsheetModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar Arquivo para Enviar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sincronização direta com Google Drive (sempre disponível para puxar planilhas) */}
            <GoogleDriveSyncCard
              onReplaceExpensesWithDriveData={handleReplaceExpensesWithDriveData}
              onAppendExpensesFromDrive={handleAddExpenses}
            />

            {/* Lançamento Rápido (Mensagem Natural com IA / Voz / Quick Add) */}
            <NaturalLanguageInput onAddExpenses={handleAddExpenses} />

            {/* Visão Temporal (Diária, Semanal, Mensal) */}
            {expenses.length > 0 && (
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
            )}

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
