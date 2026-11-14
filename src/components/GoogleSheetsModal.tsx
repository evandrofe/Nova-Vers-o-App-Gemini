import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Search,
  FileSpreadsheet,
  FolderOpen,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Plus,
  Layers,
  ShieldAlert,
  ArrowLeft,
  Upload,
  Download
} from 'lucide-react';
import { CampaignRow, CapaData, ReportMeta } from '../types';
import { parseFileName, parseMatrixRows } from '../lib/metaAdsParser';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout
} from '../lib/googleWorkspaceAuth';
import {
  DriveSpreadsheetFile,
  ExportToSheetsResult,
  GoogleAuthExpiredError,
  SpreadsheetMetadata,
  createFormattedReportSpreadsheet,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  listDriveSpreadsheets,
  readSheetValues,
  updateExistingSpreadsheetTab
} from '../lib/googleSheetsService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  mode: 'import' | 'export';
  onClose: () => void;
  // For import mode
  onImportSuccess?: (meta: ReportMeta, campaigns: CampaignRow[]) => void;
  // For export mode
  meta?: ReportMeta | null;
  campaigns?: CampaignRow[];
  capa?: CapaData;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  mode,
  onClose,
  onImportSuccess,
  meta,
  campaigns = [],
  capa,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getAccessToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetMetadata | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [selectedTabTitle, setSelectedTabTitle] = useState<string>('');

  // Import meta overrides (auto-filled from spreadsheet title)
  const [importCliente, setImportCliente] = useState('');
  const [importMes, setImportMes] = useState('');
  const [importAno, setImportAno] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Export configuration state
  const [exportStrategy, setExportStrategy] = useState<'create' | 'existing'>('create');
  const [newSpreadsheetTitle, setNewSpreadsheetTitle] = useState('');
  const [existingTabMode, setExistingTabMode] = useState<'overwrite' | 'new_tab'>('new_tab');
  const [newTabName, setNewTabName] = useState('Planilha de Custos');
  const [isConfirmationStep, setIsConfirmationStep] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportToSheetsResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      (authUser) => {
        setUser(authUser);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  // Reset modal transient states when opened
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setExportResult(null);
    setIsConfirmationStep(false);

    const token = getAccessToken();
    setAccessToken(token);
    setNeedsAuth(!token);

    if (mode === 'export' && meta) {
      const defaultTitle = [
        'Relatório Mensal',
        meta.cliente || 'Cliente',
        [meta.mes, meta.ano].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(' - ');
      setNewSpreadsheetTitle(defaultTitle);
      setNewTabName(`Planilha de Custos${meta.mes ? ` - ${meta.mes}` : ''}`);
    }
  }, [isOpen, mode, meta]);

  // Fetch Drive spreadsheets automatically once authenticated & modal open
  useEffect(() => {
    if (!isOpen || !accessToken || needsAuth) return;
    void fetchSpreadsheets(accessToken, '');
  }, [isOpen, accessToken, needsAuth]);

  const handleError = (err: any) => {
    if (err instanceof GoogleAuthExpiredError) {
      setAccessToken(null);
      setNeedsAuth(true);
      setError(err.message);
    } else {
      setError(err?.message || 'Erro ao comunicar com o Google Sheets.');
    }
  };

  const fetchSpreadsheets = async (token: string, query: string) => {
    setIsLoadingFiles(true);
    setError(null);
    try {
      const files = await listDriveSpreadsheets(token, query);
      setDriveFiles(files);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setAccessToken(res.accessToken);
      setNeedsAuth(false);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir a autenticação com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setDriveFiles([]);
    setSelectedSpreadsheet(null);
    setIsConfirmationStep(false);
    setExportResult(null);
  };

  const loadSpreadsheetTabs = async (spreadsheetId: string) => {
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingMeta(true);
    setError(null);
    try {
      const metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
      setSelectedSpreadsheet(metadata);
      if (metadata.sheets.length > 0) {
        setSelectedTabTitle(metadata.sheets[0].title);
      } else {
        setSelectedTabTitle('');
      }
      if (mode === 'import') {
        const parsed = parseFileName(metadata.title);
        setImportCliente(parsed.cliente);
        setImportMes(parsed.mes);
        setImportAno(parsed.ano);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleOpenByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(urlInput);
    if (!id) {
      setError('Cole um link válido do Google Sheets (docs.google.com/spreadsheets/d/...) ou o ID da planilha.');
      return;
    }
    await loadSpreadsheetTabs(id);
  };

  const handleImportSelectedTab = async () => {
    if (!accessToken || !selectedSpreadsheet || !selectedTabTitle) return;
    setIsImporting(true);
    setError(null);
    try {
      const values = await readSheetValues(
        accessToken,
        selectedSpreadsheet.spreadsheetId,
        selectedTabTitle
      );
      const parsedCampaigns = parseMatrixRows(values);
      if (!parsedCampaigns || parsedCampaigns.length === 0) {
        throw new Error(
          `Nenhuma campanha do Meta Ads encontrada na aba "${selectedTabTitle}". Verifique se a aba contém colunas como "Nome da campanha" e "Valor usado".`
        );
      }
      const fallbackMeta = parseFileName(selectedSpreadsheet.title);
      const finalMeta: ReportMeta = {
        cliente: importCliente.trim() || fallbackMeta.cliente,
        mes: importMes.trim() || fallbackMeta.mes,
        ano: importAno.trim() || fallbackMeta.ano,
        originalFileName: `${selectedSpreadsheet.title} (${selectedTabTitle})`,
      };
      onImportSuccess?.(finalMeta, parsedCampaigns);
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrepareExportConfirmation = () => {
    setError(null);
    if (exportStrategy === 'create') {
      if (!newSpreadsheetTitle.trim()) {
        setError('Informe um título para a nova planilha do Google Sheets.');
        return;
      }
    } else {
      if (!selectedSpreadsheet) {
        setError('Selecione uma planilha existente do Google Drive ou cole o link dela.');
        return;
      }
      if (existingTabMode === 'overwrite' && !selectedTabTitle) {
        setError('Selecione a aba existente que deseja atualizar.');
        return;
      }
      if (existingTabMode === 'new_tab') {
        const cleanTab = newTabName.trim();
        if (!cleanTab) {
          setError('Informe o nome da nova aba que será criada na planilha.');
          return;
        }
        const alreadyExists = selectedSpreadsheet.sheets.some(
          (s) => s.title.toLowerCase() === cleanTab.toLowerCase()
        );
        if (alreadyExists) {
          setError(`Já existe uma aba chamada "${cleanTab}". Escolha outro nome ou selecione "Sobrescrever aba existente".`);
          return;
        }
      }
    }
    setIsConfirmationStep(true);
  };

  const handleConfirmAndExecuteExport = async () => {
    if (!accessToken || !meta || !capa) return;
    setIsExporting(true);
    setError(null);
    try {
      let result: ExportToSheetsResult;
      if (exportStrategy === 'create') {
        result = await createFormattedReportSpreadsheet(
          accessToken,
          newSpreadsheetTitle.trim(),
          meta,
          campaigns,
          capa
        );
      } else {
        if (!selectedSpreadsheet) {
          throw new Error('Planilha de destino não selecionada.');
        }
        const isNewTab = existingTabMode === 'new_tab';
        const targetTab = isNewTab ? newTabName.trim() : selectedTabTitle;
        const matchedTab = selectedSpreadsheet.sheets.find((s) => s.title === targetTab);
        result = await updateExistingSpreadsheetTab(
          accessToken,
          selectedSpreadsheet.spreadsheetId,
          targetTab,
          isNewTab,
          matchedTab?.sheetId,
          meta,
          campaigns
        );
      }
      setExportResult(result);
      setIsConfirmationStep(false);
    } catch (err: any) {
      handleError(err);
      setIsConfirmationStep(false);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 bg-[#0e0f12] border-b border-[#26282f] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {mode === 'import'
                  ? 'Importar Planilha do Google Sheets'
                  : 'Exportar Relatório para Google Sheets'}
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                {mode === 'import'
                  ? 'Conecte sua conta Google, selecione a planilha e escolha a aba do Meta Ads'
                  : 'Crie uma nova planilha formatada ou envie a Planilha de Custos para um arquivo existente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && !needsAuth && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title={`Conectado como ${user.email || user.displayName || 'Usuário Google'}`}
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline max-w-[140px] truncate">
                  {user.email || 'Sair'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 0: Sign in with Google when authentication / OAuth token is needed */}
          {needsAuth ? (
            <div className="py-8 px-4 text-center bg-[#1a1b20] border border-[#2b2d33] rounded-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-white">
                  Conecte sua conta Google para continuar
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {mode === 'import'
                    ? 'Autorize o acesso de leitura às suas planilhas do Google Drive e Google Sheets para listar arquivos e importar campanhas diretamente.'
                    : 'Autorize o acesso ao Google Drive e Google Sheets para criar planilhas formatadas ou atualizar abas existentes com o relatório.'}
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <GoogleSignInButton
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
                />
              </div>
            </div>
          ) : exportResult ? (
            /* EXPORT SUCCESS STATE */
            <div className="py-8 px-6 text-center bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">
                  Planilha enviada ao Google Sheets!
                </h4>
                <p className="text-xs text-neutral-300">
                  Arquivo: <strong className="text-amber-300">{exportResult.title}</strong>
                  {exportResult.tabTitle && (
                    <>
                      {' '}
                      • Aba(s): <strong className="text-emerald-300">{exportResult.tabTitle}</strong>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir no Google Sheets</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : mode === 'export' && isConfirmationStep ? (
            /* MANDATORY EXPLICIT CONFIRMATION DIALOG BEFORE MUTATING/WRITING DATA */
            <div className="bg-[#1a1b20] border border-amber-500/40 rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    Confirmar envio para o Google Sheets?
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Revise os detalhes abaixo antes de autorizar a criação ou alteração dos dados na sua conta Google:
                  </p>
                </div>
              </div>

              <div className="bg-[#111216] border border-[#2b2d33] rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">Operação</span>
                  <span className="font-bold text-amber-300">
                    {exportStrategy === 'create'
                      ? 'Criar nova planilha no Google Drive'
                      : existingTabMode === 'overwrite'
                        ? 'Sobrescrever aba existente'
                        : 'Adicionar nova aba em planilha existente'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">Planilha de destino</span>
                  <span className="font-bold text-white text-right">
                    {exportStrategy === 'create'
                      ? newSpreadsheetTitle.trim()
                      : selectedSpreadsheet?.title}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">Aba(s) gravada(s)</span>
                  <span className="font-bold text-emerald-300 text-right">
                    {exportStrategy === 'create'
                      ? 'Resumo do Relatório + Planilha de Custos'
                      : existingTabMode === 'new_tab'
                        ? newTabName.trim()
                        : selectedTabTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-400">Conteúdo incluído</span>
                  <span className="font-mono text-neutral-200">
                    {campaigns.length} campanhas (17 colunas + totais + guia)
                  </span>
                </div>
              </div>

              {exportStrategy === 'existing' && existingTabMode === 'overwrite' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Atenção:</strong> Todos os dados atuais da aba{' '}
                    <strong>"{selectedTabTitle}"</strong> na planilha{' '}
                    <strong>"{selectedSpreadsheet?.title}"</strong> serão limpos e substituídos pelo novo relatório.
                  </span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmationStep(false)}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar e Voltar</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndExecuteExport}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando para Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Confirmar e Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* MAIN SELECTION UI (IMPORT OR EXPORT SETUP) */
            <>
              {mode === 'export' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExportStrategy('create');
                      setError(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportStrategy === 'create'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-[#1a1b20] border-[#2b2d33] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Criar Nova Planilha</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Gera um novo arquivo no Google Sheets com as 2 abas executivas (Resumo + Planilha de Custos).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportStrategy('existing');
                      setError(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportStrategy === 'existing'
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-[#1a1b20] border-[#2b2d33] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Atualizar Planilha Existente</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Escolha uma planilha sua do Drive para adicionar uma nova aba ou sobrescrever uma aba existente.
                    </p>
                  </button>
                </div>
              )}

              {mode === 'export' && exportStrategy === 'create' ? (
                <div className="bg-[#1a1b20] border border-[#2b2d33] rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Nome da nova planilha no Google Sheets
                    </label>
                    <input
                      type="text"
                      value={newSpreadsheetTitle}
                      onChange={(e) => setNewSpreadsheetTitle(e.target.value)}
                      placeholder="Ex: Relatório Mensal - Cliente - Outubro 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0f12] border border-[#2b2d33] focus:border-emerald-500 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="text-xs text-neutral-400 bg-[#111216] border border-[#26282f] rounded-xl p-3 space-y-1">
                    <p className="font-semibold text-neutral-200">Estrutura gerada automaticamente:</p>
                    <p>• Aba 1: <strong>Resumo do Relatório</strong> (KPIs consolidados, destaques e audiência social)</p>
                    <p>• Aba 2: <strong>Planilha de Custos</strong> (17 colunas formatadas, totais e guia didático)</p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handlePrepareExportConfirmation}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md"
                    >
                      Revisar e Confirmar Envio
                    </button>
                  </div>
                </div>
              ) : (
                /* SPREADSHEET PICKER + TAB SELECTOR (FOR BOTH IMPORT AND EXISTING EXPORT) */
                <div className="space-y-4">
                  {/* Paste URL or ID */}
                  <form onSubmit={handleOpenByUrl} className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Cole o link do Google Sheets ou ID da planilha..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0e0f12] border border-[#2b2d33] focus:border-amber-500 text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoadingMeta}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      {isLoadingMeta ? 'Buscando...' : 'Carregar Abas'}
                    </button>
                  </form>

                  {/* Search Drive Spreadsheets */}
                  <div className="bg-[#1a1b20] border border-[#2b2d33] rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span>Suas Planilhas no Google Drive</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && accessToken) {
                                e.preventDefault();
                                void fetchSpreadsheets(accessToken, searchQuery);
                              }
                            }}
                            placeholder="Filtrar por nome..."
                            className="pl-8 pr-2.5 py-1.5 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-xs text-white outline-none w-44"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => accessToken && void fetchSpreadsheets(accessToken, searchQuery)}
                          disabled={isLoadingFiles}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                          title="Atualizar lista"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {isLoadingFiles ? (
                        <div className="py-6 text-center text-xs text-neutral-400">
                          Carregando planilhas do Google Drive...
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="py-6 text-center text-xs text-neutral-500">
                          Nenhuma planilha encontrada. Tente limpar o filtro ou colar o link acima.
                        </div>
                      ) : (
                        driveFiles.map((file) => {
                          const isSelected = selectedSpreadsheet?.spreadsheetId === file.id;
                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => void loadSpreadsheetTabs(file.id)}
                              className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                                  : 'bg-[#121316] border-[#26282f] hover:border-neutral-600 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-xs font-semibold truncate">{file.name}</span>
                              </div>
                              {file.modifiedTime && (
                                <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                                  {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Real Sheet Tabs Configuration */}
                  {isLoadingMeta && (
                    <div className="p-4 rounded-2xl bg-[#1a1b20] border border-[#2b2d33] text-xs text-neutral-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Lendo abas disponíveis na planilha...</span>
                    </div>
                  )}

                  {!isLoadingMeta && selectedSpreadsheet && (
                    <div className="bg-[#1a1b20] border border-emerald-500/30 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block">
                            Planilha Selecionada
                          </span>
                          <h4 className="text-sm font-bold text-white truncate">
                            {selectedSpreadsheet.title}
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                          {selectedSpreadsheet.sheets.length} aba(s)
                        </span>
                      </div>

                      {mode === 'import' ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                              Selecione a aba com os dados do Meta Ads
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedSpreadsheet.sheets.map((tab) => (
                                <button
                                  key={tab.sheetId}
                                  type="button"
                                  onClick={() => setSelectedTabTitle(tab.title)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    selectedTabTitle === tab.title
                                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                                      : 'bg-[#121316] text-neutral-300 border-[#2b2d33] hover:border-neutral-600'
                                  }`}
                                >
                                  {tab.title}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                                Cliente
                              </label>
                              <input
                                type="text"
                                value={importCliente}
                                onChange={(e) => setImportCliente(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-xs text-white outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                                Mês
                              </label>
                              <input
                                type="text"
                                value={importMes}
                                onChange={(e) => setImportMes(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-xs text-white outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                                Ano
                              </label>
                              <input
                                type="text"
                                value={importAno}
                                onChange={(e) => setImportAno(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0e0f12] border border-[#2b2d33] text-xs text-white outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleImportSelectedTab}
                              disabled={isImporting || !selectedTabTitle}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                            >
                              {isImporting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Importando Aba...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  <span>Importar Aba "{selectedTabTitle}"</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        /* EXISTING SPREADSHEET EXPORT TAB OPTIONS */
                        <>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setExistingTabMode('new_tab')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                                existingTabMode === 'new_tab'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : 'bg-[#121316] text-neutral-400 border-[#2b2d33]'
                              }`}
                            >
                              + Criar nova aba
                            </button>
                            <button
                              type="button"
                              onClick={() => setExistingTabMode('overwrite')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                                existingTabMode === 'overwrite'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                  : 'bg-[#121316] text-neutral-400 border-[#2b2d33]'
                              }`}
                            >
                              Sobrescrever aba existente
                            </button>
                          </div>

                          {existingTabMode === 'new_tab' ? (
                            <div>
                              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                                Nome da nova aba
                              </label>
                              <input
                                type="text"
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                placeholder="Ex: Planilha de Custos - Outubro"
                                className="w-full px-3.5 py-2 rounded-xl bg-[#0e0f12] border border-[#2b2d33] focus:border-emerald-500 text-xs text-white outline-none"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                                Escolha a aba que será substituída
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {selectedSpreadsheet.sheets.map((tab) => (
                                  <button
                                    key={tab.sheetId}
                                    type="button"
                                    onClick={() => setSelectedTabTitle(tab.title)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                      selectedTabTitle === tab.title
                                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                                        : 'bg-[#121316] text-neutral-300 border-[#2b2d33] hover:border-neutral-600'
                                    }`}
                                  >
                                    {tab.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handlePrepareExportConfirmation}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md"
                            >
                              Revisar e Confirmar Envio
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
