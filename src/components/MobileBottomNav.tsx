import React from 'react';
import {
  FileSpreadsheet,
  BarChart3,
  Plus,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'login-planilha' | 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses';
  setActiveTab: (tab: 'login-planilha' | 'dashboard' | 'senhor-moeda' | 'statistics' | 'advisor' | 'expenses') => void;
  onOpenAddModal: () => void;
  newlyAddedCount?: number;
  expensesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  newlyAddedCount = 0,
  expensesCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        
        {/* Tab 1: Login & Planilha */}
        <button
          onClick={() => setActiveTab('login-planilha')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition cursor-pointer relative ${
            activeTab === 'login-planilha' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <FileSpreadsheet className="w-5 h-5" />
            {newlyAddedCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {newlyAddedCount > 9 ? '9+' : newlyAddedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">Planilha</span>
        </button>

        {/* Tab 2: Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition cursor-pointer ${
            activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Painel</span>
        </button>

        {/* Center Floating Action Button: Quick Add Expense */}
        <div className="flex items-center justify-center flex-1">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-lg shadow-emerald-500/30 flex items-center justify-center transition active:scale-95 cursor-pointer -mt-4 border-4 border-slate-950"
            title="Lançar novo gasto"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Tab 3: Senhor Moeda */}
        <button
          onClick={() => setActiveTab('senhor-moeda')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition cursor-pointer ${
            activeTab === 'senhor-moeda' ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <span className="text-lg leading-none">🪙</span>
          <span className="text-[10px] font-bold mt-1">Sr. Moeda</span>
        </button>

        {/* Tab 4: Lista de Despesas */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition cursor-pointer relative ${
            activeTab === 'expenses' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Gastos</span>
          {expensesCount > 0 && (
            <span className="absolute top-1.5 right-2 px-1 text-[9px] font-mono text-slate-400">
              {expensesCount > 99 ? '99+' : expensesCount}
            </span>
          )}
        </button>

      </div>
    </nav>
  );
};
