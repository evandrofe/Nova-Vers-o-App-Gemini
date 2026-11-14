import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  MessageCircle,
  Video,
  MousePointerClick,
  FileSpreadsheet,
  Printer,
  Share2,
  Check,
  Download,
  Eye,
  Award,
  Layers,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { CampaignRow, CapaData, ReportMeta } from '../types';
import { BudgetDonutChart } from './BudgetDonutChart';
import { exportInteractiveWebReport } from '../lib/interactiveHtmlExport';
import { SocialAudienceSection } from './SocialAudienceSection';

interface ReporteiPresentationViewProps {
  meta: ReportMeta;
  campaigns: CampaignRow[];
  capa: CapaData;
  onExportExcel: () => void;
  isExportingExcel: boolean;
  isPresentationMode?: boolean;
  isClientLocked?: boolean;
  onTogglePresentationMode?: () => void;
  onCreateClientLink?: () => Promise<string>;
}

interface KpiBoxConfig {
  id: string;
  label: string;
  value: string;
  subtext: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgHoverClass: string;
  labelColorClass: string;
  valueColorClass: string;
  borderHoverClass: string;
  tooltipTitle: string;
  tooltipDescription: string;
}

export const ReporteiPresentationView: React.FC<ReporteiPresentationViewProps> = ({
  meta,
  campaigns,
  capa,
  onExportExcel,
  isExportingExcel,
  isPresentationMode = false,
  isClientLocked = false,
  onTogglePresentationMode,
  onCreateClientLink,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'conv' | 'reels' | 'alcance'>('all');
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  // Formatting helpers
  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const fmtNum = (v: number) =>
    new Intl.NumberFormat('pt-BR').format(v || 0);

  // Consolidated Meta Ads Metrics
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalImpr = campaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);

  const avgFrequency = totalReach > 0 ? (totalImpr / totalReach).toFixed(2) : '1.00';
  const avgCostPerConv = totalConv > 0 ? totalSpent / totalConv : 0;
  const avgCPM = totalReach > 0 ? (totalSpent / totalReach) * 1000 : 0;
  const avgCostPerView = totalViews > 0 ? totalSpent / totalViews : 0;
  const avgCTR = totalImpr > 0 ? ((totalLinks / totalImpr) * 100).toFixed(2) : '0.00';

  // Generate & copy exclusive read-only URL
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
    exportInteractiveWebReport(meta, campaigns, capa);
  };

  // Filtered campaigns for the Highlights grid
  const filteredCampaigns = campaigns.filter((c) => {
    if (filterType === 'conv') return c.conv > 0;
    if (filterType === 'reels') return /^Reels/i.test(c.objective) || c.views > 0;
    if (filterType === 'alcance') return c.objective === 'Alc' || (/alcance/i.test(c.name) && !c.conv);
    return true;
  });

  const kpiBoxes: KpiBoxConfig[] = [
    {
      id: 'spent',
      label: 'Valor Investido',
      value: fmtBRL(totalSpent),
      subtext: (
        <span>
          Orçamento: <strong className="text-neutral-300 font-mono">{fmtBRL(totalBudget)}</strong>
        </span>
      ),
      icon: DollarSign,
      iconColorClass: 'text-amber-400',
      iconBgHoverClass: 'hover:bg-amber-500/15',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-amber-500/40',
      tooltipTitle: 'O que é Valor Investido?',
      tooltipDescription:
        'É quanto dinheiro realmente foi gasto nos anúncios durante o mês. O "Orçamento" abaixo mostra o teto que tinha sido planejado inicialmente.',
    },
    {
      id: 'reach',
      label: 'Alcance Total',
      value: fmtNum(totalReach),
      subtext: 'Contas únicas atingidas',
      icon: Users,
      iconColorClass: 'text-blue-400',
      iconBgHoverClass: 'hover:bg-blue-500/15',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-blue-500/40',
      tooltipTitle: 'O que é Alcance Total?',
      tooltipDescription:
        'É a quantidade de pessoas diferentes (contas únicas) que viram os seus anúncios pelo menos uma vez no Instagram ou Facebook.',
    },
    {
      id: 'impressions',
      label: 'Impressões Totais',
      value: fmtNum(totalImpr),
      subtext: (
        <span>
          Frequência média: <strong className="text-neutral-300 font-mono">{avgFrequency}</strong>
        </span>
      ),
      icon: Eye,
      iconColorClass: 'text-purple-400',
      iconBgHoverClass: 'hover:bg-purple-500/15',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-purple-300',
      borderHoverClass: 'hover:border-purple-500/40',
      tooltipTitle: 'O que são Impressões e Frequência?',
      tooltipDescription:
        'Impressões mostram quantas vezes os anúncios apareceram na tela no total. A frequência indica quantas vezes, em média, cada pessoa viu o anúncio.',
    },
    {
      id: 'whatsapp',
      label: 'Conversas WhatsApp',
      value: totalConv > 0 ? `${totalConv} conv.` : '—',
      subtext: (
        <span>
          Custo por conversa:{' '}
          <strong className="text-emerald-300 font-mono">
            {avgCostPerConv > 0 ? fmtBRL(avgCostPerConv) : '—'}
          </strong>
        </span>
      ),
      icon: MessageCircle,
      iconColorClass: 'text-emerald-400',
      iconBgHoverClass: 'hover:bg-emerald-500/15',
      labelColorClass: 'text-emerald-400',
      valueColorClass: 'text-emerald-400',
      borderHoverClass: 'hover:border-emerald-500/40',
      tooltipTitle: 'O que são Conversas WhatsApp?',
      tooltipDescription:
        'Quantidade de pessoas que clicaram no anúncio e abriram uma conversa no WhatsApp da sua empresa, junto com o custo médio de cada contato.',
    },
    {
      id: 'thruplay',
      label: 'Visualizações Vídeo (ThruPlay)',
      value: totalViews > 0 ? fmtNum(totalViews) : '—',
      subtext: (
        <span>
          Custo por view:{' '}
          <strong className="text-purple-300 font-mono">
            {avgCostPerView > 0 ? fmtBRL(avgCostPerView) : '—'}
          </strong>
        </span>
      ),
      icon: Video,
      iconColorClass: 'text-purple-400',
      iconBgHoverClass: 'hover:bg-purple-500/15',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-purple-500/40',
      tooltipTitle: 'O que é Visualização (ThruPlay)?',
      tooltipDescription:
        'Conta quantas vezes seus vídeos ou Reels foram assistidos por pelo menos 15 segundos (ou até o final, quando forem mais curtos), medindo atenção real.',
    },
    {
      id: 'links',
      label: 'Cliques no Link',
      value: totalLinks > 0 ? fmtNum(totalLinks) : '—',
      subtext: (
        <span>
          CTR Médio: <strong className="text-amber-300 font-mono">{avgCTR}%</strong>
        </span>
      ),
      icon: MousePointerClick,
      iconColorClass: 'text-amber-400',
      iconBgHoverClass: 'hover:bg-amber-500/15',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-amber-500/40',
      tooltipTitle: 'O que são Cliques no Link e CTR?',
      tooltipDescription:
        'Total de cliques nos botões ou links dos anúncios para abrir seu site, catálogo ou WhatsApp. O CTR mostra a porcentagem de quem viu e clicou.',
    },
    {
      id: 'cpm',
      label: 'Custo por 1.000 Contas',
      value: avgCPM > 0 ? fmtBRL(avgCPM) : '—',
      subtext: 'Eficiência geral de entrega',
      icon: TrendingUp,
      iconColorClass: 'text-neutral-300',
      iconBgHoverClass: 'hover:bg-neutral-700/60',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-neutral-700',
      tooltipTitle: 'O que é Custo por 1.000 Contas?',
      tooltipDescription:
        'Mostra quanto custou, em média, para exibir seus anúncios para cada 1.000 pessoas. Quanto menor esse valor, mais barata foi a divulgação.',
    },
    {
      id: 'actions',
      label: 'Ações Veiculadas',
      value: String(campaigns.length),
      subtext: 'Campanhas ativas no mês',
      icon: Layers,
      iconColorClass: 'text-neutral-300',
      iconBgHoverClass: 'hover:bg-neutral-700/60',
      labelColorClass: 'text-neutral-400',
      valueColorClass: 'text-white',
      borderHoverClass: 'hover:border-neutral-700',
      tooltipTitle: 'O que são Ações Veiculadas?',
      tooltipDescription:
        'É a quantidade total de campanhas e impulsionamentos pagos que rodaram durante o período analisado neste relatório.',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ======================================================================== */}
      {/* EXECUTIVE BRAND HEADER + 8-METRIC GRID */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Subtle executive ambient glow contained inside clipped background layer */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-800/80">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#121316] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter">
                {(meta.cliente || 'C').charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <span>Relatório Mensal</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400 font-mono normal-case tracking-normal">
                  {meta.mes} {meta.ano}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Relatório de {meta.cliente || 'Cliente'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Análise de Desempenho dos Anúncios e Campanhas Pagas • Base de dados oficial da Meta
              </p>
            </div>
          </div>

          {/* Action Toolbar (Share link, Download HTML, PDF, Presentation Mode) */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Share Interactive Exclusive Read-Only Client Link Button */}
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

            {/* Download Standalone Interactive HTML file */}
            <button
              type="button"
              onClick={handleExportHtml}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              title="Baixar a apresentação inteira em um arquivo .html autônomo (abre direto em qualquer navegador)"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Baixar Web (.html)</span>
            </button>

            {/* PDF Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              title="Imprimir ou Salvar como PDF Executivo"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>PDF</span>
            </button>

            {/* Excel Download */}
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

            {/* Toggle Full Presentation Mode */}
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
                    <span>Modo Apresentação</span>
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

        {/* ======================================================================== */}
        {/* 8-METRIC GRID WITH INTERACTIVE HOVER EXPLANATION BALLOONS */}
        {/* ======================================================================== */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {kpiBoxes.map((box, idx) => {
            const Icon = box.icon;
            const isOpen = openTooltipId === box.id;
            const isLeftMobileCol = idx % 2 === 0;
            const tooltipPositionClass = isLeftMobileCol
              ? '-right-24 sm:right-0'
              : 'right-0';
            const arrowPositionClass = isLeftMobileCol
              ? 'right-[104px] sm:right-3'
              : 'right-3';

            return (
              <div
                key={box.id}
                className={`bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 transition-colors relative ${box.borderHoverClass}`}
              >
                <div className={`flex items-center justify-between gap-2 mb-1.5 ${box.labelColorClass}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider leading-tight">
                    {box.label}
                  </span>

                  {/* Hoverable Icon + Explanation Balloon */}
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => setOpenTooltipId(box.id)}
                    onMouseLeave={() => setOpenTooltipId((prev) => (prev === box.id ? null : prev))}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenTooltipId((prev) => (prev === box.id ? null : box.id))}
                      onFocus={() => setOpenTooltipId(box.id)}
                      onBlur={() => setOpenTooltipId((prev) => (prev === box.id ? null : prev))}
                      aria-label={`Explicação simples de ${box.label}`}
                      aria-expanded={isOpen}
                      className={`p-1.5 -m-1.5 rounded-lg transition-colors cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${box.iconBgHoverClass}`}
                    >
                      <Icon className={`w-4 h-4 ${box.iconColorClass}`} />
                    </button>

                    {/* Floating Explanation Balloon */}
                    {isOpen && (
                      <div
                        role="tooltip"
                        className={`absolute z-50 bottom-full mb-3 w-60 sm:w-64 p-3.5 rounded-2xl bg-[#181a20] border border-amber-500/40 shadow-2xl text-left pointer-events-none ${tooltipPositionClass}`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${box.iconColorClass} shrink-0`} />
                          <span>{box.tooltipTitle}</span>
                        </div>
                        <p className="text-[11.5px] text-neutral-200 leading-relaxed font-normal normal-case tracking-normal">
                          {box.tooltipDescription}
                        </p>
                        <div
                          className={`w-2.5 h-2.5 bg-[#181a20] border-r border-b border-amber-500/40 rotate-45 absolute -bottom-1.5 ${arrowPositionClass}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${box.valueColorClass}`}>
                  {box.value}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1.5">
                  {box.subtext}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================================== */}
      {/* SECTION: BUDGET DISTRIBUTION DONUT CHART */}
      {/* ======================================================================== */}
      <BudgetDonutChart
        campaigns={campaigns}
        title="Distribuição Estratégica de Verba por Objetivo"
      />

      {/* ======================================================================== */}
      {/* SECTION: ANÚNCIOS E CAMPANHAS EM DESTAQUE */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Performance Individual
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-0.5">
              Anúncios e Campanhas em Destaque
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Métricas detalhadas, custos unitários e formatos de cada anúncio pago
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800 text-xs no-print">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === 'all'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('conv')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === 'conv'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              WhatsApp ({campaigns.filter((c) => c.conv > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('reels')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === 'reels'
                  ? 'bg-purple-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Reels ({campaigns.filter((c) => c.views > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('alcance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === 'alcance'
                  ? 'bg-blue-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Alcance
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCampaigns.map((c, index) => {
            const isTopConv = c.conv > 0 && c.conv >= Math.max(...campaigns.map((x) => x.conv));
            const isTopReach = c.reach >= Math.max(...campaigns.map((x) => x.reach));
            const isReels = /^Reels/i.test(c.objective) || c.views > 0;

            let badge = 'Alcance';
            let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            let primaryResultLabel = 'ALCANCE';
            let primaryResultVal = fmtNum(c.reach);
            let unitCostLabel = 'CPM';
            let unitCostVal = c.cpm > 0 ? fmtBRL(c.cpm) : '—';

            if (c.conv > 0) {
              badge = 'WhatsApp Lead';
              badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              primaryResultLabel = 'CONVERSAS';
              primaryResultVal = `${c.conv} iniciadas`;
              unitCostLabel = 'CUSTO / CONV.';
              unitCostVal = c.cConv > 0 ? fmtBRL(c.cConv) : '—';
            } else if (isReels) {
              badge = 'Reels / Vídeo';
              badgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
              primaryResultLabel = 'THRUPLAY';
              primaryResultVal = `${fmtNum(c.views)} views`;
              unitCostLabel = 'CUSTO / VIEW';
              unitCostVal = c.cThru > 0 ? fmtBRL(c.cThru) : '—';
            } else if (c.links > 0) {
              badge = 'Tráfego Link';
              badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              primaryResultLabel = 'CLIQUES LINK';
              primaryResultVal = `${fmtNum(c.links)} cliques`;
              unitCostLabel = 'CPC';
              unitCostVal = c.cpc > 0 ? fmtBRL(c.cpc) : '—';
            }

            return (
              <div
                key={c.id || index}
                className="bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 p-5 rounded-2xl transition-all shadow-md group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {badge}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Formato: <strong className="text-neutral-200">{c.format || 'Anúncio'}</strong>
                      </span>
                      {isTopConv && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                          ★ Campeão Conversões
                        </span>
                      )}
                      {isTopReach && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded">
                          ★ Maior Alcance
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-white group-hover:text-amber-400 transition-colors truncate">
                      {c.displayName || c.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Período de Veiculação: <span className="text-neutral-300">{c.validity || 'Mês vigente'}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="text-sm font-black text-white block">
                      {fmtBRL(c.spent)}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      Orçado: {fmtBRL(c.budget)}
                    </span>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-neutral-800 text-[11px] font-mono tabular-nums">
                  <div className="bg-neutral-950/50 p-2 rounded-xl border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[9.5px] uppercase font-bold tracking-tight">
                      {primaryResultLabel}
                    </span>
                    <span className="text-amber-400 font-extrabold block truncate mt-0.5">
                      {primaryResultVal}
                    </span>
                  </div>

                  <div className="bg-neutral-950/50 p-2 rounded-xl border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[9.5px] uppercase font-bold tracking-tight">
                      ALCANCE ÚNICO
                    </span>
                    <span className="text-neutral-200 font-bold block truncate mt-0.5">
                      {fmtNum(c.reach)} contas
                    </span>
                  </div>

                  <div className="bg-neutral-950/50 p-2 rounded-xl border border-neutral-800/80 text-right">
                    <span className="text-neutral-500 block text-[9.5px] uppercase font-bold tracking-tight">
                      {unitCostLabel}
                    </span>
                    <span className="text-white font-black block truncate mt-0.5">
                      {unitCostVal}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================================== */}
      {/* SECTION: BASE DE AUDIÊNCIA SOCIAL (PREENCHIDA NA ETAPA ANTERIOR) */}
      {/* ======================================================================== */}
      <SocialAudienceSection capa={capa} />
    </div>
  );
};
