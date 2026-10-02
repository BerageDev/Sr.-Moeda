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
  RefreshCw,
  Trash2,
  Sparkles,
  Lock,
  LogOut,
  Layers,
  FileCheck,
  PlusCircle,
  Coins,
} from 'lucide-react';
import { Expense } from '../types/expense';
import { GoogleDriveSyncCard } from './GoogleDriveSyncCard';
import { parseSpreadsheetFile } from '../utils/spreadsheetParser';
import { formatCurrency } from '../utils/statistics';

interface LoginAndSpreadsheetPortalProps {
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
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

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
      setFileError(err?.message || 'Falha ao processar o arquivo de planilha. Verifique se é um arquivo Excel (.xlsx) ou CSV válido.');
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
    <div className="space-y-6">
      
      {/* Portal Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                Porta de Entrada: Login & Planilha
              </span>
              {expenses.length > 0 ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Planilha Conectada ({expenses.length} lançamentos)
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Aguardando sua Planilha ou Login Google
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Seus Dados Financeiros em Suas Mãos
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O aplicativo opera com seus dados reais: faça login com o Google para buscar do seu Google Drive ou envie uma planilha (.xlsx/.csv).
              <strong> Todos os novos gastos que você lançar no app são somados automaticamente à planilha</strong>, e você pode baixá-la atualizada a qualquer momento!
            </p>
          </div>

          {/* Quick status box / navigation button */}
          {expenses.length > 0 ? (
            <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-2.5 w-full lg:w-auto shrink-0 shadow-lg">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total da Planilha:</span>
                <span className="text-lg font-black text-white font-mono">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToDashboard}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Abrir Painel</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={onNavigateToSenhorMoeda}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <span>🪙 Sr. Moeda</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={onNavigateToDashboard}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition cursor-pointer shrink-0"
          >
            Ver no Painel →
          </button>
        </div>
      )}

      {fileError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Main 2-Column Gateway: (1) Login Google & Drive Sync / (2) Envio de Planilha Local */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Google Login & Google Drive Spreadsheet Sync */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Opção 1: Login com o Google</h3>
                  <span className="text-xs text-slate-400">Google Drive & Google Sheets</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                OAuth 2.0 Oficial
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Conecte sua conta do Google com segurança. O aplicativo listará e sincronizará as planilhas do seu Drive (como <strong>controle_de_gastos-5.xlsx</strong> ou qualquer outra planilha sua de despesas).
            </p>

            {/* Google User Status or Action */}
            {googleUser ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'Google User'}
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        {googleUser.displayName?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {googleUser.displayName || 'Usuário Conectado'}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {googleUser.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onGoogleLogout}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
                    title="Desconectar do Google"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Sua conta está conectada. Use o módulo abaixo para selecionar sua planilha do Google Drive.</span>
                </div>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-3 shadow-lg shadow-white/5"
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

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Acesso somente-leitura e seguro diretamente do ecossistema Google Workspace.
          </div>
        </div>

        {/* Column 2: Envio Direto de Planilha Local (.xlsx, .csv) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Opção 2: Enviar Planilha Local</h3>
                  <span className="text-xs text-slate-400">Excel (.xlsx, .xls) ou CSV</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                Upload Rápido
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Se você tem o arquivo de controle de gastos no seu computador, arraste para a área abaixo ou clique para selecionar. O app identifica automaticamente abas como <strong>"Lançamentos"</strong> e carrega suas despesas.
            </p>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
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

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-white block">
                  {isProcessingFile ? 'Processando e lendo planilha...' : 'Arraste sua planilha aqui ou clique para buscar'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) e CSV (.csv)
                </span>
              </div>
            </div>

          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Processamento 100% privado no seu navegador, sem envio de dados para servidores terceiros não autorizados.
          </div>
        </div>

      </div>

      {/* Active Spreadsheet Status Card & "SOMAR DADOS E BAIXAR PLANILHA ATUALIZADA" */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
              📊
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Planilha Ativa & Soma Automática de Dados
              </h3>
              <span className="text-xs text-slate-400">
                Cada gasto que você registrar pelo app é somado diretamente aqui!
              </span>
            </div>
          </div>

          {/* Quick Counter of newly added expenses */}
          {newlyAddedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              +{newlyAddedCount} novo(s) gasto(s) somado(s) pelo app!
            </span>
          )}
        </div>

        {/* Spreadsheet Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Arquivo / Fonte Atual:</span>
            <strong className="text-sm font-bold text-white truncate block">
              {currentFileName || (expenses.length > 0 ? 'controle_de_gastos.xlsx' : 'Nenhuma planilha carregada')}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Total de Lançamentos:</span>
            <strong className="text-sm font-bold text-emerald-400 font-mono">
              {expenses.length} linhas
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Soma Acumulada:</span>
            <strong className="text-sm font-bold text-white font-mono">
              {formatCurrency(totalAmount)}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Novos Lançamentos no App:</span>
            <strong className="text-sm font-bold text-amber-400 font-mono">
              {newlyAddedCount > 0 ? `+${newlyAddedCount} somados` : '0 recém-adicionados'}
            </strong>
          </div>
        </div>

        {/* Central Call to Action: Download Updated Spreadsheet */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-amber-400" />
              Baixar sua Planilha Atualizada com os Novos Dados Somados:
            </h4>
            <p className="text-[11px] text-slate-300">
              Gere o arquivo Excel (.xlsx) contendo tanto os lançamentos originais quanto os novos gastos que você inseriu no app. Assim, você sempre usará ela como login de dados!
            </p>
          </div>

          <button
            onClick={onDownloadUpdatedSpreadsheet}
            disabled={expenses.length === 0}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Atualizada (.xlsx)</span>
          </button>
        </div>

        {/* Bottom Actions: Clear data or Navigate */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2 text-xs">
          <button
            onClick={onClearAllData}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1.5 p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar todos os dados da conta</span>
          </button>

          {expenses.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToDashboard}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>Ir para a Visão Geral</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Full Sync Selector (always available below for direct Drive file actions) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          Gerenciador de Arquivos do Google Drive:
        </h4>
        <GoogleDriveSyncCard
          onReplaceExpensesWithDriveData={(driveExpenses) => onImportExpenses(driveExpenses, 'Google Drive')}
          onAppendExpensesFromDrive={(driveExpenses) => onImportExpenses(driveExpenses, 'Google Drive')}
        />
      </div>

    </div>
  );
};
