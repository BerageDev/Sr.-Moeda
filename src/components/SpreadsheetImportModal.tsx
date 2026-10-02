import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  FileCheck,
  Table,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import {
  parseSpreadsheetFile,
  parseSpreadsheetText,
  ParseResult,
  ParsedSpreadsheetRow,
} from '../utils/spreadsheetParser';
import { parseSpreadsheetWithAI } from '../services/aiService';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/expense';
import { formatCurrency, formatDateBr } from '../utils/statistics';
import {
  googleSignIn,
  getAccessToken,
  initAuth,
} from '../services/googleDriveAuth';
import {
  listRecentDriveSpreadsheets,
  fetchDriveSpreadsheetData,
} from '../services/googleDriveService';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onImportExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'drive'>('drive');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveUser, setDriveUser] = useState<any>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<ParsedSpreadsheetRow[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await parseSpreadsheetFile(file);
      setParseResult(result);
      setSelectedRows(result.rows.filter((r) => r.isValid));
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage('Erro ao ler a planilha. Verifique se o arquivo é um Excel (.xlsx, .xls) ou CSV válido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = parseSpreadsheetText(pastedText);
      setParseResult(result);
      setSelectedRows(result.rows.filter((r) => r.isValid));
    } catch (err) {
      console.error('Paste error:', err);
      setErrorMessage('Erro ao interpretar texto colado.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDriveSignInAndLoad = async () => {
    setIsLoadingDrive(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      setDriveUser(res.user);
      const files = await listRecentDriveSpreadsheets(res.accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Drive sign-in error:', err);
      setErrorMessage(
        err?.message?.includes('popup-closed-by-user')
          ? 'O login foi cancelado antes de conceder permissão.'
          : 'Erro ao autenticar com Google Drive.'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSelectDriveFile = async (file: any) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sessão expirada. Conecte-se novamente.');
      const result = await fetchDriveSpreadsheetData(file.id, file.mimeType, file.name, token);
      setParseResult(result);
      setSelectedRows(result.rows.filter((r) => r.isValid));
    } catch (err: any) {
      console.error('Error fetching drive file:', err);
      setErrorMessage(err?.message || 'Falha ao baixar planilha do Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiAssistance = async () => {
    if (!parseResult) return;
    setIsAiProcessing(true);
    setErrorMessage(null);

    try {
      const rawText = pastedText || JSON.stringify(parseResult.rows.map((r) => r.originalRow).slice(0, 35));
      const todayStr = new Date().toISOString().split('T')[0];
      const aiResult = await parseSpreadsheetWithAI(rawText, todayStr);

      if (aiResult.expenses && aiResult.expenses.length > 0) {
        const mapped: ParsedSpreadsheetRow[] = aiResult.expenses.map((e, idx) => ({
          id: `ai-${idx}-${Date.now()}`,
          originalRow: {},
          amount: Number(e.amount) || 0,
          description: e.description || 'Gasto importado',
          category: (e.category as ExpenseCategory) || 'Outros',
          date: e.date || todayStr,
          paymentMethod: (e.paymentMethod as PaymentMethod) || 'Pix',
          isValid: true,
          selected: true,
        }));

        setParseResult((prev) =>
          prev
            ? {
                ...prev,
                rows: mapped,
                validRows: mapped.length,
                totalRows: mapped.length,
              }
            : null
        );
        setSelectedRows(mapped);
      }
    } catch (err) {
      console.error('AI assistance error:', err);
      setErrorMessage('Falha ao processar com IA. Usando extração padrão da planilha.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedRows.some((r) => r.id === id)) {
      setSelectedRows(selectedRows.filter((r) => r.id !== id));
    } else {
      const row = parseResult?.rows.find((r) => r.id === id);
      if (row) setSelectedRows([...selectedRows, row]);
    }
  };

  const toggleSelectAll = () => {
    if (!parseResult) return;
    const validOnes = parseResult.rows.filter((r) => r.isValid);
    if (selectedRows.length === validOnes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(validOnes);
    }
  };

  const handleConfirmImport = () => {
    if (selectedRows.length === 0) return;

    const expensesToImport: Omit<Expense, 'id' | 'createdAt'>[] = selectedRows.map((r) => ({
      amount: r.amount,
      description: r.description,
      category: r.category,
      date: r.date,
      paymentMethod: r.paymentMethod,
    }));

    onImportExpenses(expensesToImport);
    onClose();
  };

  const selectedTotal = selectedRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Importador Inteligente de Planilhas
              </h2>
              <p className="text-xs text-slate-400">
                Carregue arquivos .xlsx, .csv ou cole extratos bancários com detecção automática de colunas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Method Tabs */}
          {!parseResult && (
            <div className="space-y-4">
              <div className="flex border-b border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('drive')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'drive'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Google Drive (Nuvem)
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload de Arquivo (Excel / CSV)
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Colar Linhas
                </button>
              </div>

              {activeTab === 'drive' && (
                <div className="space-y-4">
                  {!driveUser ? (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6" viewBox="0 0 87.3 78">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        Conecte sua conta do Google para buscar planilhas do Drive
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Puxamos automaticamente as planilhas que você subiu recentemente para importar seus gastos de forma prática.
                      </p>
                      <button
                        type="button"
                        onClick={handleDriveSignInAndLoad}
                        disabled={isLoadingDrive}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
                      >
                        {isLoadingDrive ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : null}
                        <span>Conectar com Google Drive</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          Planilhas encontradas no seu Google Drive ({driveFiles.length}):
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const token = await getAccessToken();
                            if (token) {
                              setIsLoadingDrive(true);
                              const files = await listRecentDriveSpreadsheets(token);
                              setDriveFiles(files);
                              setIsLoadingDrive(false);
                            }
                          }}
                          className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Atualizar
                        </button>
                      </div>

                      {isLoadingDrive ? (
                        <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                          <span>Buscando planilhas no Drive...</span>
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="bg-slate-950 p-4 rounded-xl text-center text-xs text-slate-400">
                          Nenhum arquivo recente localizado no Drive.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {driveFiles.map((file, i) => (
                            <div
                              key={file.id}
                              onClick={() => handleSelectDriveFile(file)}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/60 transition cursor-pointer flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                                      {file.name}
                                    </span>
                                    {i === 0 && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Mais recente
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('pt-BR') : ''}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-slate-950 text-emerald-400 text-xs font-bold transition"
                              >
                                Puxar dados
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/80 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Arraste sua planilha aqui ou clique para selecionar
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Suporta formatos Microsoft Excel (.xlsx, .xls), Google Sheets, LibreOffice e CSV delimitado por vírgula ou ponto-e-vírgula.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Copie as células do Excel, Sheets ou extrato bancário e cole abaixo:
                  </p>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Data	Descrição	Categoria	Valor
01/10/2026	Almoço Restaurante	Alimentação	35,00
02/10/2026	Uber Trabalho	Transporte	24,50"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handlePasteProcess}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    Processar Dados Colados
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Lendo e mapeando colunas da planilha...</span>
            </div>
          )}

          {/* Preview of Parsed Spreadsheet */}
          {parseResult && !isProcessing && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white block">
                      {parseResult.fileName}
                    </span>
                    <span className="text-slate-400">
                      {parseResult.validRows} de {parseResult.totalRows} linhas válidas identificadas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiAssistance}
                    disabled={isAiProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                    title="Usar Gemini para estruturar e categorizar automaticamente"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAiProcessing ? 'IA Analisando...' : 'Melhorar com IA'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setParseResult(null);
                      setSelectedRows([]);
                      setPastedText('');
                    }}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
                  >
                    Trocar Arquivo
                  </button>
                </div>
              </div>

              {/* Detected Column Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="text-slate-500">Colunas Mapeadas:</span>
                {parseResult.detectedColumns.amountCol && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    Valor: {parseResult.detectedColumns.amountCol}
                  </span>
                )}
                {parseResult.detectedColumns.descriptionCol && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                    Item: {parseResult.detectedColumns.descriptionCol}
                  </span>
                )}
                {parseResult.detectedColumns.dateCol && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-400 border border-slate-700">
                    Data: {parseResult.detectedColumns.dateCol}
                  </span>
                )}
                {parseResult.detectedColumns.categoryCol && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    Categoria: {parseResult.detectedColumns.categoryCol}
                  </span>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedRows.length > 0 &&
                            selectedRows.length === parseResult.rows.filter((r) => r.isValid).length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-700 bg-slate-800 text-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Pagamento</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {parseResult.rows.map((row) => {
                      const isSelected = selectedRows.some((r) => r.id === row.id);

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-800/40 transition cursor-pointer ${
                            !row.isValid
                              ? 'opacity-40 bg-rose-950/20'
                              : isSelected
                              ? 'bg-slate-800/20'
                              : ''
                          }`}
                          onClick={() => row.isValid && toggleSelectRow(row.id)}
                        >
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              disabled={!row.isValid}
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row.id)}
                              className="rounded border-slate-700 bg-slate-800 text-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {formatDateBr(row.date)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">
                            {row.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {row.paymentMethod}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {parseResult && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Selecionados: <strong className="text-white">{selectedRows.length} itens</strong> • Total:{' '}
              <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(selectedTotal)}</strong>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedRows.length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Importar {selectedRows.length} Despesas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
