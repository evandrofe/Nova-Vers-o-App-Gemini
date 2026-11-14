import ExcelJS from 'exceljs';
import { CampaignRow, CapaData, ReportMeta } from '../types';
import { OBJ_LABELS } from './metaAdsParser';

export async function exportToExcel(
  meta: ReportMeta,
  campaigns: CampaignRow[],
  capa: CapaData
): Promise<void> {
  const C = {
    gold: 'FFFBBC04',
    goldDark: 'FFD97706',
    orange: 'FFFF9900',
    dark: 'FF141518',
    cardDark: 'FF181A20',
    charcoal: 'FF26282F',
    slate: 'FF334155',
    totalBg: 'FFFFEDD5',
    cardHeader: 'FFF1F5F9',
    cardBg: 'FFFFFFFF',
    gray1: 'FFB7B7B7',
    grayLight: 'FFF8FAFC',
    borderDark: 'FF2B2D33',
    rose: 'FFFB7185',
    roseLight: 'FFFDA4AF',
    blue: 'FF60A5FA',
    blueLight: 'FF93C5FD',
    mutedText: 'FF9CA3AF',
    white: 'FFFFFFFF',
    black: 'FF000000',
    separator: 'FFF3F4F6'
  };

  const bkThin: ExcelJS.Border = { style: 'thin', color: { argb: 'FFD1D5DB' } };
  const bkDark: ExcelJS.Border = { style: 'thin', color: { argb: C.black } };
  const bkCardDark: ExcelJS.Border = { style: 'thin', color: { argb: C.borderDark } };
  const bAll: Partial<ExcelJS.Borders> = { top: bkThin, bottom: bkThin, left: bkThin, right: bkThin };

  const fl = (argb: string): ExcelJS.Fill => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb }
  });

  const fn = (
    bold = false,
    size = 10,
    argb = C.black,
    name = 'Calibri'
  ): Partial<ExcelJS.Font> => ({
    bold: !!bold,
    size: size || 10,
    color: { argb: argb || C.black },
    name: name || 'Calibri'
  });

  const al = (
    h: ExcelJS.Alignment['horizontal'] = 'center',
    v: ExcelJS.Alignment['vertical'] = 'middle',
    wrapText = false
  ): Partial<ExcelJS.Alignment> => ({
    horizontal: h,
    vertical: v,
    wrapText: !!wrapText
  });

  const BRL = 'R$\\ #,##0.00';
  const NUM = '#,##0';
  const PCT = '0.00%';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Relatório de Impulsionamento Meta Ads';
  wb.created = new Date();

  // Consolidação de métricas globais
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);
  const totalImpr = campaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);

  const avgFrequency = totalReach > 0 ? totalImpr / totalReach : 1;
  const avgCostPerConv = totalConv > 0 ? totalSpent / totalConv : 0;
  const avgCPM = totalReach > 0 ? (totalSpent / totalReach) * 1000 : 0;
  const avgCPC = totalLinks > 0 ? totalSpent / totalLinks : 0;
  const avgCostPerView = totalViews > 0 ? totalSpent / totalViews : 0;
  const avgCTR = totalImpr > 0 ? totalLinks / totalImpr : 0;

  const hasSocialData = [...Object.values(capa.fb || {}), ...Object.values(capa.ig || {})].some(
    (v) => String(v || '').trim().length > 0
  );

  // ═════════════════════════════════════════════════════════════════════════
  // PASTA 1: RESUMO DO RELATÓRIO (Sem capa amarela, com Base de Audiência Social formatada)
  // ═════════════════════════════════════════════════════════════════════════
  const wsDest = wb.addWorksheet('Resumo do Relatório');
  wsDest.columns = [
    { width: 5 },   // A: Margem
    { width: 28 },  // B: Card 1 / Nome Ação
    { width: 14 },  // C: Formato
    { width: 22 },  // D: Objetivo
    { width: 16 },  // E: Validade
    { width: 16 },  // F: Valor Gasto
    { width: 16 },  // G: Alcance
    { width: 16 },  // H: Resultado Principal
    { width: 16 },  // I: Custo Resultado
    { width: 16 },  // J: Filtro
    { width: 16 }   // K: Cidade
  ];

  // Cabeçalho Principal Executivo
  wsDest.mergeCells('B2:K2');
  wsDest.getRow(2).height = 36;
  const cDestHead = wsDest.getCell('B2');
  cDestHead.value = 'RESUMO DO RELATÓRIO • RELATÓRIO EXECUTIVO DE MÍDIA PAGA';
  cDestHead.fill = fl(C.dark);
  cDestHead.font = fn(true, 14, C.white);
  cDestHead.alignment = al('center', 'middle');

  wsDest.mergeCells('B3:K3');
  wsDest.getRow(3).height = 20;
  const cDestSub = wsDest.getCell('B3');
  cDestSub.value = `Cliente: ${meta.cliente || 'Cliente'}  |  Período: ${meta.mes || ''} ${meta.ano || ''}  |  Base de dados oficial Meta Ads`;
  cDestSub.fill = fl(C.charcoal);
  cDestSub.font = fn(false, 10, C.gold);
  cDestSub.alignment = al('center', 'middle');

  // Seção 1: 12 Cards de Indicadores Chave (3 linhas x 4 colunas)
  wsDest.mergeCells('B5:K5');
  wsDest.getRow(5).height = 24;
  const cKpiSec = wsDest.getCell('B5');
  cKpiSec.value = '1. PRINCIPAIS INDICADORES DE PERFORMANCE CONSOLIDADOS (KPIS)';
  cKpiSec.fill = fl(C.slate);
  cKpiSec.font = fn(true, 11, C.white);
  cKpiSec.alignment = al('left', 'middle');

  interface KpiCard {
    label: string;
    value: number;
    fmt: 'currency' | 'number' | 'percent';
    detail: string;
  }

  const kpisLine1: KpiCard[] = [
    { label: 'VALOR INVESTIDO', value: totalSpent, fmt: 'currency', detail: `Orçado: R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'ALCANCE TOTAL', value: totalReach, fmt: 'number', detail: 'Contas únicas atingidas' },
    { label: 'IMPRESSÕES TOTAIS', value: totalImpr, fmt: 'number', detail: 'Exibições no Feed/Stories' },
    { label: 'FREQUÊNCIA MÉDIA', value: avgFrequency, fmt: 'percent', detail: 'Exibições por pessoa' }
  ];

  const kpisLine2: KpiCard[] = [
    { label: 'CONVERSAS WHATSAPP', value: totalConv, fmt: 'number', detail: 'Contatos diretos iniciados' },
    { label: 'CUSTO / CONVERSA WHATS', value: avgCostPerConv, fmt: 'currency', detail: 'Custo médio por lead direto' },
    { label: 'CLIQUES NO LINK', value: totalLinks, fmt: 'number', detail: 'Destinos e acessos externos' },
    { label: 'CUSTO / CLIQUE (CPC)', value: avgCPC, fmt: 'currency', detail: 'Média por clique no link' }
  ];

  const kpisLine3: KpiCard[] = [
    { label: 'VISUALIZAÇÕES THRUPLAY', value: totalViews, fmt: 'number', detail: 'Vídeos assistidos 15s+' },
    { label: 'CUSTO / THRUPLAY', value: avgCostPerView, fmt: 'currency', detail: 'Custo por vídeo retido' },
    { label: 'CUSTO POR 1.000 (CPM)', value: avgCPM, fmt: 'currency', detail: 'Custo para atingir 1.000' },
    { label: 'TAXA DE CLIQUES (CTR)', value: avgCTR, fmt: 'percent', detail: 'Taxa de conversão em clique' }
  ];

  const renderKpiRow = (cards: KpiCard[], startRow: number) => {
    const rLabel = wsDest.getRow(startRow);
    rLabel.height = 18;
    const rVal = wsDest.getRow(startRow + 1);
    rVal.height = 26;
    const rDet = wsDest.getRow(startRow + 2);
    rDet.height = 16;

    const colPairs = [
      ['B', 'C'],
      ['D', 'E'],
      ['F', 'G'],
      ['H', 'K']
    ];

    cards.forEach((card, idx) => {
      const [cStart, cEnd] = colPairs[idx];
      wsDest.mergeCells(`${cStart}${startRow}:${cEnd}${startRow}`);
      wsDest.mergeCells(`${cStart}${startRow + 1}:${cEnd}${startRow + 1}`);
      wsDest.mergeCells(`${cStart}${startRow + 2}:${cEnd}${startRow + 2}`);

      const cellL = wsDest.getCell(`${cStart}${startRow}`);
      cellL.value = card.label;
      cellL.fill = fl(C.cardHeader);
      cellL.font = fn(true, 8.5, C.slate);
      cellL.alignment = al('center', 'middle');
      cellL.border = { top: bkThin, left: bkThin, right: bkThin };

      const cellV = wsDest.getCell(`${cStart}${startRow + 1}`);
      cellV.value = card.value;
      cellV.fill = fl(C.cardBg);
      cellV.font = fn(true, 13, C.black);
      cellV.alignment = al('center', 'middle');
      cellV.border = { left: bkThin, right: bkThin };
      if (card.fmt === 'currency') cellV.numFmt = BRL;
      else if (card.fmt === 'number') cellV.numFmt = NUM;
      else cellV.numFmt = PCT;

      const cellD = wsDest.getCell(`${cStart}${startRow + 2}`);
      cellD.value = card.detail;
      cellD.fill = fl(C.grayLight);
      cellD.font = fn(false, 8, 'FF6B7280');
      cellD.alignment = al('center', 'middle');
      cellD.border = { bottom: bkThin, left: bkThin, right: bkThin };
    });
  };

  renderKpiRow(kpisLine1, 7);
  renderKpiRow(kpisLine2, 11);
  renderKpiRow(kpisLine3, 15);

  // Seção 2: Tabela de Ações e Campanhas Veiculadas
  let destCurRow = 20;
  wsDest.mergeCells(`B${destCurRow}:K${destCurRow}`);
  wsDest.getRow(destCurRow).height = 24;
  const cCampSec = wsDest.getCell(`B${destCurRow}`);
  cCampSec.value = '2. ANÚNCIOS E CAMPANHAS EM DESTAQUE NO MÊS';
  cCampSec.fill = fl(C.slate);
  cCampSec.font = fn(true, 11, C.white);
  cCampSec.alignment = al('left', 'middle');
  destCurRow++;

  const destHeaders = [
    'Nome da Ação / Anúncio',
    'Formato',
    'Objetivo Estratégico',
    'Validade',
    'Valor Gasto',
    'Alcance',
    'Resultado Chave',
    'Custo Unitário',
    'Filtro',
    'Cidade'
  ];

  const rDestHead = wsDest.getRow(destCurRow);
  rDestHead.height = 22;
  destHeaders.forEach((h, ci) => {
    const cell = rDestHead.getCell(ci + 2);
    cell.value = h;
    cell.fill = fl(C.gray1);
    cell.font = fn(true, 9.5, C.black);
    cell.alignment = al('center', 'middle', true);
    cell.border = bAll;
  });
  destCurRow++;

  campaigns.forEach((c) => {
    let mainResult = '—';
    let mainCost = 0;
    if (c.conv > 0) {
      mainResult = `${c.conv} conversas`;
      mainCost = c.cConv;
    } else if (c.views > 0) {
      mainResult = `${c.views.toLocaleString('pt-BR')} views`;
      mainCost = c.cThru;
    } else if (c.links > 0) {
      mainResult = `${c.links.toLocaleString('pt-BR')} cliques`;
      mainCost = c.cpc;
    } else if (c.reach > 0) {
      mainResult = `${c.reach.toLocaleString('pt-BR')} pessoas`;
      mainCost = c.cpm;
    }

    const rowVals = [
      c.displayName || c.name,
      c.format,
      OBJ_LABELS[c.objective] || c.objective,
      c.validity || '—',
      c.spent,
      c.reach,
      mainResult,
      mainCost > 0 ? mainCost : '—',
      c.filtro || '—',
      c.cidade || '—'
    ];

    const row = wsDest.getRow(destCurRow);
    row.height = 20;
    rowVals.forEach((v, ci) => {
      const cell = row.getCell(ci + 2);
      cell.value = v;
      cell.fill = fl(C.white);
      cell.font = fn(false, 9.5, C.black);
      cell.alignment = ci === 0 ? al('left', 'middle', true) : al('center', 'middle');
      cell.border = bAll;
      if (ci === 4) cell.numFmt = BRL;
      if (ci === 5) cell.numFmt = NUM;
      if (ci === 7 && typeof v === 'number') cell.numFmt = BRL;
    });
    destCurRow++;
  });

  // Linha de Totalização no Resumo do Relatório
  const rDestTot = wsDest.getRow(destCurRow);
  rDestTot.height = 24;
  const totDestVals = [
    `TOTAL CONSOLIDADO (${campaigns.length} AÇÕES)`,
    '',
    '',
    '',
    totalSpent,
    totalReach,
    totalConv > 0 ? `${totalConv} conversas` : `${totalReach} alcance`,
    avgCostPerConv > 0 ? avgCostPerConv : avgCPM,
    '',
    ''
  ];

  totDestVals.forEach((v, ci) => {
    const cell = rDestTot.getCell(ci + 2);
    cell.value = v;
    cell.fill = fl(C.totalBg);
    cell.font = fn(true, 10, C.black);
    cell.alignment = ci === 0 ? al('left', 'middle') : al('center', 'middle');
    cell.border = bAll;
    if (ci === 4) cell.numFmt = BRL;
    if (ci === 5) cell.numFmt = NUM;
    if (ci === 7 && typeof v === 'number') cell.numFmt = BRL;
  });
  destCurRow += 2;

  // Seção 3: Base de Audiência Social (Formatada exatamente como aparece na tela!)
  if (hasSocialData) {
    // Kicker Banner
    wsDest.mergeCells(`B${destCurRow}:K${destCurRow}`);
    wsDest.getRow(destCurRow).height = 20;
    const cSocKicker = wsDest.getCell(`B${destCurRow}`);
    cSocKicker.value = 'BASE DE AUDIÊNCIA SOCIAL';
    cSocKicker.fill = fl(C.dark);
    cSocKicker.font = fn(true, 9, C.gold);
    cSocKicker.alignment = al('left', 'middle');
    destCurRow++;

    // Main Section Title
    wsDest.mergeCells(`B${destCurRow}:K${destCurRow}`);
    wsDest.getRow(destCurRow).height = 26;
    const cSocTitle = wsDest.getCell(`B${destCurRow}`);
    cSocTitle.value = 'Demografia e Presença Orgânica Integrada';
    cSocTitle.fill = fl(C.dark);
    cSocTitle.font = fn(true, 13, C.white);
    cSocTitle.alignment = al('left', 'middle');
    cSocTitle.border = { bottom: bkCardDark };
    destCurRow++;

    // Card Headers (Side by Side: B..F = Instagram Business | G..K = Facebook Page)
    const rCardHead = wsDest.getRow(destCurRow);
    rCardHead.height = 26;

    wsDest.mergeCells(`B${destCurRow}:D${destCurRow}`);
    wsDest.mergeCells(`E${destCurRow}:F${destCurRow}`);
    wsDest.mergeCells(`G${destCurRow}:I${destCurRow}`);
    wsDest.mergeCells(`J${destCurRow}:K${destCurRow}`);

    const cIgHead = wsDest.getCell(`B${destCurRow}`);
    cIgHead.value = 'INSTAGRAM BUSINESS';
    cIgHead.fill = fl(C.cardDark);
    cIgHead.font = fn(true, 10.5, C.rose);
    cIgHead.alignment = al('left', 'middle');
    cIgHead.border = { top: bkCardDark, left: bkCardDark, bottom: bkCardDark };

    const cIgSegCount = wsDest.getCell(`E${destCurRow}`);
    cIgSegCount.value = `${capa.ig.seguidores || '—'} seguidores`;
    cIgSegCount.fill = fl(C.cardDark);
    cIgSegCount.font = fn(true, 10, C.white);
    cIgSegCount.alignment = al('right', 'middle');
    cIgSegCount.border = { top: bkCardDark, right: bkCardDark, bottom: bkCardDark };

    const cFbHead = wsDest.getCell(`G${destCurRow}`);
    cFbHead.value = 'FACEBOOK PAGE';
    cFbHead.fill = fl(C.cardDark);
    cFbHead.font = fn(true, 10.5, C.blue);
    cFbHead.alignment = al('left', 'middle');
    cFbHead.border = { top: bkCardDark, left: bkCardDark, bottom: bkCardDark };

    const cFbSegCount = wsDest.getCell(`J${destCurRow}`);
    cFbSegCount.value = `${capa.fb.seguidores || '—'} seguidores`;
    cFbSegCount.fill = fl(C.cardDark);
    cFbSegCount.font = fn(true, 10, C.white);
    cFbSegCount.alignment = al('right', 'middle');
    cFbSegCount.border = { top: bkCardDark, right: bkCardDark, bottom: bkCardDark };
    destCurRow++;

    const socialRows = [
      {
        igLabel: 'Seguidores Mês Anterior:',
        igVal: capa.ig.segAnterior || '—',
        igColor: C.white,
        fbLabel: 'Seguidores Mês Anterior:',
        fbVal: capa.fb.segAnterior || '—',
        fbColor: C.white,
      },
      {
        igLabel: 'Alcance Orgânico/Total:',
        igVal: capa.ig.alcancadas || '—',
        igColor: C.white,
        fbLabel: 'Alcance Total:',
        fbVal: capa.fb.alcancadas || '—',
        fbColor: C.white,
      },
      {
        igLabel: 'Visitas ao Perfil:',
        igVal: capa.ig.visitas || '—',
        igColor: C.white,
        fbLabel: 'Visitas à Página:',
        fbVal: capa.fb.visitas || '—',
        fbColor: C.white,
      },
      {
        igLabel: 'Faixa Etária Principal:',
        igVal: capa.ig.faixa || '—',
        igColor: C.white,
        fbLabel: 'Faixa Etária Principal:',
        fbVal: capa.fb.faixa || '—',
        fbColor: C.white,
      },
      {
        igLabel: 'Divisão de Gênero:',
        igVal: `${capa.ig.mulheres || '—'} Mulheres / ${capa.ig.homens || '—'} Homens`,
        igColor: C.roseLight,
        fbLabel: 'Divisão de Gênero:',
        fbVal: `${capa.fb.mulheres || '—'} Mulheres / ${capa.fb.homens || '—'} Homens`,
        fbColor: C.blueLight,
      },
    ];

    socialRows.forEach((sr, idx) => {
      const isLast = idx === socialRows.length - 1;
      const row = wsDest.getRow(destCurRow);
      row.height = 20;

      wsDest.mergeCells(`B${destCurRow}:D${destCurRow}`);
      wsDest.mergeCells(`E${destCurRow}:F${destCurRow}`);
      wsDest.mergeCells(`G${destCurRow}:I${destCurRow}`);
      wsDest.mergeCells(`J${destCurRow}:K${destCurRow}`);

      const cIgL = wsDest.getCell(`B${destCurRow}`);
      cIgL.value = sr.igLabel;
      cIgL.fill = fl(C.cardDark);
      cIgL.font = fn(false, 9.5, C.mutedText);
      cIgL.alignment = al('left', 'middle');
      cIgL.border = { left: bkCardDark, ...(isLast ? { bottom: bkCardDark } : {}) };

      const cIgV = wsDest.getCell(`E${destCurRow}`);
      cIgV.value = sr.igVal;
      cIgV.fill = fl(C.cardDark);
      cIgV.font = fn(true, 9.5, sr.igColor);
      cIgV.alignment = al('right', 'middle');
      cIgV.border = { right: bkCardDark, ...(isLast ? { bottom: bkCardDark } : {}) };

      const cFbL = wsDest.getCell(`G${destCurRow}`);
      cFbL.value = sr.fbLabel;
      cFbL.fill = fl(C.cardDark);
      cFbL.font = fn(false, 9.5, C.mutedText);
      cFbL.alignment = al('left', 'middle');
      cFbL.border = { left: bkCardDark, ...(isLast ? { bottom: bkCardDark } : {}) };

      const cFbV = wsDest.getCell(`J${destCurRow}`);
      cFbV.value = sr.fbVal;
      cFbV.fill = fl(C.cardDark);
      cFbV.font = fn(true, 9.5, sr.fbColor);
      cFbV.alignment = al('right', 'middle');
      cFbV.border = { right: bkCardDark, ...(isLast ? { bottom: bkCardDark } : {}) };

      destCurRow++;
    });

    destCurRow++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PASTA 2: PLANILHA DE CUSTOS (17 COLUNAS COMPLETAS + LEGENDA DIDÁTICA)
  // ═════════════════════════════════════════════════════════════════════════
  const wsMatriz = wb.addWorksheet('Planilha de Custos');
  wsMatriz.columns = [
    { width: 30 }, // 1. NOME DA AÇÃO
    { width: 14 }, // 2. FORMATO
    { width: 16 }, // 3. VALIDADE
    { width: 15 }, // 4. INVESTIMENTO
    { width: 15 }, // 5. VALOR GASTO
    { width: 14 }, // 6. ALCANCE
    { width: 15 }, // 7. ENGAJAMENTO
    { width: 16 }, // 8. CLIQUES NO LINK
    { width: 22 }, // 9. VISUALIZAÇÃO (THRUPLAY)
    { width: 22 }, // 10. CUSTO POR 1.000 PESSOAS
    { width: 22 }, // 11. CUSTO POR CLIQUES NO LINK
    { width: 20 }, // 12. CUSTO POR THRUPLAY
    { width: 20 }, // 13. CUSTO POR INTERAÇÃO
    { width: 20 }, // 14. CUSTO POR CONVERSA
    { width: 16 }, // 15. FILTRO
    { width: 16 }, // 16. CIDADE
    { width: 22 }  // 17. CONVERSAS INICIADAS
  ];

  const HDR_17 = [
    'NOME DA AÇÃO',
    'FORMATO',
    'VALIDADE',
    'INVESTIMENTO',
    'VALOR GASTO',
    'ALCANCE',
    'ENGAJAMENTO',
    'CLIQUES NO LINK',
    'VISUALIZAÇÃO (THRUPLAY)',
    'CUSTO POR 1.000 PESSOAS',
    'CUSTO POR CLIQUES NO LINK',
    'CUSTO POR THRUPLAY',
    'CUSTO POR INTERAÇÃO',
    'CUSTO POR CONVERSA',
    'FILTRO',
    'CIDADE',
    'CONVERSAS INICIADAS'
  ];

  let matCurRow = 1;
  const rMatTop = wsMatriz.getRow(matCurRow);
  rMatTop.height = 34;
  wsMatriz.mergeCells(`A${matCurRow}:Q${matCurRow}`);
  const cMatTop = wsMatriz.getCell(`A${matCurRow}`);
  cMatTop.value = `PLANILHA DE CUSTOS UNIFICADA DE IMPULSIONAMENTO (17 COLUNAS) • ${meta.cliente.toUpperCase()}`;
  cMatTop.fill = fl(C.orange);
  cMatTop.font = fn(true, 13, C.white);
  cMatTop.alignment = al('center', 'middle');
  cMatTop.border = { bottom: bkDark };
  matCurRow++;

  const rMatHead = wsMatriz.getRow(matCurRow);
  rMatHead.height = 24;
  HDR_17.forEach((h, ci) => {
    const cell = rMatHead.getCell(ci + 1);
    cell.value = h;
    cell.fill = fl(C.gray1);
    cell.font = fn(true, 9.5, C.black);
    cell.alignment = al('center', 'middle', true);
    cell.border = bAll;
  });
  matCurRow++;

  let lastDateKeyXl = '';
  campaigns.forEach((r) => {
    const curDate = r.sortDate ? new Date(r.sortDate) : null;
    const curDateKey = curDate ? curDate.getTime() : 'none';

    if (lastDateKeyXl !== '' && curDateKey !== lastDateKeyXl) {
      const rBlank = wsMatriz.addRow(Array(17).fill(''));
      rBlank.height = 10;
      for (let ci = 1; ci <= 17; ci++) {
        rBlank.getCell(ci).fill = fl(C.separator);
        rBlank.getCell(ci).border = { top: bkThin, bottom: bkThin };
      }
      matCurRow++;
    }
    lastDateKeyXl = String(curDateKey);

    const o = r.objective;
    const isReelsXl = /^Reels/i.test(o);
    const isAlcanceRow = o === 'Alc';
    const isDuplicateReach = isAlcanceRow && r.reach > 0 && r.eng === r.reach;

    const vals = [
      r.displayName || r.name,
      r.format,
      r.validity || '-',
      r.budget > 0 ? r.budget : '-',
      r.spent > 0 ? r.spent : '-',
      r.reach > 0 ? r.reach : '-',
      isDuplicateReach ? '-' : (r.eng > 0 ? r.eng : '-'),
      r.links > 0 ? r.links : '-',
      isReelsXl && r.views > 0 ? r.views : '-',
      isAlcanceRow && r.cpm > 0 ? r.cpm : '-',
      r.cpc > 0 ? r.cpc : '-',
      isReelsXl && r.cThru > 0 ? r.cThru : '-',
      r.cInt > 0 ? r.cInt : '-',
      r.cConv > 0 ? r.cConv : '-',
      r.filtro || '-',
      r.cidade || '-',
      r.conv > 0 ? r.conv : '-'
    ];

    const row = wsMatriz.addRow(vals);
    row.height = 20;

    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.fill = fl(C.white);
      cell.font = fn(false, 9.5, C.black);
      cell.alignment = ci === 0 ? al('left', 'middle', true) : al('center', 'middle');
      cell.border = bAll;

      if (typeof v === 'number') {
        if ([3, 4, 9, 10, 11, 12, 13].includes(ci)) cell.numFmt = BRL;
        if ([5, 6, 7, 8, 16].includes(ci)) cell.numFmt = NUM;
      }
    });
    matCurRow++;
  });

  // Linha de Subtotal / Total Geral da Matriz
  const grandVals = [
    'TOTAL GERAL CONSOLIDADO',
    `${campaigns.length} campanhas`,
    '-',
    totalBudget > 0 ? totalBudget : '-',
    totalSpent > 0 ? totalSpent : '-',
    totalReach > 0 ? totalReach : '-',
    totalInt > 0 ? totalInt : '-',
    totalLinks > 0 ? totalLinks : '-',
    totalViews > 0 ? totalViews : '-',
    totalReach > 0 && totalSpent > 0 ? (totalSpent / totalReach) * 1000 : '-',
    totalLinks > 0 && totalSpent > 0 ? totalSpent / totalLinks : '-',
    totalViews > 0 && totalSpent > 0 ? totalSpent / totalViews : '-',
    totalInt > 0 && totalSpent > 0 ? totalSpent / totalInt : '-',
    totalConv > 0 && totalSpent > 0 ? totalSpent / totalConv : '-',
    '-',
    '-',
    totalConv > 0 ? totalConv : '-'
  ];

  const rMatTot = wsMatriz.addRow(grandVals);
  rMatTot.height = 24;
  grandVals.forEach((v, ci) => {
    const cell = rMatTot.getCell(ci + 1);
    cell.fill = fl(C.totalBg);
    cell.font = fn(true, 10.5, C.black);
    cell.alignment = ci === 0 ? al('left', 'middle') : al('center', 'middle');
    cell.border = bAll;
    if ([3, 4, 9, 10, 11, 12, 13].includes(ci)) cell.numFmt = BRL;
    if ([5, 6, 7, 8, 16].includes(ci)) cell.numFmt = NUM;
  });
  matCurRow += 2;

  // LEGENDA DIDÁTICA COMPLETA DAS 17 COLUNAS NA MATRIZ
  const rMatLegHead = wsMatriz.getRow(matCurRow);
  rMatLegHead.height = 24;
  wsMatriz.mergeCells(`A${matCurRow}:Q${matCurRow}`);
  const cMatLegHead = wsMatriz.getCell(`A${matCurRow}`);
  cMatLegHead.value = 'GUIA DIDÁTICO E LEGENDA EXPLICATIVA DAS 17 COLUNAS';
  cMatLegHead.fill = fl(C.dark);
  cMatLegHead.font = fn(true, 11, C.white);
  cMatLegHead.alignment = al('center', 'middle');
  matCurRow++;

  const columnGuideRows = [
    { num: 'Col 1', name: 'Nome da Ação', stage: 'Setup', desc: 'Identificação da peça publicitária, produto ou tema e data de veiculação.', import: 'Permite comparar quais produtos e ofertas geraram maior interesse no público.' },
    { num: 'Col 2', name: 'Formato', stage: 'Mídia', desc: 'Tipo de mídia exibida: Panfleto Virtual, Post, Carrossel ou Vídeo Reels.', import: 'Define o comportamento do algoritmo (Reels retém atenção; Panfleto gera impacto visual).' },
    { num: 'Col 3', name: 'Validade', stage: 'Tempo', desc: 'Janela de dias em que o anúncio esteve ativo na praça.', import: 'Garante senso de urgência e evita verba em ofertas já expiradas na loja física.' },
    { num: 'Col 4', name: 'Investimento', stage: 'Financeiro', desc: 'Orçamento inicialmente planejado e programado para a ação.', import: 'Referência financeira para controle do teto de gastos aprovado pelo cliente.' },
    { num: 'Col 5', name: 'Valor Gasto', stage: 'Financeiro', desc: 'Valor real faturado e consumido pelo leilão de anúncios da Meta.', import: 'É o valor oficial utilizado para todos os cálculos de custo unitário.' },
    { num: 'Col 6', name: 'Alcance', stage: 'Topo Funil', desc: 'Número de pessoas/contas únicas que visualizaram o anúncio no feed ou stories.', import: 'Mede o tamanho do público impactado na cidade. Em ações de alcance, não duplica.' },
    { num: 'Col 7', name: 'Engajamento', stage: 'Meio Funil', desc: 'Interações com o anúncio: curtidas, comentários, compartilhamentos e salvamentos.', import: 'Mostra o interesse genuíno das pessoas na oferta antes de tomarem a decisão de compra.' },
    { num: 'Col 8', name: 'Cliques Link', stage: 'Fundo Funil', desc: 'Cliques no botão do anúncio que levaram a destinos externos (site, encarte, WhatsApp).', import: 'Tráfego qualificado de pessoas que deram o próximo passo em direção à compra.' },
    { num: 'Col 9', name: 'Visualização ThruPlay', stage: 'Meio Funil', desc: 'Vídeos assistidos por pelo menos 15 segundos ou até o final.', import: 'Avalia a retenção audiovisual real em vídeos e Reels sem visualizações acidentais.' },
    { num: 'Col 10', name: 'Custo / 1.000 (CPM)', stage: 'Custo Topo', desc: 'Quanto custou para impactar 1.000 pessoas na cidade.', import: 'Métrica de eficiência de entrega: quanto menor o CPM, mais pessoas conhecem a marca.' },
    { num: 'Col 11', name: 'Custo / Clique (CPC)', stage: 'Custo Fundo', desc: 'Custo médio pago por cada visitante direcionado ao link da ação.', import: 'Indica se a oferta foi atraente o suficiente para tirar o usuário do feed.' },
    { num: 'Col 12', name: 'Custo / ThruPlay', stage: 'Custo Vídeo', desc: 'Custo médio por cada visualização de vídeo retida por 15 segundos ou mais.', import: 'Permite medir se o roteiro e edição do Reels conseguiram reter atenção a custo baixo.' },
    { num: 'Col 13', name: 'Custo / Interação', stage: 'Custo Meio', desc: 'Custo médio de cada curtida, compartilhamento ou comentário.', import: 'Avalia a viralidade e a aceitação comunitária das publicações.' },
    { num: 'Col 14', name: 'Custo / Conversa', stage: 'Custo Lead', desc: 'Custo médio por cada mensagem direta iniciada no WhatsApp da empresa.', import: 'Métrica de ouro para vendas: quanto custou colocar um cliente interessado no balcão digital.' },
    { num: 'Col 15', name: 'Filtro', stage: 'Geografia', desc: 'Segmentação aplicada no público (ex: Raio 5km, idade de 18 a 65 anos).', import: 'Garante que o anúncio seja entregue exatamente para quem pode comprar na loja.' },
    { num: 'Col 16', name: 'Cidade', stage: 'Geografia', desc: 'Município de veiculação e foco geográfico da entrega comercial.', import: 'Fundamental para redes de varejo com múltiplas filiais e foco municipal.' },
    { num: 'Col 17', name: 'Conversas Iniciadas', stage: 'Fundo Funil', desc: 'Volume absoluto de pessoas que clicaram e abriram um chat no WhatsApp.', import: 'Representa leads de alta intenção comercial gerados diretamente pelos anúncios.' }
  ];

  columnGuideRows.forEach((item) => {
    const row = wsMatriz.addRow([
      item.num,
      item.name,
      item.stage,
      item.desc,
      '', '', '', '',
      item.import,
      '', '', '', '', '', '', '', ''
    ]);
    row.height = 22;
    wsMatriz.mergeCells(`D${row.number}:H${row.number}`);
    wsMatriz.mergeCells(`I${row.number}:Q${row.number}`);

    for (let ci = 1; ci <= 17; ci++) {
      const cell = row.getCell(ci);
      cell.fill = fl(C.white);
      cell.font = fn(false, 9, C.dark);
      cell.border = bAll;
    }

    row.getCell(1).font = fn(true, 9, C.black);
    row.getCell(2).font = fn(true, 9.5, C.slate);
    row.getCell(3).font = fn(true, 8.5, C.orange);
    row.getCell(3).alignment = al('center', 'middle');
    matCurRow++;
  });

  // Salvar buffer e disparar download do arquivo .xlsx
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameParts = [
    'Relatório de Impulsionamento',
    meta.cliente || 'Cliente',
    meta.mes || '',
    meta.ano || ''
  ]
    .filter(Boolean)
    .join(' - ');
  a.download = `${fileNameParts}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
