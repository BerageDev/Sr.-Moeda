import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  HardDrive,
  Trash2,
  Lock,
  LogOut,
  User as UserIcon,
  Calendar,
  Sparkles,
  PlusCircle,
  Edit2,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Expense, UserProfile } from '../types/expense';
import { GoogleDriveSyncCard } from './GoogleDriveSyncCard';
import { parseSpreadsheetFile } from '../utils/spreadsheetParser';
import { formatCurrency } from '../utils/statistics';

interface LoginAndSpreadsheetPortalProps {
  userProfile: UserProfile;
  onUpdateUserProfile: (profile: UserProfile) => void;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  expenses: Expense[];
  currentFileName: string;
  newlyAddedCount: number;
  onImportExpenses: (expenses: Omit<Expense, 'id' | 'createdAt'>[], fileName?: string) => void;
  onDownloadUpdatedSpreadsheet: () => void;
  onClearAllData: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToSenhorMoeda: () => void;
}

export const LoginAndSpreadsheetPortal: React.FC<LoginAndSpreadsheetPortalProps> = ({
  userProfile,
  onUpdateUserProfile,
  googleUser,
  onGoogleSignIn,
  onGoogleLogout,
  expenses,
  currentFileName,
  newlyAddedCount,
  onImportExpenses,
  onDownloadUpdatedSpreadsheet,
  onClearAllData,
  onNavigateToDashboard,
  onNavigateToSenhorMoeda,
}) => {
  // Step 1: Name and Age state
  const [inputName, setInputName] = useState(userProfile.name || '');
  const [inputAge, setInputAge] = useState(userProfile.age ? String(userProfile.age) : '');
  const [isEditingProfile, setIsEditingProfile] = useState(!userProfile.name);
  const [profileError, setProfileError] = useState<string | null>(null);

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inputName.trim();
    const ageNum = parseInt(inputAge, 10);

    if (!trimmedName) {
      setProfileError('Por favor, informe seu nome ou como prefere ser chamado.');
      return;
    }
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      setProfileError('Por favor, insira uma idade válida (entre 10 e 120 anos).');
      return;
    }

    setProfileError(null);
    onUpdateUserProfile({
      name: trimmedName,
      age: ageNum,
    });
    setIsEditingProfile(false);
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    setFileError(null);
    setSuccessNotice(null);

    try {
      const result = await parseSpreadsheetFile(file);
      if (!result.rows || result.rows.length === 0) {
        throw new Error('Nenhum dado financeiro válido foi encontrado no arquivo enviado.');
      }

      const validExpenses = result.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          amount: r.amount,
          description: r.description,
          category: r.category,
          date: r.date,
          paymentMethod: r.paymentMethod,
        }));

      if (validExpenses.length === 0) {
        throw new Error('Não foram encontradas linhas de despesas válidas na planilha.');
      }

      onImportExpenses(validExpenses, file.name);
      setSuccessNotice(`✓ Sucesso! ${validExpenses.length} lançamentos importados de "${file.name}" (aba "${result.selectedSheet}").`);
    } catch (err: any) {
      console.error('Spreadsheet upload error:', err);
      setFileError(err?.message || 'Falha ao processar a planilha. Verifique se é um arquivo Excel (.xlsx) ou CSV válido.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* ========================================================================= */}
      {/* PASSO 1: IDENTIFICAÇÃO DO USUÁRIO (NOME E IDADE PRIMEIRO ANTES DE TUDO)    */}
      {/* ========================================================================= */}
      {isEditingProfile || !userProfile.name ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-md">
              👋
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                Passo 1 de 2 • Antes de Começar
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white">
                Como devemos te chamar?
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Para personalizar seus conselhos financeiros e ajustar os cálculos da sua vida, precisamos apenas de duas informações essenciais:
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
            {profileError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Seu Nome ou Apelido:</span>
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Ex: Thiago, Maria, Lucas..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sua Idade:</span>
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={inputAge}
                onChange={(e) => setInputAge(e.target.value)}
                placeholder="Ex: 28"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                required
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                A idade é usada pelo Senhor Moeda para calibrar metas de aposentadoria, investimentos e reserva.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Continuar para Login & Planilha</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      ) : (
        /* User Profile Pill when already filled */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">{userProfile.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {userProfile.age} anos
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Perfil configurado
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsEditingProfile(true)}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span className="hidden sm:inline">Alterar</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 2: LOGIN GOOGLE, PLANILHA OU AMBOS                                 */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* Header of Step 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
              <span>Como você quer carregar seus dados?</span>
            </h3>
            <span className="text-xs text-slate-400">
              Escolha: Login no Google (Drive), envio de planilha local ou ambos.
            </span>
          </div>

          {expenses.length > 0 && (
            <button
              onClick={onNavigateToDashboard}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Abrir Painel Principal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Feedback alerts */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={onNavigateToDashboard}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition cursor-pointer shrink-0"
            >
              Ir ao Painel →
            </button>
          </div>
        )}

        {fileError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{fileError}</span>
          </div>
        )}

        {/* 2-Column Responsive Touch Cards: Google vs Planilha Local */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Option A: Login com o Google (Google Drive) */}
          <div className="bg-slate-900/95 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                  Google Drive & Sheets
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  1. Login com o Google
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Conecte sua conta do Google para buscar planilhas salvas diretamente no seu Google Drive.
                </p>
              </div>

              {googleUser ? (
                <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate font-semibold">{googleUser.displayName || googleUser.email}</span>
                  </div>
                  <button
                    onClick={onGoogleLogout}
                    className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                    title="Desconectar"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              {googleUser ? (
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  Conta conectada! Escolha sua planilha no módulo do Google Drive abaixo.
                </div>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2.5 shadow-md active:scale-98"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Entrar com a Conta Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Option B: Envio de Planilha Local (.xlsx, .csv) */}
          <div className="bg-slate-900/95 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                  Excel (.xlsx) ou CSV
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  2. Enviar Planilha do Aparelho
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Envie o arquivo direto do seu celular, tablet ou computador para carregar seus gastos.
                </p>
              </div>

              {/* Drag & drop / Touch tap area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-500/50 bg-slate-950/80 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <Upload className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isProcessingFile ? 'Lendo planilha...' : 'Toque para selecionar arquivo'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    .xlsx, .xls ou .csv
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Buscar Arquivo de Planilha</span>
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* SOMA AUTOMÁTICA E DOWNLOAD DA PLANILHA ATUALIZADA                         */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
              📊
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Sua Planilha Atualizada em Tempo Real
              </h3>
              <span className="text-[11px] text-slate-400">
                Os dados que você dá ao app são somados automaticamente à planilha.
              </span>
            </div>
          </div>

          {newlyAddedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse self-start sm:self-auto">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              +{newlyAddedCount} novos gastos somados!
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div className="p-2">
            <span className="text-[10px] text-slate-400 block font-semibold">Planilha Ativa:</span>
            <strong className="text-xs sm:text-sm font-bold text-white truncate block">
              {currentFileName || (expenses.length > 0 ? 'controle_de_gastos.xlsx' : 'Nenhuma carregada')}
            </strong>
          </div>
          <div className="p-2">
            <span className="text-[10px] text-slate-400 block font-semibold">Total de Linhas:</span>
            <strong className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
              {expenses.length} gastos
            </strong>
          </div>
          <div className="p-2">
            <span className="text-[10px] text-slate-400 block font-semibold">Soma dos Valores:</span>
            <strong className="text-xs sm:text-sm font-bold text-white font-mono">
              {formatCurrency(totalAmount)}
            </strong>
          </div>
          <div className="p-2">
            <span className="text-[10px] text-slate-400 block font-semibold">Somados pelo App:</span>
            <strong className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
              {newlyAddedCount > 0 ? `+${newlyAddedCount} novos` : '0 pendentes'}
            </strong>
          </div>
        </div>

        {/* Big Action: Download Updated Spreadsheet */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-center sm:justify-start gap-1.5">
              <Download className="w-4 h-4 text-amber-400" />
              Baixar Planilha com os Dados Novos Adicionados
            </h4>
            <p className="text-[11px] text-slate-300 max-w-lg">
              Baixe seu arquivo Excel (.xlsx) contendo todos os gastos consolidados. Você sempre poderá usá-lo como login de dados na próxima vez que abrir o app!
            </p>
          </div>

          <button
            onClick={onDownloadUpdatedSpreadsheet}
            disabled={expenses.length === 0}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Atualizada (.xlsx)</span>
          </button>
        </div>

        {/* Clear Data Option */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            onClick={onClearAllData}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1.5 p-2"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Retirar/apagar todos os dados</span>
          </button>

          {expenses.length > 0 && (
            <button
              onClick={onNavigateToDashboard}
              className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer flex items-center gap-1 p-2"
            >
              <span>Ver Gráficos & Estatísticas →</span>
            </button>
          )}
        </div>
      </div>

      {/* Google Drive Full File Browser Card */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          Navegador de Arquivos do Google Drive:
        </h4>
        <GoogleDriveSyncCard
          onReplaceExpensesWithDriveData={(driveExpenses) => onImportExpenses(driveExpenses, 'Google Drive')}
          onAppendExpensesFromDrive={(driveExpenses) => onImportExpenses(driveExpenses, 'Google Drive')}
        />
      </div>

    </div>
  );
};
