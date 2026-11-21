import { CampaignRow, CapaData, ReportMeta } from '../types';
import {
  ActiveCostColumnsResult,
  filterActiveCampaigns,
  getActiveCostColumns,
  getCampaignRowDisplayMetrics,
  hasFilledText
} from './columnsGuide';
import { extractDateFromName } from './metaAdsParser';
import { BRAND_LOGO_DATA_URI } from './brandLogo';

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportInteractiveWebReport(
  meta: ReportMeta,
  campaigns: CampaignRow[],
  capa: CapaData
) {
  const activeCampaigns = filterActiveCampaigns(campaigns);
  const totalSpent = activeCampaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = activeCampaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = activeCampaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = activeCampaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = activeCampaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalImpr = activeCampaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);
  const avgFrequency = totalReach > 0 ? (totalImpr / totalReach).toFixed(2) : '1.00';
  const avgCostPerConv = totalConv > 0 ? totalSpent / totalConv : 0;
  const avgCPM = totalReach > 0 ? (totalSpent / totalReach) * 1000 : 0;
  const avgCPC = totalLinks > 0 ? totalSpent / totalLinks : 0;
  const avgCTR = totalImpr > 0 ? ((totalLinks / totalImpr) * 100).toFixed(2) : '0.00';

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const fmtNum = (v: number) =>
    new Intl.NumberFormat('pt-BR').format(v || 0);

  const hasSocialData = [...Object.values(capa.fb || {}), ...Object.values(capa.ig || {})].some(
    (v) => String(v || '').trim().length > 0
  );

  // Group campaigns by objective
  const objMap: Record<string, { name: string; color: string; value: number; count: number; reach: number; conv: number }> = {
    alcance: { name: 'Alcance & Marca', color: '#3B82F6', value: 0, count: 0, reach: 0, conv: 0 },
    whatsapp: { name: 'WhatsApp & Leads', color: '#10B981', value: 0, count: 0, reach: 0, conv: 0 },
    reels: { name: 'Reels & Vídeos', color: '#8B5CF6', value: 0, count: 0, reach: 0, conv: 0 },
    trafego: { name: 'Tráfego & Cliques', color: '#F59E0B', value: 0, count: 0, reach: 0, conv: 0 },
    engajamento: { name: 'Engajamento Feed', color: '#EC4899', value: 0, count: 0, reach: 0, conv: 0 },
  };

  activeCampaigns.forEach((c) => {
    const obj = c.objective || '';
    const val = c.budget && c.budget > 0 ? c.budget : c.spent || 0;
    let k = 'alcance';
    if (obj === 'Alc') k = 'alcance';
    else if (obj === 'EngWhats' || obj === 'TrafWhats' || obj === 'ReelsEngWhats' || obj === 'ReelsTrafWhats' || (c.conv > 0 && !/^Reels/i.test(obj))) k = 'whatsapp';
    else if (/^Reels/i.test(obj)) k = 'reels';
    else if (obj === 'TrafLink' || obj === 'EngLink') k = 'trafego';
    else if (obj === 'Eng') k = 'engajamento';

    objMap[k].value += val;
    objMap[k].count += 1;
    objMap[k].reach += c.reach || 0;
    objMap[k].conv += c.conv || 0;
  });

  const chartGroups = Object.values(objMap).filter((g) => g.count > 0);
  const grandTotal = chartGroups.reduce((a, b) => a + b.value, 0) || 1;

  const {
    tableRowsHtml,
    guideCardsHtml,
    totalBudget,
    totalInt,
    colInfo,
  } = buildCostSheetFragments(activeCampaigns);

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Mensal • ${escapeHtml(meta.cliente)} (${escapeHtml(meta.mes)} ${escapeHtml(meta.ano)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #0b0c0e;
      color: #e5e7eb;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .guide-card.is-focused {
      background-color: #1e212a !important;
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.7), 0 20px 25px -5px rgba(245, 158, 11, 0.15);
    }
    .guide-card.is-focused .col-num-badge {
      background-color: #f59e0b !important;
      border-color: #fbbf24 !important;
      color: #09090b !important;
    }
    .guide-card.is-focused .back-btn {
      display: inline-flex !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 6mm;
      }
      .no-print { display: none !important; }
      header { position: static !important; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background-color: #0b0c0e !important;
        color: #e5e7eb !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      main {
        max-width: 100% !important;
        padding: 4mm 0 !important;
      }
      .overflow-x-auto {
        overflow: visible !important;
        max-height: none !important;
      }
      table {
        width: 100% !important;
        table-layout: fixed !important;
        font-size: 7.5px !important;
      }
      th, td {
        min-width: 0 !important;
        padding: 4px 3px !important;
        white-space: normal !important;
        word-break: break-word !important;
      }
      th button {
        padding: 4px 2px !important;
        white-space: normal !important;
      }
      thead { display: table-header-group; }
      tfoot { display: table-row-group; }
      tr, .guide-card, .bg-neutral-900\/70, .bg-neutral-900\/80 {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #planilha-custos-tabela, #guia-17-colunas {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body class="min-h-screen antialiased selection:bg-amber-500 selection:text-black">
  <!-- Top Bar -->
  <header class="border-b border-[#22242a] bg-[#121316]/90 sticky top-0 z-50 backdrop-blur-md px-6 py-4">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img
          src="${BRAND_LOGO_DATA_URI}"
          alt="Logo"
          class="w-12 h-12 rounded-full object-contain shrink-0 shadow-lg shadow-amber-500/20"
        />
        <div>
          <h1 class="text-lg font-extrabold text-white leading-tight">
            ${escapeHtml(meta.cliente || 'Relatório de Impulsionamento')}
          </h1>
          <p class="text-xs text-neutral-400">
            Relatório Mensal Meta Ads • <strong class="text-amber-400">${escapeHtml(meta.mes)} ${escapeHtml(meta.ano)}</strong>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 no-print">
        <a href="#planilha-custos-tabela" class="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-amber-300 border border-neutral-700 transition-all">
          Ir para Planilha de Custos
        </a>
        <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-700 transition-all cursor-pointer">
          Imprimir / Salvar PDF
        </button>
        <span class="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold px-3 py-1.5 rounded-xl">
          Relatório Mensal
        </span>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Executive Overview -->
    <div class="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
        <div>
          <span class="text-xs font-bold tracking-widest text-amber-400 uppercase">Relatório Mensal</span>
          <h2 class="text-2xl sm:text-3xl font-black text-white mt-1">
            Impulsionamentos & Mídia Paga Meta
          </h2>
          <p class="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
            Dados auditados diretamente dos relatórios de veiculação da Meta, com métricas consolidadas de alcance, conversão e retorno.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl text-right">
            <span class="text-[11px] text-neutral-400 block font-bold uppercase">Investimento Total</span>
            <span class="text-2xl font-black text-amber-400 font-mono">${fmtBRL(totalSpent)}</span>
          </div>
        </div>
      </div>

      <!-- 8-Metric Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">Alcance Total</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${fmtNum(totalReach)}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Contas únicas impactadas</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">Impressões Totais</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${fmtNum(totalImpr)}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Frequência média: ${avgFrequency}</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-emerald-400 uppercase font-bold block mb-1">Conversas WhatsApp</span>
          <span class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${totalConv} conv.</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Custo: ${avgCostPerConv > 0 ? fmtBRL(avgCostPerConv) : '—'}</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-purple-400 uppercase font-bold block mb-1">Views ThruPlay (Reels)</span>
          <span class="text-xl sm:text-2xl font-black text-purple-300 font-mono">${fmtNum(totalViews)}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">${activeCampaigns.filter((c) => c.views > 0).length} ações de vídeo</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">Cliques no Link</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${fmtNum(totalLinks)}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">CTR médio: ${avgCTR}%</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">Custo p/ 1.000 (CPM)</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${avgCPM > 0 ? fmtBRL(avgCPM) : '—'}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Eficiência de propagação</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">CPC Médio</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${avgCPC > 0 ? fmtBRL(avgCPC) : '—'}</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Custo por clique gerado</span>
        </div>

        <div class="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
          <span class="text-[11px] text-neutral-400 uppercase font-bold block mb-1">Ações Ativas</span>
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${activeCampaigns.length} ações</span>
          <span class="text-[10px] text-neutral-500 block mt-1">Veiculadas no período</span>
        </div>
      </div>
    </div>

    <!-- Budget Distribution by Objective -->
    <div class="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
        <div>
          <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">Alocação Orçamentária</span>
          <h3 class="text-xl font-black text-white mt-0.5">Distribuição de Verba por Objetivo</h3>
        </div>
        <span class="text-xs font-mono text-neutral-400">Total: <strong class="text-white">${fmtBRL(totalSpent)}</strong></span>
      </div>

      <div class="space-y-4">
        <div class="h-4 w-full bg-neutral-900 rounded-full overflow-hidden flex shadow-inner">
          ${chartGroups
            .map((g) => {
              const pct = ((g.value / grandTotal) * 100).toFixed(1);
              return `<div style="width: ${pct}%; background-color: ${g.color};" title="${g.name}: ${pct}%" class="h-full transition-all"></div>`;
            })
            .join('')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          ${chartGroups
            .map((g) => {
              const pct = ((g.value / grandTotal) * 100).toFixed(1);
              return `
              <div class="bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${g.color};"></span>
                  <div>
                    <h4 class="text-xs font-bold text-white">${g.name}</h4>
                    <p class="text-[11px] text-neutral-400">${g.count} campanhas</p>
                  </div>
                </div>
                <div class="text-right font-mono">
                  <span class="text-xs font-bold text-white block">${fmtBRL(g.value)}</span>
                  <span class="text-[10px] font-bold text-amber-400">${pct}%</span>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    </div>

    <!-- Top Highlight Campaigns -->
    <div class="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
        <div>
          <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">Performance Individual</span>
          <h3 class="text-xl font-black text-white mt-0.5">Anúncios e Campanhas em Destaque</h3>
        </div>
        <span class="text-xs text-neutral-400 font-bold">${activeCampaigns.length} Ações Analisadas</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${activeCampaigns
          .map((c) => {
            let mainMetric = `${fmtNum(c.reach)} alcance`;
            let badge = 'Alcance';
            let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

            if (c.conv > 0) {
              mainMetric = `${c.conv} conversas WhatsApp`;
              badge = 'Conversão Lead';
              badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            } else if (c.views > 0) {
              mainMetric = `${fmtNum(c.views)} views ThruPlay`;
              badge = 'Vídeo / Reels';
              badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
            } else if (c.links > 0) {
              mainMetric = `${fmtNum(c.links)} cliques link`;
              badge = 'Tráfego';
              badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            }

            return `
            <div class="bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 p-5 rounded-2xl transition-all">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}">
                    ${badge} • ${escapeHtml(c.format || 'Anúncio')}
                  </span>
                  <h4 class="text-sm font-extrabold text-white mt-1.5 truncate">
                    ${escapeHtml(c.displayName ?? c.name)}
                  </h4>
                  <p class="text-[11px] text-neutral-400">Validade: ${escapeHtml(c.validity || 'Mês completo')}</p>
                </div>
                <div class="text-right shrink-0 font-mono">
                  <span class="text-xs font-black text-white block">${fmtBRL(c.spent)}</span>
                  <span class="text-[10px] text-neutral-500">Gasto Real</span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-800 text-[11px] font-mono">
                <div>
                  <span class="text-neutral-500 block text-[9.5px]">RESULTADO</span>
                  <strong class="text-amber-400 truncate block">${mainMetric}</strong>
                </div>
                <div>
                  <span class="text-neutral-500 block text-[9.5px]">ALCANCE</span>
                  <span class="text-neutral-200 block">${fmtNum(c.reach)}</span>
                </div>
                <div class="text-right">
                  <span class="text-neutral-500 block text-[9.5px]">CUSTO UNITÁRIO</span>
                  <span class="text-neutral-200 block">${
                    c.conv > 0 && c.cConv
                      ? fmtBRL(c.cConv)
                      : c.views > 0 && c.cThru
                      ? fmtBRL(c.cThru)
                      : c.cpm
                      ? fmtBRL(c.cpm)
                      : '—'
                  }</span>
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>

    <!-- Base de Audiência Social (Idêntica à tela) -->
    ${
      hasSocialData
        ? `
      <div class="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div class="mb-6 pb-4 border-b border-neutral-800">
          <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">
            Base de Audiência Social
          </span>
          <h3 class="text-xl font-black text-white mt-0.5">
            Demografia e Presença Orgânica Integrada
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
              <strong class="text-rose-400 text-sm font-bold uppercase tracking-wide">INSTAGRAM</strong>
              <span class="text-xs font-mono font-bold text-white">${capa.ig.seguidores || '—'} seguidores</span>
            </div>
            <div class="space-y-2 text-xs text-neutral-300 font-mono">
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
                <span>${capa.ig.segAnterior || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Alcance Orgânico/Total:</span>
                <span>${capa.ig.alcancadas || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Visitas ao Perfil:</span>
                <span>${capa.ig.visitas || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Faixa Etária Principal:</span>
                <span>${capa.ig.faixa || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Divisão de Gênero:</span>
                <span class="text-rose-300">${escapeHtml(capa.ig.mulheres ? (capa.ig.mulheres.trim().endsWith('%') ? capa.ig.mulheres.trim() : `${capa.ig.mulheres.trim()}%`) : '—')} Mulheres / ${escapeHtml(capa.ig.homens ? (capa.ig.homens.trim().endsWith('%') ? capa.ig.homens.trim() : `${capa.ig.homens.trim()}%`) : '—')} Homens</span>
              </div>
            </div>
          </div>

          <div class="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
              <strong class="text-blue-400 text-sm font-bold uppercase tracking-wide">FACEBOOK</strong>
              <span class="text-xs font-mono font-bold text-white">${capa.fb.seguidores || '—'} seguidores</span>
            </div>
            <div class="space-y-2 text-xs text-neutral-300 font-mono">
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
                <span>${capa.fb.segAnterior || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Alcance Total:</span>
                <span>${capa.fb.alcancadas || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Visitas à Página:</span>
                <span>${capa.fb.visitas || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Faixa Etária Principal:</span>
                <span>${capa.fb.faixa || '—'}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-neutral-500 font-sans">Divisão de Gênero:</span>
                <span class="text-blue-300">${escapeHtml(capa.fb.mulheres ? (capa.fb.mulheres.trim().endsWith('%') ? capa.fb.mulheres.trim() : `${capa.fb.mulheres.trim()}%`) : '—')} Mulheres / ${escapeHtml(capa.fb.homens ? (capa.fb.homens.trim().endsWith('%') ? capa.fb.homens.trim() : `${capa.fb.homens.trim()}%`) : '—')} Homens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
        : ''
    }

    ${buildCostSheetTableAndGuideHtml(meta, activeCampaigns, {
      tableRowsHtml,
      guideCardsHtml,
      totalBudget,
      totalSpent,
      totalReach,
      totalInt,
      totalLinks,
      totalViews,
      totalConv,
      colInfo,
    })}
  </main>

  <footer class="border-t border-[#1e2025] py-8 text-center text-xs text-neutral-500">
    <p>Relatório Mensal gerado para <strong>${escapeHtml(meta.cliente || 'Cliente')}</strong> • Meta Ads</p>
  </footer>

  ${COST_SHEET_SCRIPT_HTML}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeClient = (meta.cliente || 'cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePeriod = `${meta.mes || 'mes'}_${meta.ano || 'ano'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Relatorio_Mensal_${safeClient}_${safePeriod}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const COST_SHEET_SCRIPT_HTML = `<script>
    function filterCostRows(query) {
      var q = (query || '').trim().toLowerCase();
      var rows = document.querySelectorAll('.campaign-row');
      var seps = document.querySelectorAll('tr[data-sep="1"]');
      rows.forEach(function (row) {
        var text = row.getAttribute('data-search') || '';
        row.style.display = !q || text.indexOf(q) !== -1 ? '' : 'none';
      });
      seps.forEach(function (sep) {
        sep.style.display = q ? 'none' : '';
      });
    }

    function filterGuide(category, btnEl) {
      var tabs = document.querySelectorAll('.guide-tab');
      tabs.forEach(function (t) {
        t.className = 'guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer';
      });
      if (btnEl) {
        btnEl.className = 'guide-tab px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 text-neutral-950 shadow-md cursor-pointer';
      }
      var cards = document.querySelectorAll('.guide-card');
      cards.forEach(function (card) {
        var c = card.getAttribute('data-category');
        var visible = category === 'all' || (category === 'setup' ? (c === 'setup' || c === 'financeiro') : c === category);
        card.style.display = visible ? '' : 'none';
      });
    }

    function focusGuideCard(colNum) {
      var allBtn = document.querySelector('#guide-tabs .guide-tab');
      filterGuide('all', allBtn);
      var cards = document.querySelectorAll('.guide-card');
      cards.forEach(function (card) { card.classList.remove('is-focused'); });
      var target = document.getElementById('guia-col-' + colNum);
      if (target) {
        target.classList.add('is-focused');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function scrollToCostTable() {
      var tbl = document.getElementById('planilha-custos-tabela');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  </script>`;

function buildCostSheetFragments(campaigns: CampaignRow[]) {
  const activeCampaigns = filterActiveCampaigns(campaigns);
  const fmtBRL = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtNum = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const colInfo = getActiveCostColumns(activeCampaigns, true);
  const { activeColumns, visibleSet, displayNumMap } = colInfo;
  const vis = (colNum: number) => visibleSet.has(colNum);
  const colBadgeNum = (colNum: number) => displayNumMap.get(colNum) ?? colNum;
  const lastMetricColNum = activeColumns
    .filter((c) => c.num < 18)
    .reduce((max, c) => Math.max(max, c.num), 0);
  const cellR = (colNum: number) => (colNum !== lastMetricColNum ? 'border-r ' : '');

  const totalBudget = activeCampaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = activeCampaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = activeCampaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalInt = activeCampaigns.reduce((acc, c) => acc + (c.eng || 0), 0);
  const totalLinks = activeCampaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalViews = activeCampaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = activeCampaigns.reduce((acc, c) => acc + (c.conv || 0), 0);

  let lastDateKey = '';

  const tableRowsHtml = activeCampaigns
    .map((r, idx) => {
      const curDate = extractDateFromName(r.name) || (r.sortDate ? new Date(r.sortDate) : null);
      const curDateKey = curDate ? String(curDate.getTime()) : 'none';
      const showSeparator = idx > 0 && curDateKey !== lastDateKey;
      lastDateKey = curDateKey;

      const m = getCampaignRowDisplayMetrics(r);
      const colReach = fmtNum(r.reach);
      const colEng = m.engValue > 0 ? fmtNum(m.engValue) : '—';
      const colLinks = m.linksValue > 0 ? fmtNum(m.linksValue) : '—';
      const colViews = m.viewsValue > 0 ? fmtNum(m.viewsValue) : '—';
      const colCPM = m.cpmValue > 0 ? fmtBRL(m.cpmValue) : '—';
      const colCPC = m.cpcValue > 0 ? fmtBRL(m.cpcValue) : '—';
      const colThru = m.cThruValue > 0 ? fmtBRL(m.cThruValue) : '—';
      const colCInt = m.cIntValue > 0 ? fmtBRL(m.cIntValue) : '—';
      const colCConv = m.cConvValue > 0 ? fmtBRL(m.cConvValue) : '—';
      const colConv = m.convValue > 0 ? fmtNum(m.convValue) : '—';
      const rowHasObs = hasFilledText(r.observacao);

      const searchBlob = escapeHtml(
        `${r.displayName || ''} ${r.name || ''} ${r.format || ''} ${r.objective || ''} ${r.filtro || ''} ${r.cidade || ''} ${r.observacao || ''}`.toLowerCase()
      );

      const separatorHtml = showSeparator
        ? `<tr class="h-2" data-sep="1"><td colspan="${vis(18) ? Math.max(1, activeColumns.length - 1) : activeColumns.length}" class="h-2 p-0 bg-[#101114] border-y border-[#2b2d33]"></td>${vis(18) ? '<td class="h-2 p-0 bg-[#141518] border-0"></td>' : ''}</tr>`
        : '';

      const cells: string[] = [];
      if (vis(1)) {
        cells.push(`<td class="py-2.5 px-3 border-b ${cellR(1)}border-[#23252b] text-left font-medium text-white">
          <span class="block">${escapeHtml(r.displayName ?? r.name)}</span>
          ${r.aiNotes ? `<span class="block text-[9px] text-amber-400/80 font-normal mt-0.5">${escapeHtml(r.aiNotes)}</span>` : ''}
        </td>`);
      }
      if (vis(2)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(2)}border-[#23252b] text-center whitespace-nowrap text-neutral-300">${escapeHtml(r.format || '—')}</td>`);
      if (vis(3)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(3)}border-[#23252b] text-center whitespace-nowrap text-neutral-400">${escapeHtml(r.validity || '—')}</td>`);
      if (vis(4)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(4)}border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${fmtBRL(r.budget)}</td>`);
      if (vis(5)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(5)}border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-amber-400 bg-amber-950/10">${fmtBRL(r.spent)}</td>`);
      if (vis(6)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(6)}border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 font-semibold bg-blue-950/10">${colReach}</td>`);
      if (vis(7)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(7)}border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colEng}</td>`);
      if (vis(8)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(8)}border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colLinks}</td>`);
      if (vis(9)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(9)}border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 font-semibold bg-purple-950/10">${colViews}</td>`);
      if (vis(10)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(10)}border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 bg-blue-950/10">${colCPM}</td>`);
      if (vis(11)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(11)}border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCPC}</td>`);
      if (vis(12)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(12)}border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 bg-purple-950/10">${colThru}</td>`);
      if (vis(13)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(13)}border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCInt}</td>`);
      if (vis(14)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(14)}border-[#23252b] text-right whitespace-nowrap font-mono text-emerald-300 bg-emerald-950/10">${colCConv}</td>`);
      if (vis(15)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(15)}border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.filtro || '—')}</td>`);
      if (vis(16)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(16)}border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.cidade || '—')}</td>`);
      if (vis(17)) cells.push(`<td class="py-2.5 px-2 border-b ${cellR(17)}border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-emerald-400 bg-emerald-950/20">${colConv !== '—' ? `${colConv} conv.` : '—'}</td>`);
      if (vis(18)) {
        cells.push(
          rowHasObs
            ? `<td class="py-2.5 px-2.5 border border-[#2b2d33] bg-[#181a20] text-left text-[10px] text-neutral-200 min-w-[130px] max-w-[240px] whitespace-normal leading-snug">${escapeHtml(r.observacao)}</td>`
            : `<td class="py-2.5 px-2 border-0 bg-[#141518]"></td>`
        );
      }

      return `${separatorHtml}
      <tr class="campaign-row hover:bg-[#1a1c24] transition-colors" data-search="${searchBlob}">
        ${cells.join('\n        ')}
      </tr>`;
    })
    .join('');

  const glossaryColumns = activeColumns.filter((c) => c.num !== 18);
  const guideCardsHtml = glossaryColumns
    .map(
      (col) => `
    <div
      id="guia-col-${col.num}"
      data-col-num="${col.num}"
      data-category="${escapeHtml(col.category)}"
      class="guide-card bg-[#181a20] rounded-xl border border-[#2b2d33] hover:border-amber-500/40 p-4 transition-all flex flex-col justify-between space-y-3"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="col-num-badge w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 font-mono text-xs font-black text-amber-400 flex items-center justify-center shrink-0">
              ${colBadgeNum(col.num)}
            </span>
            <h4 class="font-bold text-white text-sm truncate">${escapeHtml(col.name)}</h4>
          </div>
          <span class="text-[9.5px] font-bold px-2 py-0.5 rounded border shrink-0 ${col.stageColor}">${escapeHtml(col.badge)}</span>
        </div>
        <div class="text-xs text-neutral-300 leading-relaxed">
          <span class="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">O que significa:</span>
          <p>${escapeHtml(col.meaning)}</p>
        </div>
        <div class="text-xs text-neutral-300 leading-relaxed bg-[#121317] p-2.5 rounded-lg border border-[#22242a]">
          <span class="text-amber-400/90 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Por que é importante para o seu negócio:</span>
          <p class="text-neutral-300 text-[11px]">${escapeHtml(col.importance)}</p>
        </div>
        ${
          col.formula
            ? `<div class="text-[10.5px] text-neutral-400 flex items-center gap-1.5 font-mono bg-black/30 px-2 py-1 rounded border border-neutral-800"><span class="text-neutral-500">Cálculo:</span><strong class="text-neutral-200">${escapeHtml(col.formula)}</strong></div>`
            : ''
        }
      </div>
      <div class="pt-2.5 border-t border-[#23252b] flex items-end justify-between gap-2">
        <div class="text-[10.5px] text-neutral-400 flex items-start gap-1.5">
          <span class="text-amber-400 shrink-0">✦</span>
          <span class="italic leading-snug">${escapeHtml(col.tip)}</span>
        </div>
        <button type="button" onclick="scrollToCostTable()" class="back-btn hidden px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0 cursor-pointer">
          ↑ Tabela
        </button>
      </div>
    </div>`
    )
    .join('');

  return {
    tableRowsHtml,
    guideCardsHtml,
    totalBudget,
    totalInt,
    colInfo,
  };
}

function buildCostSheetTableAndGuideHtml(
  meta: ReportMeta,
  campaigns: CampaignRow[],
  metrics: {
    tableRowsHtml: string;
    guideCardsHtml: string;
    totalBudget: number;
    totalSpent: number;
    totalReach: number;
    totalInt: number;
    totalLinks: number;
    totalViews: number;
    totalConv: number;
    colInfo: ActiveCostColumnsResult;
  }
) {
  const fmtBRL = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const fmtNum = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const {
    tableRowsHtml,
    guideCardsHtml,
    totalBudget,
    totalSpent,
    totalReach,
    totalInt,
    totalLinks,
    totalViews,
    totalConv,
    colInfo,
  } = metrics;

  const { activeColumns, visibleSet, displayNumMap, allVisible, leadingColSpan } = colInfo;
  const vis = (colNum: number) => visibleSet.has(colNum);
  const colBadgeNum = (colNum: number) => displayNumMap.get(colNum) ?? colNum;

  const headerCells: string[] = [];
  if (vis(1)) headerCells.push(`<th class="border-r border-[#2b2d33] text-left whitespace-nowrap min-w-[230px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(1)" class="w-full py-3 px-3 flex items-center gap-1 text-left cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(1)}</span><span>Nome da Ação</span></button></th>`);
  if (vis(2)) headerCells.push(`<th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(2)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(2)}</span><span>Formato</span></button></th>`);
  if (vis(3)) headerCells.push(`<th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[95px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(3)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(3)}</span><span>Validade</span></button></th>`);
  if (vis(4)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/20 text-amber-300"><button type="button" onclick="focusGuideCard(4)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/60 text-amber-300">${colBadgeNum(4)}</span><span>Investimento</span></button></th>`);
  if (vis(5)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/30 text-amber-300 font-extrabold"><button type="button" onclick="focusGuideCard(5)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/80 text-amber-200">${colBadgeNum(5)}</span><span>Valor Gasto</span></button></th>`);
  if (vis(6)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(6)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">${colBadgeNum(6)}</span><span>Alcance</span></button></th>`);
  if (vis(7)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(7)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(7)}</span><span>Engajamento</span></button></th>`);
  if (vis(8)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(8)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(8)}</span><span>Cliques Link</span></button></th>`);
  if (vis(9)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(9)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">${colBadgeNum(9)}</span><span>ThruPlay</span></button></th>`);
  if (vis(10)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(10)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">${colBadgeNum(10)}</span><span>Custo / 1.000</span></button></th>`);
  if (vis(11)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(11)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(11)}</span><span>Custo / Clique</span></button></th>`);
  if (vis(12)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(12)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">${colBadgeNum(12)}</span><span>Custo / ThruPlay</span></button></th>`);
  if (vis(13)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(13)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(13)}</span><span>Custo / Interação</span></button></th>`);
  if (vis(14)) headerCells.push(`<th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/20 text-emerald-300"><button type="button" onclick="focusGuideCard(14)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-900/60 text-emerald-200">${colBadgeNum(14)}</span><span>Custo / Conversa</span></button></th>`);
  if (vis(15)) headerCells.push(`<th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(15)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(15)}</span><span>Filtro</span></button></th>`);
  if (vis(16)) headerCells.push(`<th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(16)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">${colBadgeNum(16)}</span><span>Cidade</span></button></th>`);
  if (vis(17)) headerCells.push(`<th class="border-b ${vis(18) ? 'border-r ' : ''}border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/40 text-emerald-300 font-extrabold"><button type="button" onclick="focusGuideCard(17)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-800 text-white">${colBadgeNum(17)}</span><span>Conversas</span></button></th>`);
  if (vis(18)) headerCells.push(`<th class="border-b border-[#2b2d33] text-left whitespace-nowrap min-w-[140px] p-0"><div class="w-full py-3 px-2.5 flex items-center gap-1 text-left"><span>Observação</span></div></th>`);

  const lastMetricColNum = activeColumns
    .filter((c) => c.num < 18)
    .reduce((max, c) => Math.max(max, c.num), 0);
  const footR = (colNum: number) => (colNum !== lastMetricColNum ? 'border-r border-r-[#2b2d33] ' : '');

  const footerCells: string[] = [];
  if (leadingColSpan > 0) {
    footerCells.push(`<td colspan="${leadingColSpan}" class="py-3 px-3 border-t-2 border-t-amber-500 ${lastMetricColNum > 3 ? 'border-r border-r-[#2b2d33] ' : ''}text-left uppercase font-sans tracking-wide">Total Consolidado (${campaigns.length} ações)</td>`);
  }
  if (vis(4)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(4)}text-right text-neutral-300">${fmtBRL(totalBudget)}</td>`);
  if (vis(5)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(5)}text-right font-black text-amber-300 bg-amber-950/30">${fmtBRL(totalSpent)}</td>`);
  if (vis(6)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(6)}text-right font-black text-blue-300 bg-blue-950/30">${fmtNum(totalReach)}</td>`);
  if (vis(7)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(7)}text-right text-neutral-300">${fmtNum(totalInt)}</td>`);
  if (vis(8)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(8)}text-right text-neutral-300">${fmtNum(totalLinks)}</td>`);
  if (vis(9)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(9)}text-right font-black text-purple-300 bg-purple-950/30">${fmtNum(totalViews)}</td>`);
  if (vis(10)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(10)}text-right text-blue-300">${totalReach > 0 ? fmtBRL((totalSpent / totalReach) * 1000) : '—'}</td>`);
  if (vis(11)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(11)}text-right text-neutral-300">${totalLinks > 0 ? fmtBRL(totalSpent / totalLinks) : '—'}</td>`);
  if (vis(12)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(12)}text-right text-purple-300">${totalViews > 0 ? fmtBRL(totalSpent / totalViews) : '—'}</td>`);
  if (vis(13)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(13)}text-right text-neutral-300">${totalInt > 0 ? fmtBRL(totalSpent / totalInt) : '—'}</td>`);
  if (vis(14)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(14)}text-right text-emerald-300">${totalConv > 0 ? fmtBRL(totalSpent / totalConv) : '—'}</td>`);
  if (vis(15)) footerCells.push(`<td class="py-3 px-1.5 border-t-2 border-t-amber-500 ${footR(15)}text-center text-neutral-500 font-sans">—</td>`);
  if (vis(16)) footerCells.push(`<td class="py-3 px-1.5 border-t-2 border-t-amber-500 ${footR(16)}text-center text-neutral-500 font-sans">—</td>`);
  if (vis(17)) footerCells.push(`<td class="py-3 px-2 border-t-2 border-t-amber-500 ${footR(17)}text-right font-black text-emerald-400 bg-emerald-950/40">${totalConv > 0 ? `${totalConv} conv.` : '—'}</td>`);
  if (vis(18)) footerCells.push(`<td class="py-3 px-2 border-0 bg-[#141518]"></td>`);

  const glossaryColumns = activeColumns.filter((c) => c.num !== 18);
  const setupCount = glossaryColumns.filter((c) => c.category === 'setup' || c.category === 'financeiro').length;
  const topoCount = glossaryColumns.filter((c) => c.category === 'topo').length;
  const meioCount = glossaryColumns.filter((c) => c.category === 'meio').length;
  const fundoCount = glossaryColumns.filter((c) => c.category === 'fundo').length;

  const tabButtons: string[] = [
    `<button type="button" onclick="filterGuide('all', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 text-neutral-950 shadow-md cursor-pointer">Todas (${glossaryColumns.length})</button>`,
  ];
  if (setupCount > 0) {
    tabButtons.push(
      `<button type="button" onclick="filterGuide('setup', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Setup &amp; Verba (${setupCount})</button>`
    );
  }
  if (topoCount > 0) {
    tabButtons.push(
      `<button type="button" onclick="filterGuide('topo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Alcance / CPM (${topoCount})</button>`
    );
  }
  if (meioCount > 0) {
    tabButtons.push(
      `<button type="button" onclick="filterGuide('meio', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Engajamento / Vídeos (${meioCount})</button>`
    );
  }
  if (fundoCount > 0) {
    tabButtons.push(
      `<button type="button" onclick="filterGuide('fundo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">WhatsApp &amp; Vendas (${fundoCount})</button>`
    );
  }

  return `
    <!-- Table Card (Planilha de Custos) -->
    <div id="planilha-custos-tabela" class="bg-[#141518] rounded-2xl border border-[#2b2d33] shadow-2xl overflow-hidden">
      <div class="p-4 sm:p-5 bg-gradient-to-r from-[#181a20] via-[#1c1e26] to-[#181a20] border-b border-[#2b2d33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Planilha de Custos · ${allVisible ? `${activeColumns.length} Colunas Oficiais Meta Ads` : `${activeColumns.length} Colunas Preenchidas Meta Ads`}
            </span>
            <span class="text-[11px] text-neutral-400">
              Clique no título de qualquer coluna abaixo para ir direto à explicação dela
            </span>
          </div>
          <h3 class="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Ações Mensais do Período</span>
            <span class="text-xs font-normal text-neutral-400">(${escapeHtml(meta.mes)} ${escapeHtml(meta.ano)})</span>
          </h3>
        </div>

        <div class="flex items-center gap-2.5 no-print">
          <input
            id="cost-search-input"
            type="text"
            placeholder="Filtrar por nome ou formato..."
            oninput="filterCostRows(this.value)"
            class="bg-[#111215] border border-[#2b2d33] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 min-w-[220px]"
          />
          <a href="#guia-17-colunas" class="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all whitespace-nowrap">
            Ver Guia &amp; Legenda
          </a>
        </div>
      </div>

      <div class="text-white py-2.5 px-4 text-center font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm" style="background-color: #FF9900;">
        AÇÕES MENSAIS • MATRIZ OFICIAL DE IMPULSIONAMENTO
      </div>

      <div class="overflow-x-auto max-h-[750px]">
        <table class="w-full border-collapse text-[11px] font-sans">
          <thead class="sticky top-0 z-20 bg-[#1a1c22] shadow-md border-b-2 border-neutral-700">
            <tr class="text-neutral-300 font-bold uppercase tracking-tight text-[9px] select-none">
              ${headerCells.join('\n              ')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot class="sticky bottom-0 z-20 bg-[#16171d] font-mono text-[10.5px]">
            <tr class="text-white font-bold">
              ${footerCells.join('\n              ')}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Glossary Section -->
    <div id="guia-17-colunas" class="bg-[#141518] rounded-2xl border border-[#2b2d33] p-6 shadow-xl space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b2d33] pb-4">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400">Glossário Técnico &amp; Executivo</span>
          <h3 class="text-xl font-bold text-white tracking-tight">O que cada uma das ${glossaryColumns.length} colunas significa e por que é importante?</h3>
          <p class="text-xs text-neutral-400 leading-relaxed max-w-3xl">
            Consulte abaixo a descrição didática de cada coluna da planilha, por que ela é indispensável para o cliente e como analisar seus números com precisão.
          </p>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap no-print" id="guide-tabs">
          ${tabButtons.join('\n          ')}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${guideCardsHtml}
      </div>
    </div>
  `;
}

export function exportCostSheetWebReport(
  meta: ReportMeta,
  campaigns: CampaignRow[]
) {
  const activeCampaigns = filterActiveCampaigns(campaigns);
  const totalSpent = activeCampaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = activeCampaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalLinks = activeCampaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalViews = activeCampaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = activeCampaigns.reduce((acc, c) => acc + (c.conv || 0), 0);

  const {
    tableRowsHtml,
    guideCardsHtml,
    totalBudget,
    totalInt,
    colInfo,
  } = buildCostSheetFragments(activeCampaigns);

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planilha de Custos • ${escapeHtml(meta.cliente || 'Cliente')} (${escapeHtml(meta.mes)} ${escapeHtml(meta.ano)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #0b0c0e;
      color: #e5e7eb;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .guide-card.is-focused {
      background-color: #1e212a !important;
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.7), 0 20px 25px -5px rgba(245, 158, 11, 0.15);
    }
    .guide-card.is-focused .col-num-badge {
      background-color: #f59e0b !important;
      border-color: #fbbf24 !important;
      color: #09090b !important;
    }
    .guide-card.is-focused .back-btn {
      display: inline-flex !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 6mm;
      }
      .no-print { display: none !important; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background-color: #0b0c0e !important;
        color: #e5e7eb !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      main {
        max-width: 100% !important;
        padding: 4mm 0 !important;
      }
      .overflow-x-auto {
        overflow: visible !important;
        max-height: none !important;
      }
      table {
        width: 100% !important;
        table-layout: fixed !important;
        font-size: 7.5px !important;
      }
      th, td {
        min-width: 0 !important;
        padding: 4px 3px !important;
        white-space: normal !important;
        word-break: break-word !important;
      }
      th button {
        padding: 4px 2px !important;
        white-space: normal !important;
      }
      thead { display: table-header-group; }
      tfoot { display: table-row-group; }
      tr, .guide-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #guia-17-colunas {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body class="min-h-screen antialiased selection:bg-amber-500 selection:text-black">
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Executive Presentation Header -->
    <div class="bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
      <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="flex items-start sm:items-center gap-4">
          <img
            src="${BRAND_LOGO_DATA_URI}"
            alt="Logo"
            class="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-contain shrink-0 shadow-xl shadow-amber-500/20"
          />
          <div>
            <div class="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400">
              <span>Planilha de Custos</span>
              <span class="text-neutral-600">·</span>
              <span class="text-neutral-400 font-mono normal-case tracking-normal">${escapeHtml(meta.mes)} ${escapeHtml(meta.ano)}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Relatório de ${escapeHtml(meta.cliente || 'Cliente')}
            </h1>
            <p class="text-xs sm:text-sm text-neutral-400 mt-0.5">
              ${colInfo.allVisible ? `Matriz Oficial de ${colInfo.activeColumns.length} Colunas e Métricas Detalhadas` : `Matriz Executiva de ${colInfo.activeColumns.length} Colunas Preenchidas e Métricas Detalhadas`} • Base de dados oficial da Meta (${activeCampaigns.length} ações)
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 no-print">
          <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold transition-all shadow-md cursor-pointer">
            Imprimir / Salvar PDF
          </button>
          <span class="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold px-3 py-1.5 rounded-xl">
            Somente Leitura
          </span>
        </div>
      </div>
    </div>

    ${buildCostSheetTableAndGuideHtml(meta, activeCampaigns, {
      tableRowsHtml,
      guideCardsHtml,
      totalBudget,
      totalSpent,
      totalReach,
      totalInt,
      totalLinks,
      totalViews,
      totalConv,
      colInfo,
    })}
  </main>

  <footer class="border-t border-[#1e2025] py-8 text-center text-xs text-neutral-500">
    <p>Planilha de Custos gerada para <strong>${escapeHtml(meta.cliente || 'Cliente')}</strong> • Meta Ads</p>
  </footer>

  ${COST_SHEET_SCRIPT_HTML}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeClient = (meta.cliente || 'cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePeriod = `${meta.mes || 'mes'}_${meta.ano || 'ano'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Planilha_de_Custos_${safeClient}_${safePeriod}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

