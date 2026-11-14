import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  MessageCircle,
  Video,
  MousePointerClick,
  Eye,
  Award,
  Layers,
  PieChart as PieIcon,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { CampaignRow, CapaData, ReportMeta } from '../types';
import { SocialAudienceSection, hasSocialAudienceData } from './SocialAudienceSection';
import { extractDateFromName } from '../lib/metaAdsParser';
import { COLUMNS_17_GUIDE } from '../lib/columnsGuide';

interface SimpleFunctionalPdfReportProps {
  meta: ReportMeta;
  campaigns: CampaignRow[];
  capa: CapaData;
}

const COLOR_PALETTE = {
  alcance: '#3B82F6',
  whatsapp: '#10B981',
  reels: '#8B5CF6',
  trafego: '#F59E0B',
  engajamento: '#EC4899',
};

export const SimpleFunctionalPdfReport: React.FC<SimpleFunctionalPdfReportProps> = ({
  meta,
  campaigns,
  capa,
}) => {
  const fmtBRL = (v: number | undefined) => {
    if (v === undefined || v === null || isNaN(v)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const fmtNum = (v: number | undefined) => {
    if (v === undefined || v === null || isNaN(v)) return '0';
    return new Intl.NumberFormat('pt-BR').format(v);
  };

  // Consolidated Meta Ads Metrics (matching ReporteiPresentationView & UnifiedTraditionalTable)
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalImpr =
    campaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);

  const avgFrequency = totalReach > 0 ? (totalImpr / totalReach).toFixed(2) : '1.00';
  const avgCostPerConv = totalConv > 0 ? totalSpent / totalConv : 0;
  const avgCPM = totalReach > 0 ? (totalSpent / totalReach) * 1000 : 0;
  const avgCostPerView = totalViews > 0 ? totalSpent / totalViews : 0;
  const avgCTR = totalImpr > 0 ? ((totalLinks / totalImpr) * 100).toFixed(2) : '0.00';

  const maxConv = campaigns.length > 0 ? Math.max(...campaigns.map((x) => x.conv || 0)) : 0;
  const maxReach = campaigns.length > 0 ? Math.max(...campaigns.map((x) => x.reach || 0)) : 0;
  const showSocial = hasSocialAudienceData(capa);

  // Budget Distribution Donut Data (matching BudgetDonutChart Macro-Pilares)
  const chartData = useMemo(() => {
    const groups: Record<
      string,
      {
        id: string;
        name: string;
        shortName: string;
        color: string;
        value: number;
        count: number;
        reach: number;
        conv: number;
        views: number;
      }
    > = {
      alcance: {
        id: 'alcance',
        name: 'Alcance & Reconhecimento',
        shortName: 'Alcance',
        color: COLOR_PALETTE.alcance,
        value: 0,
        count: 0,
        reach: 0,
        conv: 0,
        views: 0,
      },
      whatsapp: {
        id: 'whatsapp',
        name: 'Conversas WhatsApp (Leads)',
        shortName: 'WhatsApp',
        color: COLOR_PALETTE.whatsapp,
        value: 0,
        count: 0,
        reach: 0,
        conv: 0,
        views: 0,
      },
      reels: {
        id: 'reels',
        name: 'Reels & Vídeos (Retenção)',
        shortName: 'Reels',
        color: COLOR_PALETTE.reels,
        value: 0,
        count: 0,
        reach: 0,
        conv: 0,
        views: 0,
      },
      trafego: {
        id: 'trafego',
        name: 'Tráfego & Cliques no Link',
        shortName: 'Tráfego',
        color: COLOR_PALETTE.trafego,
        value: 0,
        count: 0,
        reach: 0,
        conv: 0,
        views: 0,
      },
      engajamento: {
        id: 'engajamento',
        name: 'Engajamento no Feed',
        shortName: 'Engajamento',
        color: COLOR_PALETTE.engajamento,
        value: 0,
        count: 0,
        reach: 0,
        conv: 0,
        views: 0,
      },
    };

    campaigns.forEach((c) => {
      const obj = (c.objective || '').trim();
      const effectiveVal = c.budget && c.budget > 0 ? c.budget : c.spent || 0;

      let key = 'alcance';
      if (obj === 'Alc') key = 'alcance';
      else if (
        obj === 'EngWhats' ||
        obj === 'TrafWhats' ||
        obj === 'ReelsEngWhats' ||
        obj === 'ReelsTrafWhats' ||
        (c.conv > 0 && !/^Reels/i.test(obj))
      ) {
        key = 'whatsapp';
      } else if (/^Reels/i.test(obj)) {
        key = 'reels';
      } else if (obj === 'TrafLink' || obj === 'EngLink') {
        key = 'trafego';
      } else if (obj === 'Eng') {
        key = 'engajamento';
      }

      groups[key].value += effectiveVal;
      groups[key].count += 1;
      groups[key].reach += c.reach || 0;
      groups[key].conv += c.conv || 0;
      groups[key].views += c.views || 0;
    });

    const list = Object.values(groups).filter((g) => g.count > 0);
    const grandTotal = list.reduce((acc, g) => acc + g.value, 0);

    return {
      total: grandTotal,
      items: list
        .map((g) => ({
          ...g,
          percent: grandTotal > 0 ? (g.value / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value),
    };
  }, [campaigns]);

  // SVG Donut Geometry
  const donutRadius = 80;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPct = 0;

  // 8 KPI cards matching on-screen layout
  const kpiBoxes = [
    {
      label: 'Valor Investido',
      value: fmtBRL(totalSpent),
      subtext: `Orçamento: ${fmtBRL(totalBudget)}`,
      icon: DollarSign,
      iconColor: 'text-amber-400',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
    {
      label: 'Alcance Total',
      value: fmtNum(totalReach),
      subtext: 'Contas únicas atingidas',
      icon: Users,
      iconColor: 'text-blue-400',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
    {
      label: 'Impressões Totais',
      value: fmtNum(totalImpr),
      subtext: `Frequência média: ${avgFrequency}`,
      icon: Eye,
      iconColor: 'text-purple-400',
      labelColor: 'text-neutral-400',
      valueColor: 'text-purple-300',
    },
    {
      label: 'Conversas WhatsApp',
      value: totalConv > 0 ? `${totalConv} conv.` : '—',
      subtext: `Custo por conversa: ${avgCostPerConv > 0 ? fmtBRL(avgCostPerConv) : '—'}`,
      icon: MessageCircle,
      iconColor: 'text-emerald-400',
      labelColor: 'text-emerald-400',
      valueColor: 'text-emerald-400',
    },
    {
      label: 'Visualizações Vídeo (ThruPlay)',
      value: totalViews > 0 ? fmtNum(totalViews) : '—',
      subtext: `Custo por view: ${avgCostPerView > 0 ? fmtBRL(avgCostPerView) : '—'}`,
      icon: Video,
      iconColor: 'text-purple-400',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
    {
      label: 'Cliques no Link',
      value: totalLinks > 0 ? fmtNum(totalLinks) : '—',
      subtext: `CTR Médio: ${avgCTR}%`,
      icon: MousePointerClick,
      iconColor: 'text-amber-400',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
    {
      label: 'Custo por 1.000 Contas',
      value: avgCPM > 0 ? fmtBRL(avgCPM) : '—',
      subtext: 'Eficiência geral de entrega',
      icon: TrendingUp,
      iconColor: 'text-neutral-300',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
    {
      label: 'Ações Veiculadas',
      value: String(campaigns.length),
      subtext: 'Campanhas ativas no mês',
      icon: Layers,
      iconColor: 'text-neutral-300',
      labelColor: 'text-neutral-400',
      valueColor: 'text-white',
    },
  ];

  let lastDateKey = '';

  return (
    <div className="bg-[#0b0c0e] text-[#e5e7eb] font-sans print-report-container w-full max-w-[1100px] mx-auto p-4 sm:p-6 space-y-6 rounded-2xl">
      {/* ======================================================================== */}
      {/* 1. EXECUTIVE BRAND HEADER + 8-METRIC GRID (IDENTICO A TELA) */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 shadow-xl print-avoid-break">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-neutral-800/80">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shrink-0">
              <div className="w-full h-full bg-[#121316] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter">
                {(meta.cliente || 'C').charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <span>Relatório Mensal</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400 font-mono normal-case tracking-normal">
                  {meta.mes} {meta.ano}
                </span>
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Relatório de {meta.cliente || 'Cliente'}
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Análise de Desempenho dos Anúncios e Campanhas Pagas • Base de dados oficial da Meta
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider">
              Relatório Mensal
            </span>
          </div>
        </div>

        {/* 8-Metric Grid (4x2) */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {kpiBoxes.map((box) => {
            const Icon = box.icon;
            return (
              <div
                key={box.label}
                className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-3.5"
              >
                <div className={`flex items-center justify-between gap-1.5 mb-1 ${box.labelColor}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                    {box.label}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${box.iconColor} shrink-0`} />
                </div>

                <div className={`text-xl font-black font-mono tabular-nums ${box.valueColor}`}>
                  {box.value}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1 truncate">
                  {box.subtext}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================================== */}
      {/* 2. DISTRIBUIÇÃO ESTRATÉGICA DE VERBA POR OBJETIVO (SVG DONUT + LISTA) */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] border border-[#2b2d33] rounded-2xl p-6 shadow-xl print-avoid-break">
        <div className="flex items-center justify-between gap-3 mb-5 pb-3.5 border-b border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
              <PieIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Visão Estratégica Executiva</span>
            </div>
            <h3 className="text-lg font-black text-white">
              Distribuição Estratégica de Verba por Objetivo
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Participação de cada pilar de marketing no montante total de{' '}
              <strong className="text-amber-400 font-mono">{fmtBRL(chartData.total)}</strong>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-300">
            Macro-Pilares • Orçamento
          </span>
        </div>

        <div className="grid grid-cols-12 gap-5 items-center">
          {/* Vector SVG Donut Chart */}
          <div className="col-span-5 flex items-center justify-center">
            <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              <svg viewBox="0 0 220 220" className="w-full h-full">
                <circle
                  cx="110"
                  cy="110"
                  r={donutRadius}
                  fill="none"
                  stroke="#1f2128"
                  strokeWidth="28"
                />
                {chartData.items.map((item) => {
                  const pct = item.percent;
                  const gap = chartData.items.length > 1 ? 3.5 : 0;
                  const sliceLen = Math.max(0, (pct / 100) * donutCircumference - gap);
                  const dashOffset = -(accumulatedPct / 100) * donutCircumference;
                  accumulatedPct += pct;

                  return (
                    <circle
                      key={item.id}
                      cx="110"
                      cy="110"
                      r={donutRadius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="28"
                      strokeDasharray={`${sliceLen} ${donutCircumference - sliceLen}`}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 110 110)"
                    />
                  );
                })}
              </svg>

              {/* Center Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Orçamento Total
                </span>
                <span className="text-base font-black text-white font-mono mt-0.5">
                  {fmtBRL(chartData.total)}
                </span>
                <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full mt-1 border border-amber-500/20">
                  {campaigns.length} ações veiculadas
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="col-span-7 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 pb-1 border-b border-neutral-800">
              <span>Objetivo / Pilar</span>
              <div className="flex items-center gap-5">
                <span className="w-20 text-right">Ações</span>
                <span className="w-24 text-right">Valor</span>
                <span className="w-12 text-right">Share</span>
              </div>
            </div>

            {chartData.items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border bg-neutral-900/60 border-neutral-800/70 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{item.name}</span>
                      {item.percent >= 30 && (
                        <span className="text-[8.5px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-extrabold uppercase shrink-0">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="text-[9.5px] text-neutral-400 mt-0.5 truncate">
                      {item.reach > 0 && `${fmtNum(item.reach)} alcance`}
                      {item.conv > 0 && ` • ${item.conv} conversas`}
                      {item.views > 0 && ` • ${fmtNum(item.views)} views`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0 font-mono text-[11px]">
                  <span className="w-20 text-right text-neutral-400 text-[10px]">
                    {item.count} {item.count === 1 ? 'campanha' : 'campanhas'}
                  </span>
                  <span className="w-24 text-right font-bold text-white">
                    {fmtBRL(item.value)}
                  </span>
                  <span className="w-12 text-right font-black text-amber-400 text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            {chartData.items.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[10.5px] text-neutral-300 flex items-start gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="text-white">Leitura Executiva do Orçamento: </strong>
                  O maior investimento do ciclo foi alocado em{' '}
                  <span className="font-bold text-amber-300">{chartData.items[0].name}</span> com{' '}
                  <span className="font-mono text-white font-semibold">
                    {fmtBRL(chartData.items[0].value)} ({chartData.items[0].percent.toFixed(1)}%)
                  </span>
                  {chartData.items.length > 1 && (
                    <>
                      , seguido por{' '}
                      <span className="text-white font-medium">{chartData.items[1].name}</span> com{' '}
                      {chartData.items[1].percent.toFixed(1)}%
                    </>
                  )}
                  .
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* 3. ANÚNCIOS E CAMPANHAS EM DESTAQUE (CARDS GRID) */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b border-neutral-800 print-avoid-break">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                Performance Individual
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">
              Anúncios e Campanhas em Destaque
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Métricas detalhadas, custos unitários e formatos de cada anúncio pago
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-400">
            {campaigns.length} Ações Veiculadas
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {campaigns.map((c, index) => {
            const isTopConv = c.conv > 0 && c.conv >= maxConv;
            const isTopReach = c.reach > 0 && c.reach >= maxReach;
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
                className="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl print-avoid-break"
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass}`}
                      >
                        {badge}
                      </span>
                      <span className="text-[9.5px] text-neutral-400 font-medium">
                        Formato: <strong className="text-neutral-200">{c.format || 'Anúncio'}</strong>
                      </span>
                      {isTopConv && (
                        <span className="text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                          ★ Campeão Conversões
                        </span>
                      )}
                      {isTopReach && (
                        <span className="text-[8.5px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded">
                          ★ Maior Alcance
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-extrabold text-white leading-snug">
                      {c.displayName || c.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Período de Veiculação: <span className="text-neutral-300">{c.validity || 'Mês vigente'}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="text-xs font-black text-white block">{fmtBRL(c.spent)}</span>
                    <span className="text-[9.5px] text-neutral-500 block">
                      Orçado: {fmtBRL(c.budget)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-neutral-800 text-[10px] font-mono tabular-nums">
                  <div className="bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[8.5px] uppercase font-bold">
                      {primaryResultLabel}
                    </span>
                    <span className="text-amber-400 font-extrabold block truncate mt-0.5">
                      {primaryResultVal}
                    </span>
                  </div>
                  <div className="bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[8.5px] uppercase font-bold">
                      ALCANCE ÚNICO
                    </span>
                    <span className="text-neutral-200 font-bold block truncate mt-0.5">
                      {fmtNum(c.reach)} contas
                    </span>
                  </div>
                  <div className="bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/80 text-right">
                    <span className="text-neutral-500 block text-[8.5px] uppercase font-bold">
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
      {/* 4. BASE DE AUDIÊNCIA SOCIAL */}
      {/* ======================================================================== */}
      {showSocial && (
        <div className="print-avoid-break">
          <SocialAudienceSection capa={capa} />
        </div>
      )}

      {/* ======================================================================== */}
      {/* 5. PLANILHA DE CUSTOS (MATRIZ OFICIAL DE 17 COLUNAS - IDENTICA A TELA) */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] rounded-2xl border border-[#2b2d33] shadow-xl overflow-hidden print-page-break">
        <div className="p-4 bg-gradient-to-r from-[#181a20] via-[#1c1e26] to-[#181a20] border-b border-[#2b2d33] flex items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-1">
              Planilha de Custos · 17 Colunas Oficiais Meta Ads
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              Ações Mensais do Período{' '}
              <span className="text-xs font-normal text-neutral-400">
                ({meta.mes} {meta.ano})
              </span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {campaigns.length} ações consolidadas
          </span>
        </div>

        {/* Barra Laranja Oficial */}
        <div
          className="text-white py-2 px-4 text-center font-black text-xs uppercase tracking-wider"
          style={{ backgroundColor: '#FF9900' }}
        >
          AÇÕES MENSAIS • MATRIZ OFICIAL DE IMPULSIONAMENTO
        </div>

        <table className="w-full table-fixed border-collapse text-[8px] font-sans">
          <thead className="bg-[#1a1c22] border-b-2 border-neutral-700">
            <tr className="text-neutral-300 font-bold uppercase tracking-tight text-[7.2px]">
              <th className="py-2 px-1.5 border-r border-[#2b2d33] text-left w-[15%]">1. Nome da Ação</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-center w-[5%]">2. Form.</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-center w-[6%]">3. Valid.</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-amber-950/20 text-amber-300 w-[5.5%]">4. Invest.</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-amber-950/30 text-amber-300 w-[5.5%]">5. Gasto</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-blue-950/20 text-blue-300 w-[5%]">6. Alcance</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right w-[4.8%]">7. Engaj.</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right w-[4.8%]">8. Links</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-purple-950/20 text-purple-300 w-[5%]">9. ThruPlay</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-blue-950/20 text-blue-300 w-[5.2%]">10. CPM</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right w-[5%]">11. CPC</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-purple-950/20 text-purple-300 w-[5.2%]">12. C/Thru</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right w-[5%]">13. C/Int</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-right bg-emerald-950/20 text-emerald-300 w-[5.4%]">14. C/Conv</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-center w-[6.5%]">15. Filtro</th>
              <th className="py-2 px-1 border-r border-[#2b2d33] text-center w-[6%]">16. Cidade</th>
              <th className="py-2 px-1 text-right bg-emerald-950/40 text-emerald-300 w-[5.1%]">17. Conv.</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#23252b]">
            {campaigns.map((r, idx) => {
              const o = r.objective;
              const isReels = /^Reels/i.test(o);
              const isAlcanceOnly = o === 'Alc';
              const curDate = extractDateFromName(r.name) || (r.sortDate ? new Date(r.sortDate) : null);
              const curDateKey = curDate ? curDate.getTime() : 'none';
              const showSeparator = idx > 0 && curDateKey !== lastDateKey;
              lastDateKey = String(curDateKey);

              const colReach = fmtNum(r.reach);
              const isDuplicateReach = r.reach > 0 && r.eng === r.reach;
              const colEng =
                isAlcanceOnly || isDuplicateReach
                  ? '—'
                  : o === 'Eng' ||
                    o === 'EngLink' ||
                    o === 'TrafLink' ||
                    o === 'ReelsEng' ||
                    o === 'ReelsEngLink' ||
                    o === 'ReelsTrafLink' ||
                    o === 'ReelsEngWhats' ||
                    o === 'ReelsTrafWhats' ||
                    r.eng > 0
                  ? fmtNum(r.eng)
                  : '—';

              const colLinks =
                o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.links > 0
                  ? fmtNum(r.links)
                  : '—';

              const colViews = (isReels || r.views > 0) && r.views > 0 ? fmtNum(r.views) : '—';
              const colCPM = o === 'Alc' && r.cpm > 0 ? fmtBRL(r.cpm) : '—';
              const colCPC =
                (o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.links > 0) &&
                r.cpc > 0
                  ? fmtBRL(r.cpc)
                  : '—';
              const colThru =
                (o === 'ReelsAlc' || o === 'ReelsEng' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.views > 0) &&
                r.cThru > 0
                  ? fmtBRL(r.cThru)
                  : '—';
              const colCInt =
                (o === 'Eng' || o === 'ReelsEng' || (!isAlcanceOnly && !isDuplicateReach && r.eng > 0)) && r.cInt > 0
                  ? fmtBRL(r.cInt)
                  : '—';
              const colCConv =
                (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats' || r.conv > 0) &&
                r.cConv > 0
                  ? fmtBRL(r.cConv)
                  : '—';
              const colConv =
                (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats' || r.conv > 0) &&
                r.conv > 0
                  ? fmtNum(r.conv)
                  : '—';

              return (
                <React.Fragment key={r.id}>
                  {showSeparator && (
                    <tr className="bg-[#101114] border-y border-[#2b2d33] h-1.5">
                      <td colSpan={17} className="h-1.5 p-0" />
                    </tr>
                  )}
                  <tr className="print-avoid-break">
                    <td className="py-1.5 px-1.5 border-r border-[#23252b] text-left font-medium text-white break-words leading-tight">
                      {r.displayName || r.name}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-center text-neutral-300 break-words">
                      {r.format}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-center text-neutral-400 font-mono">
                      {r.validity || '—'}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-neutral-300">
                      {fmtBRL(r.budget)}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono font-bold text-amber-400 bg-amber-950/10">
                      {fmtBRL(r.spent)}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-blue-300 font-semibold bg-blue-950/10">
                      {colReach}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-neutral-300">
                      {colEng}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-neutral-300">
                      {colLinks}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-purple-300 font-semibold bg-purple-950/10">
                      {colViews}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-blue-300 bg-blue-950/10">
                      {colCPM}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-neutral-300">
                      {colCPC}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-purple-300 bg-purple-950/10">
                      {colThru}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-neutral-300">
                      {colCInt}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-right font-mono text-emerald-300 bg-emerald-950/10">
                      {colCConv}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-center text-neutral-200 break-words leading-tight">
                      {r.filtro || '—'}
                    </td>
                    <td className="py-1.5 px-1 border-r border-[#23252b] text-center text-neutral-200 break-words leading-tight">
                      {r.cidade || '—'}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-bold text-emerald-400 bg-emerald-950/20">
                      {colConv !== '—' ? `${colConv}` : '—'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>

          <tfoot className="bg-[#16171d] border-t-2 border-amber-500 font-mono text-[8px]">
            <tr className="text-white font-bold print-avoid-break">
              <td colSpan={3} className="py-2 px-1.5 border-r border-[#2b2d33] text-left uppercase font-sans tracking-wide">
                Total ({campaigns.length} ações)
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-neutral-300">
                {fmtBRL(totalBudget)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right font-black text-amber-300 bg-amber-950/30">
                {fmtBRL(totalSpent)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right font-black text-blue-300 bg-blue-950/30">
                {fmtNum(totalReach)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-neutral-300">
                {fmtNum(totalInt)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-neutral-300">
                {fmtNum(totalLinks)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right font-black text-purple-300 bg-purple-950/30">
                {fmtNum(totalViews)}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-blue-300">
                {totalReach > 0 ? fmtBRL((totalSpent / totalReach) * 1000) : '—'}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-neutral-300">
                {totalLinks > 0 ? fmtBRL(totalSpent / totalLinks) : '—'}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-purple-300">
                {totalViews > 0 ? fmtBRL(totalSpent / totalViews) : '—'}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-neutral-300">
                {totalInt > 0 ? fmtBRL(totalSpent / totalInt) : '—'}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-right text-emerald-300">
                {totalConv > 0 ? fmtBRL(totalSpent / totalConv) : '—'}
              </td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td className="py-2 px-1 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td className="py-2 px-1 text-right font-black text-emerald-400 bg-emerald-950/40">
                {totalConv > 0 ? `${totalConv}` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ======================================================================== */}
      {/* 6. DICIONÁRIO COMPLETO DAS 17 COLUNAS DA PLANILHA */}
      {/* ======================================================================== */}
      <div className="bg-[#141518] rounded-2xl border border-[#2b2d33] p-5 shadow-xl space-y-4 print-page-break">
        <div className="border-b border-[#2b2d33] pb-3 print-avoid-break">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400">
              Glossário Técnico & Executivo
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
            O que cada uma das 17 colunas significa e por que é importante?
          </h3>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Consulte abaixo a descrição didática de cada coluna da planilha, por que ela é indispensável para o cliente e como analisar seus números com precisão.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {COLUMNS_17_GUIDE.map((col) => (
            <div
              key={col.num}
              className="rounded-xl border border-[#2b2d33] bg-[#181a20] p-3 flex flex-col justify-between space-y-2 print-avoid-break"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-neutral-800 border border-neutral-700 font-mono text-[10px] font-black text-amber-400 flex items-center justify-center shrink-0">
                      {col.num}
                    </span>
                    <h4 className="font-bold text-xs text-white truncate">{col.name}</h4>
                  </div>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${col.stageColor}`}>
                    {col.badge}
                  </span>
                </div>

                <div className="text-[10.5px] text-neutral-300 leading-snug">
                  <span className="text-neutral-400 block text-[9px] uppercase font-bold tracking-wider">
                    O que significa:
                  </span>
                  <p>{col.meaning}</p>
                </div>

                <div className="text-[10px] text-neutral-300 leading-snug bg-[#121317] p-2 rounded-lg border border-[#22242a]">
                  <span className="text-amber-400/90 block text-[9px] uppercase font-bold tracking-wider">
                    Por que é importante:
                  </span>
                  <p>{col.importance}</p>
                </div>

                {col.formula && (
                  <div className="text-[9.5px] text-neutral-400 flex items-center gap-1 font-mono bg-black/30 px-2 py-0.5 rounded border border-neutral-800">
                    <span className="text-neutral-500">Cálculo:</span>
                    <strong className="text-neutral-200">{col.formula}</strong>
                  </div>
                )}
              </div>

              <div className="pt-1.5 border-t border-[#23252b] text-[9.5px] text-neutral-400 flex items-start gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="italic leading-snug">{col.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
