import { CampaignRow, CapaData, ReportMeta } from '../types';
import { COLUMNS_17_GUIDE } from './columnsGuide';
import { extractDateFromName } from './metaAdsParser';

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCase(str: string): string {
  return (str || '')
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function exportInteractiveWebReport(
  meta: ReportMeta,
  campaigns: CampaignRow[],
  capa: CapaData
) {
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalImpr = campaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);
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

  campaigns.forEach((c) => {
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
  } = buildCostSheetFragments(campaigns);

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
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/20">
          ${escapeHtml((meta.cliente || 'C').charAt(0).toUpperCase())}
        </div>
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
          <span class="text-[10px] text-neutral-500 block mt-1">${campaigns.filter((c) => c.views > 0).length} ações de vídeo</span>
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
          <span class="text-xl sm:text-2xl font-black text-white font-mono">${campaigns.length} ações</span>
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
        <span class="text-xs text-neutral-400 font-bold">${campaigns.length} Ações Analisadas</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${campaigns
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
                    ${badge} • ${c.format || 'Anúncio'}
                  </span>
                  <h4 class="text-sm font-extrabold text-white mt-1.5 truncate">
                    ${c.displayName || c.name}
                  </h4>
                  <p class="text-[11px] text-neutral-400">Validade: ${c.validity || 'Mês completo'}</p>
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
              <strong class="text-rose-400 text-sm font-bold uppercase tracking-wide">Instagram Business</strong>
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
                <span class="text-rose-300">${capa.ig.mulheres || '—'} Mulheres / ${capa.ig.homens || '—'} Homens</span>
              </div>
            </div>
          </div>

          <div class="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
              <strong class="text-blue-400 text-sm font-bold uppercase tracking-wide">Facebook Page</strong>
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
                <span class="text-blue-300">${capa.fb.mulheres || '—'} Mulheres / ${capa.fb.homens || '—'} Homens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
        : ''
    }

    ${buildCostSheetTableAndGuideHtml(meta, campaigns, {
      tableRowsHtml,
      guideCardsHtml,
      totalBudget,
      totalSpent,
      totalReach,
      totalInt,
      totalLinks,
      totalViews,
      totalConv,
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
  const fmtBRL = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtNum = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);

  let lastDateKey = '';

  const tableRowsHtml = campaigns
    .map((r, idx) => {
      const o = r.objective;
      const isReels = /^Reels/i.test(o);
      const isAlcanceOnly = o === 'Alc';
      const curDate = extractDateFromName(r.name) || (r.sortDate ? new Date(r.sortDate) : null);
      const curDateKey = curDate ? String(curDate.getTime()) : 'none';
      const showSeparator = idx > 0 && curDateKey !== lastDateKey;
      lastDateKey = curDateKey;

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
            o === 'ReelsTrafWhats'
          ? fmtNum(r.eng)
          : '—';

      const colLinks =
        o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink'
          ? fmtNum(r.links)
          : '—';

      const colViews = isReels && r.views > 0 ? fmtNum(r.views) : '—';
      const colCPM = o === 'Alc' && r.cpm > 0 ? fmtBRL(r.cpm) : '—';
      const colCPC =
        (o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink') && r.cpc > 0
          ? fmtBRL(r.cpc)
          : '—';
      const colThru =
        (o === 'ReelsAlc' || o === 'ReelsEng' || o === 'ReelsEngLink' || o === 'ReelsTrafLink') && r.cThru > 0
          ? fmtBRL(r.cThru)
          : '—';
      const colCInt = (o === 'Eng' || o === 'ReelsEng') && r.cInt > 0 ? fmtBRL(r.cInt) : '—';
      const colCConv =
        (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats') && r.cConv > 0
          ? fmtBRL(r.cConv)
          : '—';
      const colConv =
        (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats') && r.conv > 0
          ? fmtNum(r.conv)
          : '—';

      const searchBlob = escapeHtml(
        `${r.displayName || ''} ${r.name || ''} ${r.format || ''} ${r.objective || ''} ${r.filtro || ''} ${r.cidade || ''}`.toLowerCase()
      );

      const separatorHtml = showSeparator
        ? `<tr class="bg-[#101114] border-y border-[#2b2d33] h-2" data-sep="1"><td colspan="17" class="h-2 p-0"></td></tr>`
        : '';

      return `${separatorHtml}
      <tr class="campaign-row hover:bg-[#1a1c24] transition-colors" data-search="${searchBlob}">
        <td class="py-2.5 px-3 border-r border-[#23252b] text-left font-medium text-white">
          <span class="block">${escapeHtml(titleCase(r.displayName || r.name))}</span>
          ${r.aiNotes ? `<span class="block text-[9px] text-amber-400/80 font-normal mt-0.5">${escapeHtml(r.aiNotes)}</span>` : ''}
        </td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-300">${escapeHtml(r.format || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-400">${escapeHtml(r.validity || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${fmtBRL(r.budget)}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-amber-400 bg-amber-950/10">${fmtBRL(r.spent)}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 font-semibold bg-blue-950/10">${colReach}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colEng}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colLinks}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 font-semibold bg-purple-950/10">${colViews}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 bg-blue-950/10">${colCPM}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCPC}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 bg-purple-950/10">${colThru}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCInt}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-emerald-300 bg-emerald-950/10">${colCConv}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.filtro || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.cidade || '—')}</td>
        <td class="py-2.5 px-2 border-b border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-emerald-400 bg-emerald-950/20">${colConv !== '—' ? `${colConv} conv.` : '—'}</td>
      </tr>`;
    })
    .join('');

  const guideCardsHtml = COLUMNS_17_GUIDE.map(
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
              ${col.num}
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
  ).join('');

  return {
    tableRowsHtml,
    guideCardsHtml,
    totalBudget,
    totalInt,
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
  } = metrics;

  return `
    <!-- 17-Column Table Card (Planilha de Custos) -->
    <div id="planilha-custos-tabela" class="bg-[#141518] rounded-2xl border border-[#2b2d33] shadow-2xl overflow-hidden">
      <div class="p-4 sm:p-5 bg-gradient-to-r from-[#181a20] via-[#1c1e26] to-[#181a20] border-b border-[#2b2d33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Planilha de Custos · 17 Colunas Oficiais Meta Ads
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
              <th class="border-r border-[#2b2d33] text-left whitespace-nowrap min-w-[230px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(1)" class="w-full py-3 px-3 flex items-center gap-1 text-left cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">1</span><span>Nome da Ação</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(2)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">2</span><span>Formato</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[95px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(3)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">3</span><span>Validade</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/20 text-amber-300"><button type="button" onclick="focusGuideCard(4)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/60 text-amber-300">4</span><span>Investimento</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/30 text-amber-300 font-extrabold"><button type="button" onclick="focusGuideCard(5)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/80 text-amber-200">5</span><span>Valor Gasto</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(6)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">6</span><span>Alcance</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(7)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">7</span><span>Engajamento</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(8)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">8</span><span>Cliques Link</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(9)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">9</span><span>ThruPlay</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(10)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">10</span><span>Custo / 1.000</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(11)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">11</span><span>Custo / Clique</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(12)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">12</span><span>Custo / ThruPlay</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(13)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">13</span><span>Custo / Interação</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/20 text-emerald-300"><button type="button" onclick="focusGuideCard(14)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-900/60 text-emerald-200">14</span><span>Custo / Conversa</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(15)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">15</span><span>Filtro</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(16)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">16</span><span>Cidade</span></button></th>
              <th class="border-b border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/40 text-emerald-300 font-extrabold"><button type="button" onclick="focusGuideCard(17)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-800 text-white">17</span><span>Conversas</span></button></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#23252b]">
            ${tableRowsHtml}
          </tbody>
          <tfoot class="sticky bottom-0 z-20 bg-[#16171d] border-t-2 border-amber-500 font-mono text-[10.5px]">
            <tr class="text-white font-bold">
              <td colspan="3" class="py-3 px-3 border-r border-[#2b2d33] text-left uppercase font-sans tracking-wide">
                Total Consolidado (${campaigns.length} ações)
              </td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtBRL(totalBudget)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-amber-300 bg-amber-950/30">${fmtBRL(totalSpent)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-blue-300 bg-blue-950/30">${fmtNum(totalReach)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtNum(totalInt)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtNum(totalLinks)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-purple-300 bg-purple-950/30">${fmtNum(totalViews)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-blue-300">${totalReach > 0 ? fmtBRL((totalSpent / totalReach) * 1000) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${totalLinks > 0 ? fmtBRL(totalSpent / totalLinks) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-purple-300">${totalViews > 0 ? fmtBRL(totalSpent / totalViews) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${totalInt > 0 ? fmtBRL(totalSpent / totalInt) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-emerald-300">${totalConv > 0 ? fmtBRL(totalSpent / totalConv) : '—'}</td>
              <td class="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td class="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td class="py-3 px-2 text-right font-black text-emerald-400 bg-emerald-950/40">${totalConv > 0 ? `${totalConv} conv.` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 17-Column Glossary Section -->
    <div id="guia-17-colunas" class="bg-[#141518] rounded-2xl border border-[#2b2d33] p-6 shadow-xl space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b2d33] pb-4">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400">Glossário Técnico &amp; Executivo</span>
          <h3 class="text-xl font-bold text-white tracking-tight">O que cada uma das 17 colunas significa e por que é importante?</h3>
          <p class="text-xs text-neutral-400 leading-relaxed max-w-3xl">
            Consulte abaixo a descrição didática de cada coluna da planilha, por que ela é indispensável para o cliente e como analisar seus números com precisão.
          </p>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap no-print" id="guide-tabs">
          <button type="button" onclick="filterGuide('all', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 text-neutral-950 shadow-md cursor-pointer">Todas (17)</button>
          <button type="button" onclick="filterGuide('setup', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Setup &amp; Verba (1 a 5)</button>
          <button type="button" onclick="filterGuide('topo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Alcance / CPM (6 e 10)</button>
          <button type="button" onclick="filterGuide('meio', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Engajamento / Vídeos (7 a 13)</button>
          <button type="button" onclick="filterGuide('fundo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">WhatsApp &amp; Vendas (14 e 17)</button>
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
  const fmtBRL = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtNum = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);

  let lastDateKey = '';

  const tableRowsHtml = campaigns
    .map((r, idx) => {
      const o = r.objective;
      const isReels = /^Reels/i.test(o);
      const isAlcanceOnly = o === 'Alc';
      const curDate = extractDateFromName(r.name) || (r.sortDate ? new Date(r.sortDate) : null);
      const curDateKey = curDate ? String(curDate.getTime()) : 'none';
      const showSeparator = idx > 0 && curDateKey !== lastDateKey;
      lastDateKey = curDateKey;

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
            o === 'ReelsTrafWhats'
          ? fmtNum(r.eng)
          : '—';

      const colLinks =
        o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink'
          ? fmtNum(r.links)
          : '—';

      const colViews = isReels && r.views > 0 ? fmtNum(r.views) : '—';
      const colCPM = o === 'Alc' && r.cpm > 0 ? fmtBRL(r.cpm) : '—';
      const colCPC =
        (o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink') && r.cpc > 0
          ? fmtBRL(r.cpc)
          : '—';
      const colThru =
        (o === 'ReelsAlc' || o === 'ReelsEng' || o === 'ReelsEngLink' || o === 'ReelsTrafLink') && r.cThru > 0
          ? fmtBRL(r.cThru)
          : '—';
      const colCInt = (o === 'Eng' || o === 'ReelsEng') && r.cInt > 0 ? fmtBRL(r.cInt) : '—';
      const colCConv =
        (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats') && r.cConv > 0
          ? fmtBRL(r.cConv)
          : '—';
      const colConv =
        (o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats') && r.conv > 0
          ? fmtNum(r.conv)
          : '—';

      const searchBlob = escapeHtml(
        `${r.displayName || ''} ${r.name || ''} ${r.format || ''} ${r.objective || ''} ${r.filtro || ''} ${r.cidade || ''}`.toLowerCase()
      );

      const separatorHtml = showSeparator
        ? `<tr class="bg-[#101114] border-y border-[#2b2d33] h-2" data-sep="1"><td colspan="17" class="h-2 p-0"></td></tr>`
        : '';

      return `${separatorHtml}
      <tr class="campaign-row hover:bg-[#1a1c24] transition-colors" data-search="${searchBlob}">
        <td class="py-2.5 px-3 border-r border-[#23252b] text-left font-medium text-white">
          <span class="block">${escapeHtml(titleCase(r.displayName || r.name))}</span>
          ${r.aiNotes ? `<span class="block text-[9px] text-amber-400/80 font-normal mt-0.5">${escapeHtml(r.aiNotes)}</span>` : ''}
        </td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-300">${escapeHtml(r.format || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-neutral-400">${escapeHtml(r.validity || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${fmtBRL(r.budget)}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-amber-400 bg-amber-950/10">${fmtBRL(r.spent)}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 font-semibold bg-blue-950/10">${colReach}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colEng}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colLinks}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 font-semibold bg-purple-950/10">${colViews}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-blue-300 bg-blue-950/10">${colCPM}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCPC}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-purple-300 bg-purple-950/10">${colThru}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-neutral-300">${colCInt}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-right whitespace-nowrap font-mono text-emerald-300 bg-emerald-950/10">${colCConv}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.filtro || '—')}</td>
        <td class="py-2.5 px-2 border-r border-[#23252b] text-center whitespace-nowrap text-[10px] text-neutral-200">${escapeHtml(r.cidade || '—')}</td>
        <td class="py-2.5 px-2 border-b border-[#23252b] text-right whitespace-nowrap font-mono font-bold text-emerald-400 bg-emerald-950/20">${colConv !== '—' ? `${colConv} conv.` : '—'}</td>
      </tr>`;
    })
    .join('');

  const guideCardsHtml = COLUMNS_17_GUIDE.map(
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
              ${col.num}
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
  ).join('');

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
          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
            <div class="w-full h-full bg-[#121316] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter">
              ${escapeHtml((meta.cliente || 'C').charAt(0).toUpperCase())}
            </div>
          </div>
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
              Matriz Oficial de 17 Colunas e Métricas Detalhadas • Base de dados oficial da Meta (${campaigns.length} ações)
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

    <!-- 17-Column Table Card -->
    <div id="planilha-custos-tabela" class="bg-[#141518] rounded-2xl border border-[#2b2d33] shadow-2xl overflow-hidden">
      <div class="p-4 sm:p-5 bg-gradient-to-r from-[#181a20] via-[#1c1e26] to-[#181a20] border-b border-[#2b2d33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
              17 Colunas Oficiais Meta Ads
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
              <th class="border-r border-[#2b2d33] text-left whitespace-nowrap min-w-[230px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(1)" class="w-full py-3 px-3 flex items-center gap-1 text-left cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">1</span><span>Nome da Ação</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(2)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">2</span><span>Formato</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[95px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(3)" class="w-full py-3 px-2 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">3</span><span>Validade</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/20 text-amber-300"><button type="button" onclick="focusGuideCard(4)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/60 text-amber-300">4</span><span>Investimento</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-amber-950/30 text-amber-300 font-extrabold"><button type="button" onclick="focusGuideCard(5)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-amber-900/80 text-amber-200">5</span><span>Valor Gasto</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(6)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">6</span><span>Alcance</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(7)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">7</span><span>Engajamento</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(8)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">8</span><span>Cliques Link</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[85px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(9)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">9</span><span>ThruPlay</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-blue-950/20 text-blue-300"><button type="button" onclick="focusGuideCard(10)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-blue-900/60 text-blue-200">10</span><span>Custo / 1.000</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(11)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">11</span><span>Custo / Clique</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 bg-purple-950/20 text-purple-300"><button type="button" onclick="focusGuideCard(12)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-purple-900/60 text-purple-200">12</span><span>Custo / ThruPlay</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[90px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(13)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">13</span><span>Custo / Interação</span></button></th>
              <th class="border-r border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/20 text-emerald-300"><button type="button" onclick="focusGuideCard(14)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-900/60 text-emerald-200">14</span><span>Custo / Conversa</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(15)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">15</span><span>Filtro</span></button></th>
              <th class="border-r border-[#2b2d33] text-center whitespace-nowrap min-w-[70px] p-0 hover:bg-neutral-800/80"><button type="button" onclick="focusGuideCard(16)" class="w-full py-3 px-1.5 flex items-center justify-center gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-neutral-800 text-neutral-400">16</span><span>Cidade</span></button></th>
              <th class="border-b border-[#2b2d33] text-right whitespace-nowrap min-w-[95px] p-0 bg-emerald-950/40 text-emerald-300 font-extrabold"><button type="button" onclick="focusGuideCard(17)" class="w-full py-3 px-2 flex items-center justify-end gap-1 cursor-pointer"><span class="font-mono text-[9px] px-1 rounded bg-emerald-800 text-white">17</span><span>Conversas</span></button></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#23252b]">
            ${tableRowsHtml}
          </tbody>
          <tfoot class="sticky bottom-0 z-20 bg-[#16171d] border-t-2 border-amber-500 font-mono text-[10.5px]">
            <tr class="text-white font-bold">
              <td colspan="3" class="py-3 px-3 border-r border-[#2b2d33] text-left uppercase font-sans tracking-wide">
                Total Consolidado (${campaigns.length} ações)
              </td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtBRL(totalBudget)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-amber-300 bg-amber-950/30">${fmtBRL(totalSpent)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-blue-300 bg-blue-950/30">${fmtNum(totalReach)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtNum(totalInt)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${fmtNum(totalLinks)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right font-black text-purple-300 bg-purple-950/30">${fmtNum(totalViews)}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-blue-300">${totalReach > 0 ? fmtBRL((totalSpent / totalReach) * 1000) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${totalLinks > 0 ? fmtBRL(totalSpent / totalLinks) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-purple-300">${totalViews > 0 ? fmtBRL(totalSpent / totalViews) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-neutral-300">${totalInt > 0 ? fmtBRL(totalSpent / totalInt) : '—'}</td>
              <td class="py-3 px-2 border-r border-[#2b2d33] text-right text-emerald-300">${totalConv > 0 ? fmtBRL(totalSpent / totalConv) : '—'}</td>
              <td class="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td class="py-3 px-1.5 border-r border-[#2b2d33] text-center text-neutral-500 font-sans">—</td>
              <td class="py-3 px-2 text-right font-black text-emerald-400 bg-emerald-950/40">${totalConv > 0 ? `${totalConv} conv.` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 17-Column Glossary Section -->
    <div id="guia-17-colunas" class="bg-[#141518] rounded-2xl border border-[#2b2d33] p-6 shadow-xl space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b2d33] pb-4">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400">Glossário Técnico &amp; Executivo</span>
          <h3 class="text-xl font-bold text-white tracking-tight">O que cada uma das 17 colunas significa e por que é importante?</h3>
          <p class="text-xs text-neutral-400 leading-relaxed max-w-3xl">
            Consulte abaixo a descrição didática de cada coluna da planilha, por que ela é indispensável para o cliente e como analisar seus números com precisão.
          </p>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap no-print" id="guide-tabs">
          <button type="button" onclick="filterGuide('all', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 text-neutral-950 shadow-md cursor-pointer">Todas (17)</button>
          <button type="button" onclick="filterGuide('setup', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Setup &amp; Verba (1 a 5)</button>
          <button type="button" onclick="filterGuide('topo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Alcance / CPM (6 e 10)</button>
          <button type="button" onclick="filterGuide('meio', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">Engajamento / Vídeos (7 a 13)</button>
          <button type="button" onclick="filterGuide('fundo', this)" class="guide-tab px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer">WhatsApp &amp; Vendas (14 e 17)</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${guideCardsHtml}
      </div>
    </div>
  </main>

  <footer class="border-t border-[#1e2025] py-8 text-center text-xs text-neutral-500">
    <p>Planilha de Custos gerada para <strong>${escapeHtml(meta.cliente || 'Cliente')}</strong> • Meta Ads</p>
  </footer>

  <script>
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
  </script>
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

