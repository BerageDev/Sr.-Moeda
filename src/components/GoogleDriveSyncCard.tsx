import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Database,
  Trash2,
  Loader2,
  HardDrive,
  Upload,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from '../services/googleDriveAuth';
import {
  listRecentDriveSpreadsheets,
  fetchDriveSpreadsheetData,
  getDriveFileSheets,
  DriveFileItem,
} from '../services/googleDriveService';
import { parseSpreadsheetFile } from '../utils/spreadsheetParser';
import { Expense } from '../types/expense';
import { formatCurrency } from '../utils/statistics';

interface GoogleDriveSyncCardProps {
  onReplaceExpensesWithDriveData: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
  onAppendExpensesFromDrive: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
}

export const GoogleDriveSyncCard: React.FC<GoogleDriveSyncCardProps> = ({
  onReplaceExpensesWithDriveData,
  onAppendExpensesFromDrive,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>(['Lançamentos']);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('Lançamentos');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        loadFiles(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        await loadFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(
        err?.message?.includes('popup-closed-by-user')
          ? 'O login do Google foi cancelado antes de autorizar o acesso.'
          : 'Falha ao autenticar com o Google. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadFiles = async (token: string) => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const recent = await listRecentDriveSpreadsheets(token);
      setFiles(recent);
      if (recent.length > 0) {
        // Auto-select controle_de_gastos-5.xlsx if present, or first
        const target = recent.find((f) => f.name.toLowerCase().includes('controle_de_gastos')) || recent[0];
        setSelectedFileId(target.id);
        fetchSheetsForFile(target.id, target.mimeType, token);
      }
    } catch (err: any) {
      console.error('Error listing files:', err);
      setErrorMessage('Erro ao listar arquivos do Google Drive. Tente atualizar a lista.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchSheetsForFile = async (fileId: string, mimeType: string, token: string) => {
    setIsLoadingSheets(true);
    try {
      const sheetNames = await getDriveFileSheets(fileId, mimeType, token);
      if (sheetNames.length > 0) {
        setAvailableSheets(sheetNames);
        // Pre-select Lançamentos / Lancamentos if present
        const lancamentoSheet = sheetNames.find(
          (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('lancamento')
        );
        setSelectedSheetTab(lancamentoSheet || sheetNames[0]);
      }
    } catch (e) {
      console.warn('Could not list sheets dynamically, using fallback Lançamentos:', e);
      setAvailableSheets(['Lançamentos']);
      setSelectedSheetTab('Lançamentos');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleFileChange = (newFileId: string) => {
    setSelectedFileId(newFileId);
    const chosen = files.find((f) => f.id === newFileId);
    if (chosen && accessToken) {
      fetchSheetsForFile(chosen.id, chosen.mimeType, accessToken);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setFiles([]);
    setSelectedFileId('');
    setStatusMessage(null);
  };

  const handleImport = async (replaceExisting: boolean) => {
    const activeToken = accessToken || (await getAccessToken());
    if (!activeToken) {
      setErrorMessage('Sessão expirada. Por favor, conecte-se novamente com o Google.');
      return;
    }

    const fileToImport = files.find((f) => f.id === selectedFileId) || files[0];
    if (!fileToImport) {
      setErrorMessage('Nenhuma planilha selecionada.');
      return;
    }

    setIsImporting(true);
    setStatusMessage(`Baixando e lendo a aba "${selectedSheetTab}" de "${fileToImport.name}"...`);
    setErrorMessage(null);

    try {
      const parseResult = await fetchDriveSpreadsheetData(
        fileToImport.id,
        fileToImport.mimeType,
        fileToImport.name,
        activeToken,
        selectedSheetTab || 'Lançamentos'
      );

      const validRows = parseResult.rows.filter((r) => r.isValid);
      if (validRows.length === 0) {
        throw new Error(
          `A aba "${selectedSheetTab}" de "${fileToImport.name}" não contém despesas válidas reconhecidas.`
        );
      }

      const expensesToSet: Omit<Expense, 'id' | 'createdAt'>[] = validRows.map((r) => ({
        amount: r.amount,
        description: r.description,
        category: r.category,
        date: r.date,
        paymentMethod: r.paymentMethod,
      }));

      if (replaceExisting) {
        onReplaceExpensesWithDriveData(expensesToSet);
        setStatusMessage(
          `✓ Sucesso! Substituímos seus gastos por ${expensesToSet.length} despesas reais da aba "${selectedSheetTab}" de "${fileToImport.name}".`
        );
      } else {
        onAppendExpensesFromDrive(expensesToSet);
        setStatusMessage(
          `✓ Sucesso! Adicionamos ${expensesToSet.length} despesas da aba "${selectedSheetTab}".`
        );
      }

      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('Error importing drive file:', err);
      setErrorMessage(err?.message || 'Erro ao importar planilha do Google Drive.');
    } finally {
      setIsImporting(false);
    }
  };

  // Direct file fallback if user drops or uploads controle_de_gastos-5.xlsx locally
  const handleDirectFileUpload = async (file: File) => {
    setIsImporting(true);
    setErrorMessage(null);
    setStatusMessage(`Lendo aba "Lançamentos" de "${file.name}"...`);

    try {
      const result = await parseSpreadsheetFile(file, 'Lançamentos');
      const validRows = result.rows.filter((r) => r.isValid);
      if (validRows.length === 0) {
        throw new Error(`Nenhum lançamento válido encontrado na aba "${result.selectedSheet}".`);
      }

      const expensesToSet: Omit<Expense, 'id' | 'createdAt'>[] = validRows.map((r) => ({
        amount: r.amount,
        description: r.description,
        category: r.category,
        date: r.date,
        paymentMethod: r.paymentMethod,
      }));

      onReplaceExpensesWithDriveData(expensesToSet);
      setStatusMessage(
        `✓ Sucesso! Importamos ${expensesToSet.length} gastos da aba "${result.selectedSheet}" de "${file.name}".`
      );
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('Direct file error:', err);
      setErrorMessage(err?.message || 'Erro ao processar arquivo.');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || files[0] || null;
  const isControleFile = selectedFile?.name.toLowerCase().includes('controle_de_gastos');

  return (
    <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <svg className="w-7 h-7" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Sincronizar Planilha do Google Drive
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Aba Lançamentos
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Localiza automaticamente <strong className="text-emerald-400">controle_de_gastos-5.xlsx</strong> no seu Drive e extrai a aba <strong className="text-amber-400">Lançamentos</strong> para calcular sua média, mediana e moda reais.
            </p>
          </div>
        </div>

        {/* User state / Sign in button */}
        {user ? (
          <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full border border-emerald-400" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <span className="font-bold text-white block text-[11px] leading-tight truncate max-w-[130px]">
                {user.displayName || user.email}
              </span>
              <span className="text-[10px] text-emerald-400">Conectado ao Drive</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-400 text-xs pl-2 border-l border-slate-800 transition cursor-pointer"
              title="Desconectar conta Google"
            >
              Sair
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-lg transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            {isAuthenticating ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            <span>Conectar com Google Drive</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {statusMessage}
          </span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* If connected to Drive */}
      {user ? (
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Planilhas no seu Drive ({files.length}):
            </span>
            <button
              onClick={() => accessToken && loadFiles(accessToken)}
              disabled={isLoadingFiles}
              className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer self-start sm:self-auto transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Atualizar lista de arquivos</span>
            </button>
          </div>

          {isLoadingFiles ? (
            <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Buscando controle_de_gastos-5.xlsx e suas planilhas no Drive...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <p>Não encontramos a planilha ainda. Clique em "Atualizar lista de arquivos" acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Highlight Card for selected file */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {isControleFile ? 'Planilha Selecionada: controle_de_gastos-5.xlsx' : 'Planilha Selecionada'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-md font-mono">{selectedFile?.name}</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedFile?.modifiedTime ? new Date(selectedFile.modifiedTime).toLocaleString('pt-BR') : ''}
                  </span>
                </div>

                {/* Tab / Sheet selector row */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-300 font-semibold">Aba da Planilha:</span>
                    {availableSheets.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {availableSheets.map((sheet) => (
                          <button
                            key={sheet}
                            type="button"
                            onClick={() => setSelectedSheetTab(sheet)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              selectedSheetTab === sheet
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {sheet}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-amber-400 font-mono font-bold">Lançamentos</span>
                    )}
                  </div>

                  {files.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">Outra planilha:</span>
                      <select
                        value={selectedFileId}
                        onChange={(e) => handleFileChange(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {files.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleImport(false)}
                  disabled={isImporting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Adicionar aos existentes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImport(true)}
                  disabled={isImporting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Lendo aba "{selectedSheetTab}"...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Puxar aba "{selectedSheetTab}" e calcular gastos exatos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Not logged in banner with direct upload fallback */
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-slate-300 space-y-1">
              <span className="font-bold text-white block">
                Puxar diretamente do seu Google Drive:
              </span>
              <p className="text-slate-400 leading-relaxed">
                Clique em <strong>"Conectar com Google Drive"</strong> para importar automaticamente a aba <strong className="text-amber-400 font-mono">Lançamentos</strong> de <strong className="text-white font-mono">controle_de_gastos-5.xlsx</strong>.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer shrink-0"
            >
              Conectar com Google
            </button>
          </div>

          {/* Local file drop fallback */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400">
            <span>
              Ou se preferir, carregue o arquivo <strong>controle_de_gastos-5.xlsx</strong> do seu dispositivo:
            </span>
            <input
              ref={directFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleDirectFileUpload(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => directFileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto text-xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Carregar arquivo local</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
