import React, { useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  Tag,
  ArrowUpDown,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/expense';
import { CATEGORY_COLORS, formatCurrency, formatDateBr } from '../utils/statistics';

interface ExpenseListProps {
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onClearAll: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEditExpense,
  onDeleteExpense,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Filter expenses
  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesPay = selectedPayment === 'all' || e.paymentMethod === selectedPayment;
    return matchesSearch && matchesCat && matchesPay;
  });

  // Sort expenses
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
    if (sortBy === 'date-asc') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const totalFiltered = sorted.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Histórico Detalhado de Despesas
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {filtered.length} de {expenses.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Filtre por nome, categoria ou meio de pagamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja apagar todas as despesas? Esta ação é irreversível.')) {
                  onClearAll();
                }
              }}
              className="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Tudo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição ou nota..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {Object.keys(CATEGORY_COLORS).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Filter */}
        <div>
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Todas as Formas de Pagamento</option>
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Boleto">Boleto</option>
            <option value="Transferência">Transferência</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="date-desc">Data (Mais recente primeiro)</option>
            <option value="date-asc">Data (Mais antigo primeiro)</option>
            <option value="amount-desc">Valor (Maior primeiro)</option>
            <option value="amount-asc">Valor (Menor primeiro)</option>
          </select>
        </div>
      </div>

      {/* Subtotal of filtered items */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800/80">
        <span>Mostrando {sorted.length} resultado(s)</span>
        <span>
          Soma dos filtrados: <strong className="font-mono text-emerald-400 font-bold">{formatCurrency(totalFiltered)}</strong>
        </span>
      </div>

      {/* Expenses Table */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Nenhuma despesa corresponde aos filtros aplicados.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Data</th>
                <th className="py-3 px-3.5">Descrição</th>
                <th className="py-3 px-3.5">Categoria</th>
                <th className="py-3 px-3.5">Pagamento</th>
                <th className="py-3 px-3.5 text-right">Valor</th>
                <th className="py-3 px-3.5 text-right w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {sorted.map((item) => {
                const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Outros'];

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                      {formatDateBr(item.date)}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-medium text-white max-w-sm truncate">
                        {item.description}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 truncate max-w-sm">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block ${catStyle.bg} ${catStyle.text}`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                      {item.paymentMethod}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditExpense(item)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Editar despesa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
