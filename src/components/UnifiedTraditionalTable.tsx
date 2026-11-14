import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  Share2,
  Check,
  Download,
  Printer,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ArrowUp
} from 'lucide-react';
import { CampaignRow, CapaData, ReportMeta } from '../types';
import { extractDateFromName } from '../lib/metaAdsParser';
import { exportCostSheetWebReport } from '../lib/interactiveHtmlExport';
import {
  COLUMNS_17_GUIDE,
  getActiveCostColumns,
  getCampaignRowDisplayMetrics
} from '../lib/columnsGuide';
import { EditableNumber, EditableText } from './EditableField';

export { COLUMNS_17_GUIDE };

interface UnifiedTraditionalTableProps {
  campaigns: CampaignRow[];
  meta: ReportMeta;
  capa?: CapaData;
  batchFiltro?: string;
  batchCidade?: string;
  onChangeBatchFiltro?: (value: string) => void;
  onChangeBatchCidade?: (value: string) => void;
  hideHeader?: boolean;
  totalBudget: number;
  totalSpent: number;
  totalReach: number;
  totalInt: number;
  totalLinks: number;
  totalViews: number;
  totalConv: number;
  isReadOnly?: boolean;
  isClientLocked?: boolean;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  onCreateClientLink?: () => Promise<string>;
  onUpdateMeta?: (patch: Partial<ReportMeta>) => void;
  onUpdateCampaign?: (campaignId: string, patch: Partial<CampaignRow>) => void;
  onUpdateFiltro?: (campaignId: string, newFiltro: string) => void;
  onUpdateCidade?: (campaignId: string, newCidade: string) => void;
  onBatchUpdateFiltroCidade?: (filtro: string, cidade: string) => void;
}

const fmtBRL = (val: number | undefined): string => {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtNum = (val: number | undefined): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('pt-BR');
};


export const UnifiedTraditionalTable: React.FC<UnifiedTraditionalTableProps> = ({
  campaigns,
  meta,
  batchFiltro: externalBatchFiltro,
  batchCidade: externalBatchCidade,
  onChangeBatchFiltro,
  onChangeBatchCidade,
  hideHeader = false,
  totalBudget,
  totalSpent,
  totalReach,
  totalInt,
  totalLinks,
  totalViews,
  totalConv,
  isReadOnly = false,
  isClientLocked = false,
  onExportExcel,
  isExportingExcel = false,
  isPresentationMode = false,
  onTogglePresentationMode,
  onCreateClientLink,
  onUpdateMeta,
  onUpdateCampaign,
  onUpdateFiltro,
  onUpdateCidade,
  onBatchUpdateFiltroCidade
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuideTab, setActiveGuideTab] = useState<'all' | 'topo' | 'meio' | 'fundo' | 'setup'>('all');
  const [focusedColumnNum, setFocusedColumnNum] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [localBatchFiltro, setLocalBatchFiltro] = useState('');
  const [localBatchCidade, setLocalBatchCidade] = useState('');
  const [batchSuccess, setBatchSuccess] = useState(false);
  const scrollTimerRef = useRef<number | null>(null);
  const didSyncInitialRef = useRef(false);

  const batchFiltro = externalBatchFiltro !== undefined ? externalBatchFiltro : localBatchFiltro;
  const batchCidade = externalBatchCidade !== undefined ? externalBatchCidade : localBatchCidade;
  const setBatchFiltro = onChangeBatchFiltro || setLocalBatchFiltro;
  const setBatchCidade = onChangeBatchCidade || setLocalBatchCidade;

  // If batch inputs are empty on mount, pre-fill from existing campaign values (e.g. edited row-by-row in Step 2)
  useEffect(() => {
    if (didSyncInitialRef.current) return;
    didSyncInitialRef.current = true;

    if (!batchFiltro.trim()) {
      const existingFiltros = campaigns.map((c) => (c.filtro || '').trim()).filter(Boolean);
      if (existingFiltros.length > 0) {
        setBatchFiltro(existingFiltros[0]);
      }
    }
    if (!batchCidade.trim()) {
      const existingCidades = campaigns.map((c) => (c.cidade || '').trim()).filter(Boolean);
      if (existingCidades.length > 0) {
        setBatchCidade(existingCidades[0]);
      }
    }
  }, [campaigns, batchFiltro, batchCidade, setBatchFiltro, setBatchCidade]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleCopyLink = async () => {
    if (!onCreateClientLink || isGeneratingLink) return;
    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const shareUrl = await onCreateClientLink();
      setGeneratedLinkUrl(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 4000);
    } catch (err: any) {
      setLinkError(err?.message || 'Erro ao gerar o link exclusivo.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleExportHtml = () => {
    exportCostSheetWebReport(meta, campaigns);
  };

  const handleFocusColumnGuide = (colNum: number) => {
    setActiveGuideTab('all');
    setFocusedColumnNum(colNum);

    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = window.setTimeout(() => {
      const cardEl = document.getElementById(`guia-col-${colNum}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.focus({ preventScroll: true });
      }
    }, 60);
  };

  const handleBackToTable = () => {
    const tableEl = document.getElementById('planilha-custos-tabela');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleApplyBatch = () => {
    if (!batchFiltro.trim() && !batchCidade.trim()) return;
    if (onBatchUpdateFiltroCidade) {
      onBatchUpdateFiltroCidade(batchFiltro.trim(), batchCidade.trim());
    } else {
      campaigns.forEach((c) => {
        if (batchFiltro.trim()) onUpdateFiltro?.(c.id, batchFiltro.trim());
        if (batchCidade.trim()) onUpdateCidade?.(c.id, batchCidade.trim());
      });
    }
    setBatchSuccess(true);
    setTimeout(() => setBatchSuccess(false), 3000);
  };

  // Visible columns (omit completely empty columns ONLY in read-only presentation / shared link mode)
  const { activeColumns, visibleSet, displayNumMap, allVisible, leadingColSpan } = useMemo(
    () => getActiveCostColumns(campaigns, isReadOnly),
    [campaigns, isReadOnly]
  );
  const vis = (colNum: number) => visibleSet.has(colNum);
  const colBadgeNum = (colNum: number) => displayNumMap.get(colNum) ?? colNum;

  const setupCols = useMemo(
    () => activeColumns.filter((c) => c.category === 'setup' || c.category === 'financeiro'),
    [activeColumns]
  );
  const topoCols = useMemo(() => activeColumns.filter((c) => c.category === 'topo'), [activeColumns]);
  const meioCols = useMemo(() => activeColumns.filter((c) => c.category === 'meio'), [activeColumns]);
  const fundoCols = useMemo(() => activeColumns.filter((c) => c.category === 'fundo'), [activeColumns]);

  // Ensure activeGuideTab resets to 'all' if the active category becomes empty in presentation mode
  useEffect(() => {
    if (activeGuideTab === 'setup' && setupCols.length === 0) setActiveGuideTab('all');
    else if (activeGuideTab === 'topo' && topoCols.length === 0) setActiveGuideTab('all');
    else if (activeGuideTab === 'meio' && meioCols.length === 0) setActiveGuideTab('all');
    else if (activeGuideTab === 'fundo' && fundoCols.length === 0) setActiveGuideTab('all');
  }, [activeGuideTab, setupCols.length, topoCols.length, meioCols.length, fundoCols.length]);

  // Filter campaigns based on search query
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.format && c.format.toLowerCase().includes(q)) ||
        (c.objective && c.objective.toLowerCase().includes(q))
    );
  }, [campaigns, searchQuery]);

  // Filter guide columns from activeColumns
  const filteredGuide = useMemo(() => {
    if (activeGuideTab === 'all') return activeColumns;
    if (activeGuideTab === 'setup') return setupCols;
    if (activeGuideTab === 'topo') return topoCols;
    if (activeGuideTab === 'meio') return meioCols;
    return fundoCols;
  }, [activeGuideTab, activeColumns, setupCols, topoCols, meioCols, fundoCols]);

  let lastDateKey = '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ====================================================================== */}
      {/* 0. EXECUTIVE PRESENTATION HEADER (QUANDO EXIBIDO ISOLADAMENTE) */}
      {/* ====================================================================== */}
      {!hideHeader && (
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#121316] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter">
                {(meta.cliente || 'C').charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <span>Planilha de Custos</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400 font-mono normal-case tracking-normal">
                  {meta.mes} {meta.ano}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Relatório de {meta.cliente || 'Cliente'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                {allVisible
                  ? 'Matriz Oficial de 17 Colunas e Métricas Detalhadas'
                  : `Matriz Executiva de ${activeColumns.length} Colunas Preenchidas e Métricas Detalhadas`}{' '}
                • Base de dados oficial da Meta ({campaigns.length} ações)
              </p>
            </div>
          </div>

          {/* Action Toolbar (Share link, Baixar Web (.html), PDF, Planilha, Modo Apresentação) */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {!isClientLocked && onCreateClientLink && (
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={isGeneratingLink}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                title="Gerar e copiar link personalizado e exclusivo (somente leitura) para enviar ao cliente"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Exclusivo Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span>{isGeneratingLink ? 'Gerando Link...' : 'Link da Apresentação'}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleExportHtml}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              title="Baixar a página Web da Planilha de Custos em um arquivo .html autônomo"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Baixar Web (.html)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              title="Imprimir ou Salvar como PDF Executivo"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>PDF</span>
            </button>

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                disabled={isExportingExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                title="Baixar planilha oficial formatada"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingExcel ? 'Gerando...' : 'Planilha'}</span>
              </button>
            )}

            {onTogglePresentationMode && (
              <button
                type="button"
                onClick={onTogglePresentationMode}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  isPresentationMode
                    ? 'bg-amber-500 text-neutral-950 font-black'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                }`}
                title={isPresentationMode ? 'Sair do Modo Apresentação' : 'Entrar no Modo Apresentação Limpa para o Cliente'}
              >
                {isPresentationMode ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Sair da Apresentação</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Ver como Cliente</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {(generatedLinkUrl || linkError) && !isClientLocked && (
          <div className="relative mt-4 p-3 rounded-xl bg-neutral-900/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs no-print">
            {linkError ? (
              <span className="text-red-400 font-semibold">{linkError}</span>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-neutral-300 shrink-0 font-semibold">Link exclusivo do cliente (somente leitura):</span>
                  <code className="text-amber-300 font-mono text-[11px] truncate">{generatedLinkUrl}</code>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratedLinkUrl(null)}
                  className="text-neutral-400 hover:text-white text-[11px] font-semibold shrink-0 self-end sm:self-center cursor-pointer"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 1. MODERN EXECUTIVE TABLE CARD (PLANILHA DE CUSTOS) */}
      {/* ====================================================================== */}
      <div id="planilha-custos-tabela" className="bg-[#141518] rounded-2xl border border-[#2b2d33] shadow-2xl overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181a20] via-[#1c1e26] to-[#181a20] border-b border-[#2b2d33] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Planilha de Custos ·{' '}
                {allVisible ? '17 Colunas Oficiais Meta Ads' : `${activeColumns.length} Colunas Preenchidas Meta Ads`}
              </span>
              <span className="text-[11px] text-neutral-400">
                Clique no título de qualquer coluna abaixo para ir direto à explicação dela
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Ações Mensais do Período</span>
              <span className="text-xs font-normal text-neutral-400 inline-flex items-center gap-1">
                (
                <EditableText
                  value={meta.mes}
                  onChange={(v) => onUpdateMeta?.({ mes: v })}
                  isReadOnly={isReadOnly || !onUpdateMeta}
                  placeholder="Mês"
                  className="text-xs text-neutral-300 w-24 text-center"
                />
                <EditableText
                  value={meta.ano}
                  onChange={(v) => onUpdateMeta?.({ ano: v })}
                  isReadOnly={isReadOnly || !onUpdateMeta}
                  placeholder="Ano"
                  className="text-xs text-neutral-300 w-14 text-center"
                />
                )
              </span>
            </h3>
          </div>

          {/* Quick Search & Indicators */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome ou formato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111215] border border-[#2b2d33] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <a
              href="#guia-17-colunas"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Guia & Legenda</span>
            </a>
          </div>
        </div>

        {/* Quick Batch Filter and Cidade in Traditional Table (Somente no modo editor) */}
        {!isReadOnly && (
          <div className="p-3 bg-[#121316] border-b border-[#2b2d33] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10.5px] uppercase font-bold text-amber-400">Inserir Filtro & Cidade em Lote:</span>
              <input
                type="text"
                placeholder="Filtro (ex: 18 a 65 anos • Raio 5km)"
                value={batchFiltro}
                onChange={(e) => setBatchFiltro(e.target.value)}
                className="bg-[#181a20] border border-[#33353e] rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 w-52 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <input
                type="text"
                placeholder="Cidade (ex: Três Lagoas - MS)"
                value={batchCidade}
                onChange={(e) => setBatchCidade(e.target.value)}
                className="bg-[#181a20] border border-[#33353e] rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 w-44 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="button"
                onClick={handleApplyBatch}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer shrink-0 transition-colors"
              >
                Aplicar a Todas
              </button>
            </div>
            {batchSuccess && (
              <span className="text-[11px] font-bold text-emerald-400">
                ✓ Filtro e Cidade aplicados a todas as ações!
              </span>
            )}
          </div>
        )}

        {/* Barra Laranja Oficial do Modelo */}
        <div
          className="text-white py-2.5 px-4 text-center font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm"
          style={{ backgroundColor: '#FF9900' }}
        >
          AÇÕES MENSAIS • MATRIZ OFICIAL DE IMPULSIONAMENTO
        </div>

        {/* The 17-Column Table */}
        <div className="overflow-x-auto max-h-[750px] scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
          <table className="w-full border-collapse text-[11px] font-sans">
            <thead className="sticky top-0 z-20 bg-[#1a1c22] shadow-md border-b-2 border-neutral-700">
              <tr className="text-neutral-300 font-bold uppercase tracking-tight text-[9px] select-none">
                {vis(1) && (
                  <th className="border-r border-[#2b2d33] text-left whitespace-nowrap min-w-[230px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(1)}
                      className="w-full py-3 px-3 flex items-center gap-1 text-left cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Nome da Ação"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(1)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Nome da Ação</span>
                    </button>
                  </th>
                )}
                {vis(2) && (
                  <th className="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(2)}
                      className="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Formato"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(2)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Formato</span>
                    </button>
                  </th>
                )}
                {vis(3) && (
                  <th className="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[95px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(3)}
                      className="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Validade"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(3)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Validade</span>
                    </button>
                  </th>
                )}
                {vis(4) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(4)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-amber-950/50"
                      title="Clique para ir à explicação da Coluna: Investimento"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-amber-300 transition-colors">{colBadgeNum(4)}</span>
                      <span className="group-hover/th:underline">Investimento</span>
                    </button>
                  </th>
                )}
                {vis(5) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/30 hover:bg-amber-950/50 text-amber-300 font-extrabold transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(5)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-amber-950/60"
                      title="Clique para ir à explicação da Coluna: Valor Gasto"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-900/80 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-amber-200 transition-colors">{colBadgeNum(5)}</span>
                      <span className="group-hover/th:underline">Valor Gasto</span>
                    </button>
                  </th>
                )}
                {vis(6) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-blue-950/20 hover:bg-blue-950/40 text-blue-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(6)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-blue-950/50"
                      title="Clique para ir à explicação da Coluna: Alcance"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-blue-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-blue-200 transition-colors">{colBadgeNum(6)}</span>
                      <span className="group-hover/th:underline">Alcance</span>
                    </button>
                  </th>
                )}
                {vis(7) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(7)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Engajamento"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(7)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Engajamento</span>
                    </button>
                  </th>
                )}
                {vis(8) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(8)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Cliques Link"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(8)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Cliques Link</span>
                    </button>
                  </th>
                )}
                {vis(9) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(9)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-purple-950/50"
                      title="Clique para ir à explicação da Coluna: Visualização (ThruPlay)"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-purple-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-purple-200 transition-colors">{colBadgeNum(9)}</span>
                      <span className="group-hover/th:underline">ThruPlay</span>
                    </button>
                  </th>
                )}
                {vis(10) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-blue-950/20 hover:bg-blue-950/40 text-blue-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(10)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-blue-950/50"
                      title="Clique para ir à explicação da Coluna: Custo por 1.000 Pessoas (CPM)"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-blue-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-blue-200 transition-colors">{colBadgeNum(10)}</span>
                      <span className="group-hover/th:underline">Custo / 1.000</span>
                    </button>
                  </th>
                )}
                {vis(11) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(11)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Custo por Cliques Link (CPC)"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(11)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Custo / Clique</span>
                    </button>
                  </th>
                )}
                {vis(12) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(12)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-purple-950/50"
                      title="Clique para ir à explicação da Coluna: Custo por ThruPlay"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-purple-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-purple-200 transition-colors">{colBadgeNum(12)}</span>
                      <span className="group-hover/th:underline">Custo / ThruPlay</span>
                    </button>
                  </th>
                )}
                {vis(13) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(13)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Custo por Interação"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(13)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Custo / Interação</span>
                    </button>
                  </th>
                )}
                {vis(14) && (
                  <th className="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(14)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-emerald-950/50"
                      title="Clique para ir à explicação da Coluna: Custo por Conversa"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-900/60 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-emerald-200 transition-colors">{colBadgeNum(14)}</span>
                      <span className="group-hover/th:underline">Custo / Conversa</span>
                    </button>
                  </th>
                )}
                {vis(15) && (
                  <th className="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(15)}
                      className="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Filtro"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(15)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Filtro</span>
                    </button>
                  </th>
                )}
                {vis(16) && (
                  <th className="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(16)}
                      className="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-neutral-800"
                      title="Clique para ir à explicação da Coluna: Cidade"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-neutral-400 transition-colors">{colBadgeNum(16)}</span>
                      <span className="group-hover/th:text-amber-300 transition-colors">Cidade</span>
                    </button>
                  </th>
                )}
                {vis(17) && (
                  <th className="border-b border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 font-extrabold transition-colors">
                    <button
                      type="button"
                      onClick={() => handleFocusColumnGuide(17)}
                      className="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer group/th focus:outline-none focus-visible:bg-emerald-950/70"
                      title="Clique para ir à explicação da Coluna: Conversas Iniciadas"
                    >
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-800 group-hover/th:bg-amber-500 group-hover/th:text-neutral-950 text-white transition-colors">{colBadgeNum(17)}</span>
                      <span className="group-hover/th:underline">Conversas</span>
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#23252b]">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="py-12 text-center text-neutral-400 text-sm italic">
                    Nenhuma campanha encontrada com o filtro "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((r, idx) => {
                  const curDate = extractDateFromName(r.name) || (r.sortDate ? new Date(r.sortDate) : null);
                  const curDateKey = curDate ? curDate.getTime() : 'none';

                  const showSeparator = idx > 0 && curDateKey !== lastDateKey;
                  lastDateKey = String(curDateKey);

                  const {
                    engValue,
                    linksValue,
                    viewsValue,
                    cpmValue,
                    cpcValue,
                    cThruValue,
                    cIntValue,
                    cConvValue,
                    convValue
                  } = getCampaignRowDisplayMetrics(r);

                  const canEditCell = !isReadOnly && Boolean(onUpdateCampaign);

                  return (
                    <React.Fragment key={r.id}>
                      {showSeparator && (
                        <tr className="bg-[#101114] border-y border-[#2b2d33] h-2">
                          <td colSpan={activeColumns.length} className="h-2 p-0" />
                        </tr>
                      )}
                      <tr className="hover:bg-[#1a1c24] transition-colors group">
                        {vis(1) && (
                          <td className="py-2.5 px-3 border-r border-[#23252b] text-left font-medium text-white group-hover:text-amber-200 transition-colors">
                            <EditableText
                              value={r.displayName || r.name}
                              onChange={(v) => onUpdateCampaign?.(r.id, { displayName: v })}
                              isReadOnly={!canEditCell}
                              placeholder="Nome da ação"
                              className="font-medium text-white w-full text-[11px]"
                            />
                            {r.aiNotes && (
                              <div className="mt-0.5">
                                <EditableText
                                  value={r.aiNotes}
                                  onChange={(v) => onUpdateCampaign?.(r.id, { aiNotes: v })}
                                  isReadOnly={!canEditCell}
                                  placeholder="Observação"
                                  className="text-[9px] text-amber-400/80 font-normal w-full"
                                />
                              </div>
                            )}
                          </td>
                        )}
                        {vis(2) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-300">
                            <EditableText
                              value={r.format || ''}
                              onChange={(v) => onUpdateCampaign?.(r.id, { format: v })}
                              isReadOnly={!canEditCell}
                              placeholder="Formato"
                              className="text-center text-neutral-300 w-24 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(3) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-400">
                            <EditableText
                              value={r.validity || ''}
                              onChange={(v) => onUpdateCampaign?.(r.id, { validity: v })}
                              isReadOnly={!canEditCell}
                              placeholder="Validade"
                              className="text-center text-neutral-300 w-24 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(4) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">
                            <EditableNumber
                              value={r.budget}
                              onChange={(v) => onUpdateCampaign?.(r.id, { budget: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={false}
                              className="text-right text-neutral-300 w-24 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(5) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-amber-400 bg-amber-950/10">
                            <EditableNumber
                              value={r.spent}
                              onChange={(v) => onUpdateCampaign?.(r.id, { spent: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={false}
                              className="text-right font-bold text-amber-400 w-24 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(6) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 font-semibold bg-blue-950/10">
                            <EditableNumber
                              value={r.reach}
                              onChange={(v) => onUpdateCampaign?.(r.id, { reach: v })}
                              format="int"
                              isReadOnly={!canEditCell}
                              dashWhenZero={false}
                              className="text-right font-semibold text-blue-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(7) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">
                            <EditableNumber
                              value={engValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { eng: v })}
                              format="int"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-neutral-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(8) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">
                            <EditableNumber
                              value={linksValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { links: v })}
                              format="int"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-neutral-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(9) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 font-semibold bg-purple-950/10">
                            <EditableNumber
                              value={viewsValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { views: v })}
                              format="int"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right font-semibold text-purple-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(10) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 bg-blue-950/10">
                            <EditableNumber
                              value={cpmValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { cpm: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-blue-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(11) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">
                            <EditableNumber
                              value={cpcValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { cpc: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-neutral-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(12) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 bg-purple-950/10">
                            <EditableNumber
                              value={cThruValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { cThru: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-purple-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(13) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">
                            <EditableNumber
                              value={cIntValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { cInt: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-neutral-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(14) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-emerald-300 bg-emerald-950/10">
                            <EditableNumber
                              value={cConvValue}
                              onChange={(v) => onUpdateCampaign?.(r.id, { cConv: v })}
                              format="brl"
                              isReadOnly={!canEditCell}
                              dashWhenZero={true}
                              className="text-right text-emerald-300 w-20 text-[11px]"
                            />
                          </td>
                        )}
                        {vis(15) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap">
                            {isReadOnly ? (
                              <span className="text-[10px] text-neutral-200 block min-w-[85px] truncate" title={r.filtro || undefined}>
                                {r.filtro || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Filtro..."
                                value={r.filtro || ''}
                                onChange={(e) => onUpdateFiltro?.(r.id, e.target.value)}
                                className="bg-[#111215] hover:bg-[#181a20] focus:bg-[#181a20] border border-transparent hover:border-[#383b44] focus:border-amber-400 rounded px-1.5 py-0.5 text-[10px] text-neutral-200 text-center w-full min-w-[85px] focus:outline-none transition-all truncate"
                                title="Editar Filtro (público / raio)"
                              />
                            )}
                          </td>
                        )}
                        {vis(16) && (
                          <td className="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap">
                            {isReadOnly ? (
                              <span className="text-[10px] text-neutral-200 block min-w-[80px] truncate" title={r.cidade || undefined}>
                                {r.cidade || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Cidade..."
                                value={r.cidade || ''}
                                onChange={(e) => onUpdateCidade?.(r.id, e.target.value)}
                                className="bg-[#111215] hover:bg-[#181a20] focus:bg-[#181a20] border border-transparent hover:border-[#383b44] focus:border-amber-400 rounded px-1.5 py-0.5 text-[10px] text-neutral-200 text-center w-full min-w-[80px] focus:outline-none transition-all truncate"
                                title="Editar Cidade"
                              />
                            )}
                          </td>
                        )}
                        {vis(17) && (
                          <td className="py-2.5 px-2 border-b border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-emerald-400 bg-emerald-950/20">
                            {canEditCell ? (
                              <div className="inline-flex items-center justify-end gap-1">
                                <EditableNumber
                                  value={convValue}
                                  onChange={(v) => onUpdateCampaign?.(r.id, { conv: v })}
                                  format="int"
                                  dashWhenZero={true}
                                  className="text-right font-bold text-emerald-400 w-16 text-[11px]"
                                />
                                {convValue > 0 && <span className="text-[10px]">conv.</span>}
                              </div>
                            ) : (
                              <span>{convValue > 0 ? `${fmtNum(convValue)} conv.` : '—'}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Consolidated Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-[#16171d] border-t-2 border-amber-500 font-mono text-[10.5px]">
              <tr className="text-white font-bold">
                {leadingColSpan > 0 && (
                  <td colSpan={leadingColSpan} className="py-3 px-3 border-r border-[#2b2d33] text-left uppercase font-sans tracking-wide">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Total Consolidado ({filteredCampaigns.length} ações)</span>
                    </div>
                  </td>
                )}
                {vis(4) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-neutral-300">
                    {fmtBRL(totalBudget)}
                  </td>
                )}
                {vis(5) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono font-black text-amber-300 bg-amber-950/30">
                    {fmtBRL(totalSpent)}
                  </td>
                )}
                {vis(6) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono font-black text-blue-300 bg-blue-950/30">
                    {fmtNum(totalReach)}
                  </td>
                )}
                {vis(7) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-neutral-300">
                    {fmtNum(totalInt)}
                  </td>
                )}
                {vis(8) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-neutral-300">
                    {fmtNum(totalLinks)}
                  </td>
                )}
                {vis(9) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono font-black text-purple-300 bg-purple-950/30">
                    {fmtNum(totalViews)}
                  </td>
                )}
                {vis(10) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-blue-300">
                    {totalReach > 0 ? fmtBRL((totalSpent / totalReach) * 1000) : '—'}
                  </td>
                )}
                {vis(11) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-neutral-300">
                    {totalLinks > 0 ? fmtBRL(totalSpent / totalLinks) : '—'}
                  </td>
                )}
                {vis(12) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-purple-300">
                    {totalViews > 0 ? fmtBRL(totalSpent / totalViews) : '—'}
                  </td>
                )}
                {vis(13) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-neutral-300">
                    {totalInt > 0 ? fmtBRL(totalSpent / totalInt) : '—'}
                  </td>
                )}
                {vis(14) && (
                  <td className="py-3 px-2 border-r border-[#2b2d33] text-right font-mono text-emerald-300">
                    {totalConv > 0 ? fmtBRL(totalSpent / totalConv) : '—'}
                  </td>
                )}
                {vis(15) && (
                  <td className="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">
                    —
                  </td>
                )}
                {vis(16) && (
                  <td className="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">
                    —
                  </td>
                )}
                {vis(17) && (
                  <td className="py-3 px-2 text-right font-mono font-black text-emerald-400 bg-emerald-950/40">
                    {totalConv > 0 ? `${totalConv} conv.` : '—'}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 2. DICIONÁRIO COMPLETO DAS 17 COLUNAS DA PLANILHA */}
      {/* ====================================================================== */}
      <div id="guia-17-colunas" className="bg-[#141518] rounded-2xl border border-[#2b2d33] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b2d33] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Glossário Técnico & Executivo
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              O que cada uma das {allVisible ? '17' : activeColumns.length} colunas significa e por que é importante?
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              Consulte abaixo a descrição didática de cada coluna da planilha, por que ela é indispensável para o cliente
              e como analisar seus números com precisão.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
            <button
              onClick={() => setActiveGuideTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeGuideTab === 'all'
                  ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              Todas ({activeColumns.length})
            </button>
            {setupCols.length > 0 && (
              <button
                onClick={() => setActiveGuideTab('setup')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'setup'
                    ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {allVisible ? 'Setup & Verba (1 a 5)' : `Setup & Verba (${setupCols.length})`}
              </button>
            )}
            {topoCols.length > 0 && (
              <button
                onClick={() => setActiveGuideTab('topo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'topo'
                    ? 'bg-blue-600 text-white font-extrabold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {allVisible ? 'Alcance / CPM (6 e 10)' : `Alcance / CPM (${topoCols.length})`}
              </button>
            )}
            {meioCols.length > 0 && (
              <button
                onClick={() => setActiveGuideTab('meio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'meio'
                    ? 'bg-purple-600 text-white font-extrabold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {allVisible ? 'Engajamento / Vídeos (7 a 13)' : `Engajamento / Vídeos (${meioCols.length})`}
              </button>
            )}
            {fundoCols.length > 0 && (
              <button
                onClick={() => setActiveGuideTab('fundo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'fundo'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {allVisible ? 'WhatsApp & Vendas (14 e 17)' : `WhatsApp & Vendas (${fundoCols.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuide.map((col) => {
            const isFocused = focusedColumnNum === col.num;
            return (
              <div
                key={col.num}
                id={`guia-col-${col.num}`}
                tabIndex={-1}
                onClick={() => setFocusedColumnNum(col.num)}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 group outline-none cursor-pointer ${
                  isFocused
                    ? 'bg-[#1e212a] border-amber-400 ring-2 ring-amber-400/70 shadow-2xl shadow-amber-500/15'
                    : 'bg-[#181a20] border-[#2b2d33] hover:border-amber-500/40'
                }`}
              >
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg border font-mono text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                          isFocused
                            ? 'bg-amber-500 border-amber-400 text-neutral-950'
                            : 'bg-neutral-800 border-neutral-700 text-amber-400'
                        }`}
                      >
                        {colBadgeNum(col.num)}
                      </span>
                      <h4
                        className={`font-bold text-sm transition-colors truncate ${
                          isFocused ? 'text-amber-300' : 'text-white group-hover:text-amber-300'
                        }`}
                      >
                        {col.name}
                      </h4>
                    </div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border shrink-0 ${col.stageColor}`}>
                      {col.badge}
                    </span>
                  </div>

                  {/* Meaning */}
                  <div className="text-xs text-neutral-300 leading-relaxed">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      O que significa:
                    </span>
                    <p>{col.meaning}</p>
                  </div>

                  {/* Importance */}
                  <div className="text-xs text-neutral-300 leading-relaxed bg-[#121317] p-2.5 rounded-lg border border-[#22242a]">
                    <span className="text-amber-400/90 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Por que é importante para o seu negócio:
                    </span>
                    <p className="text-neutral-300 text-[11px]">{col.importance}</p>
                  </div>

                  {/* Formula if exists */}
                  {col.formula && (
                    <div className="text-[10.5px] text-neutral-400 flex items-center gap-1.5 font-mono bg-black/30 px-2 py-1 rounded border border-neutral-800">
                      <span className="text-neutral-500">Cálculo:</span>
                      <strong className="text-neutral-200">{col.formula}</strong>
                    </div>
                  )}
                </div>

                {/* Specialist tip + Back to table button when focused */}
                <div className="pt-2.5 border-t border-[#23252b] flex items-end justify-between gap-2">
                  <div className="text-[10.5px] text-neutral-400 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="italic leading-snug">{col.tip}</span>
                  </div>
                  {isFocused && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBackToTable();
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                      title="Voltar ao topo da planilha"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Tabela</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
