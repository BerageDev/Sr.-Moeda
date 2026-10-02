import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Check,
  Coffee,
  Utensils,
  Car,
  Pill,
  ShoppingBag,
  Loader2,
  Calendar,
  CreditCard,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { parseExpenseWithAI } from '../services/aiService';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/expense';
import { CATEGORY_COLORS, formatCurrency } from '../utils/statistics';

interface NaturalLanguageInputProps {
  onAddExpenses: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onAddExpenses }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [extractedExpenses, setExtractedExpenses] = useState<
    Array<{
      amount: number;
      description: string;
      category: ExpenseCategory;
      date: string;
      paymentMethod: PaymentMethod;
      note?: string;
    }>
  >([]);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        handleProcessMessage(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Speech start error:', e);
      }
    }
  };

  const handleProcessMessage = async (textToProcess?: string) => {
    const query = (textToProcess || message).trim();
    if (!query) return;

    setIsLoading(true);
    setStatusFeedback(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await parseExpenseWithAI(query, todayStr);

      if (result.expenses && result.expenses.length > 0) {
        const mapped = result.expenses.map((e) => ({
          amount: Number(e.amount) || 0,
          description: e.description || 'Despesa registrada',
          category: (e.category as ExpenseCategory) || 'Outros',
          date: e.date || todayStr,
          paymentMethod: (e.paymentMethod as PaymentMethod) || 'Pix',
          note: e.note || '',
        }));

        setExtractedExpenses(mapped);
        setStatusFeedback(
          result.isFallback
            ? `Identificamos ${mapped.length} gasto(s) localmente.`
            : `IA identificou ${mapped.length} despesa(s) na sua mensagem!`
        );
      } else {
        setStatusFeedback('Não conseguimos identificar valores numéricos na mensagem. Tente: "gastei 45 no almoço".');
      }
    } catch (error) {
      console.error('Error parsing:', error);
      setStatusFeedback('Erro ao processar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAddAll = () => {
    if (extractedExpenses.length === 0) return;
    onAddExpenses(extractedExpenses);
    setExtractedExpenses([]);
    setMessage('');
    setStatusFeedback(`✓ ${extractedExpenses.length} gasto(s) adicionado(s) com sucesso!`);
    setTimeout(() => setStatusFeedback(null), 3500);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setExtractedExpenses((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setExtractedExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick 1-click shortcut adds
  const handleQuickAdd = (desc: string, amount: number, category: ExpenseCategory, payment: PaymentMethod) => {
    const todayStr = new Date().toISOString().split('T')[0];
    onAddExpenses([
      {
        amount,
        description: desc,
        category,
        date: todayStr,
        paymentMethod: payment,
      },
    ]);
    setStatusFeedback(`✓ Registrado com sucesso: ${desc} (${formatCurrency(amount)})`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Lançamento Rápido por Mensagem ou Voz
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                IA Gemini
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Digite ou fale como gastou: <span className="text-slate-300 italic">"gastei 45 no almoço hoje e 25 no uber"</span>
            </p>
          </div>
        </div>

        {/* Quick 1-click pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <span className="text-[11px] text-slate-500 whitespace-nowrap hidden lg:inline">
            Atalhos rápidos:
          </span>
          <button
            onClick={() => handleQuickAdd('Almoço Diário', 35.0, 'Alimentação', 'Pix')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition cursor-pointer text-xs"
          >
            <Utensils className="w-3 h-3 text-emerald-400" />
            Almoço (R$ 35)
          </button>
          <button
            onClick={() => handleQuickAdd('Café com lanche', 7.0, 'Alimentação', 'Pix')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700/80 transition cursor-pointer text-xs"
          >
            <Coffee className="w-3 h-3 text-amber-400" />
            Café (R$ 7)
          </button>
          <button
            onClick={() => handleQuickAdd('Corrida de Uber', 24.5, 'Transporte', 'Cartão de Crédito')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-blue-400 border border-slate-700/80 transition cursor-pointer text-xs"
          >
            <Car className="w-3 h-3 text-blue-400" />
            Uber (R$ 24,50)
          </button>
          <button
            onClick={() => handleQuickAdd('Farmácia', 50.0, 'Saúde', 'Cartão de Débito')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-rose-400 border border-slate-700/80 transition cursor-pointer text-xs"
          >
            <Pill className="w-3 h-3 text-rose-400" />
            Remédio (R$ 50)
          </button>
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleProcessMessage();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: gastei 58 no mercado hoje de tarde no cartão de crédito..."
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition pr-12 font-medium"
            disabled={isLoading}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeech}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
              title={isListening ? 'Parar gravação de voz' : 'Falar gasto por voz (Microfone)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Interpretando...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Processar</span>
            </>
          )}
        </button>
      </form>

      {/* Suggested prompts */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="text-slate-500">Exemplos que você pode testar:</span>
        {[
          'Almoço R$ 42 e café R$ 8 hoje',
          'Paguei 180 de gasolina no posto Shell ontem',
          'Comprei tênis de 299 no cartão em 3x',
        ].map((example, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setMessage(example);
              handleProcessMessage(example);
            }}
            className="text-slate-400 hover:text-emerald-300 underline underline-offset-2 decoration-slate-700 hover:decoration-emerald-400 cursor-pointer transition"
          >
            "{example}"
          </button>
        ))}
      </div>

      {/* Status Feedback banner */}
      {statusFeedback && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            {statusFeedback}
          </span>
          <button
            onClick={() => setStatusFeedback(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Extracted Expenses Review Card(s) */}
      {extractedExpenses.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Revise e confirme {extractedExpenses.length > 1 ? 'os gastos encontrados' : 'o gasto encontrado'}:
            </span>
            <button
              onClick={() => setExtractedExpenses([])}
              className="text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2.5">
            {extractedExpenses.map((exp, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-900 p-3 rounded-lg border border-slate-800 items-center text-xs"
              >
                {/* Description */}
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={exp.description}
                    onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Amount */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exp.amount}
                    onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Categoria</label>
                  <select
                    value={exp.category}
                    onChange={(e) => handleUpdateItem(idx, 'category', e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {Object.keys(CATEGORY_COLORS).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Data</label>
                  <input
                    type="date"
                    value={exp.date}
                    onChange={(e) => handleUpdateItem(idx, 'date', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Remove button */}
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    title="Remover este item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleConfirmAddAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirmar e Salvar {extractedExpenses.length > 1 ? `(${extractedExpenses.length} Gastos)` : 'Gasto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
