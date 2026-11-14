import { CampaignRow, CapaData, ReportMeta } from '../types';
import { OBJ_LABELS } from './metaAdsParser';
import { COLUMNS_17_GUIDE } from './columnsGuide';
import { clearAccessToken } from './googleWorkspaceAuth';

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Sua sessão do Google expirou. Faça login novamente para continuar.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheets: SheetTabInfo[];
}

export interface ExportToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  tabTitle?: string;
}

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Raw spreadsheet IDs are typically alphanumeric + hyphens/underscores, 20+ chars
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

async function googleFetch(url: string, accessToken: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    clearAccessToken();
    throw new GoogleAuthExpiredError();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `Erro na API do Google (${res.status}).`;
    throw new Error(apiMsg);
  }

  return data;
}

export async function listDriveSpreadsheets(
  accessToken: string,
  searchQuery?: string
): Promise<DriveSpreadsheetFile[]> {
  const qParts = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    'trashed=false',
  ];

  const cleanQuery = (searchQuery || '').trim();
  if (cleanQuery) {
    const escaped = cleanQuery.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }

  const params = new URLSearchParams({
    q: qParts.join(' and '),
    fields: 'files(id,name,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '25',
  });

  const data = await googleFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );

  return Array.isArray(data?.files) ? data.files : [];
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const fields = 'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index,gridProperties)';
  const data = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(fields)}`,
    accessToken
  );

  const sheets: SheetTabInfo[] = Array.isArray(data?.sheets)
    ? data.sheets.map((s: any) => ({
        sheetId: Number(s?.properties?.sheetId ?? 0),
        title: String(s?.properties?.title ?? ''),
        index: Number(s?.properties?.index ?? 0),
        rowCount: s?.properties?.gridProperties?.rowCount,
        columnCount: s?.properties?.gridProperties?.columnCount,
      }))
    : [];

  return {
    spreadsheetId: String(data?.spreadsheetId || spreadsheetId),
    spreadsheetUrl: String(
      data?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    ),
    title: String(data?.properties?.title || 'Planilha sem título'),
    sheets,
  };
}

export async function readSheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<any[][]> {
  const range = quoteSheetTitle(sheetTitle);
  const data = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    accessToken
  );

  return Array.isArray(data?.values) ? data.values : [];
}

function buildSummaryTabRows(
  meta: ReportMeta,
  campaigns: CampaignRow[],
  capa: CapaData
): (string | number)[][] {
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalImpr = campaigns.reduce((acc, c) => acc + (c.impr || 0), 0) || Math.round(totalReach * 1.55);

  const avgFrequency = totalReach > 0 ? totalImpr / totalReach : 1;
  const avgCostPerConv = totalConv > 0 ? totalSpent / totalConv : 0;
  const avgCPM = totalReach > 0 ? (totalSpent / totalReach) * 1000 : 0;
  const avgCPC = totalLinks > 0 ? totalSpent / totalLinks : 0;
  const avgCostPerView = totalViews > 0 ? totalSpent / totalViews : 0;
  const avgCTR = totalImpr > 0 ? (totalLinks / totalImpr) * 100 : 0;

  const hasSocialData = [...Object.values(capa.fb || {}), ...Object.values(capa.ig || {})].some(
    (v) => String(v || '').trim().length > 0
  );

  const rows: (string | number)[][] = [
    [`RELATÓRIO MENSAL DE IMPULSIONAMENTO • ${(meta.cliente || 'CLIENTE').toUpperCase()}`],
    [`Período: ${meta.mes || ''} ${meta.ano || ''} | Base oficial Meta Ads`],
    [],
    ['1. PRINCIPAIS INDICADORES DE PERFORMANCE CONSOLIDADOS (KPIS)'],
    ['Indicador', 'Valor', 'Detalhe'],
    ['Valor Investido', Number(totalSpent.toFixed(2)), `Orçado: R$ ${totalBudget.toFixed(2)}`],
    ['Alcance Total', totalReach, 'Contas únicas atingidas'],
    ['Impressões Totais', totalImpr, `Frequência média: ${avgFrequency.toFixed(2)}x`],
    ['Conversas WhatsApp', totalConv, avgCostPerConv > 0 ? `Custo por conversa: R$ ${avgCostPerConv.toFixed(2)}` : 'Contatos diretos iniciados'],
    ['Visualizações Vídeo (ThruPlay)', totalViews, avgCostPerView > 0 ? `Custo por view: R$ ${avgCostPerView.toFixed(4)}` : 'Vídeos assistidos 15s+'],
    ['Cliques no Link', totalLinks, `CTR Médio: ${avgCTR.toFixed(2)}% | CPC: R$ ${avgCPC.toFixed(2)}`],
    ['Custo por 1.000 Contas (CPM)', Number(avgCPM.toFixed(2)), 'Eficiência geral de entrega'],
    ['Ações Veiculadas', campaigns.length, 'Campanhas analisadas no período'],
    [],
    ['2. ANÚNCIOS E CAMPANHAS EM DESTAQUE'],
    [
      'Nome da Ação / Anúncio',
      'Formato',
      'Objetivo Estratégico',
      'Validade',
      'Valor Gasto',
      'Alcance',
      'Resultado Chave',
      'Custo Unitário',
      'Filtro',
      'Cidade',
    ],
  ];

  campaigns.forEach((c) => {
    let mainResult = '—';
    let mainCost: number | string = '—';
    if (c.conv > 0) {
      mainResult = `${c.conv} conversas`;
      mainCost = Number(c.cConv.toFixed(2));
    } else if (c.views > 0) {
      mainResult = `${c.views} views`;
      mainCost = Number(c.cThru.toFixed(4));
    } else if (c.links > 0) {
      mainResult = `${c.links} cliques`;
      mainCost = Number(c.cpc.toFixed(2));
    } else if (c.reach > 0) {
      mainResult = `${c.reach} pessoas`;
      mainCost = Number(c.cpm.toFixed(2));
    }

    rows.push([
      c.displayName || c.name,
      c.format || '—',
      OBJ_LABELS[c.objective] || c.objective,
      c.validity || '—',
      Number((c.spent || 0).toFixed(2)),
      c.reach || 0,
      mainResult,
      mainCost,
      c.filtro || '—',
      c.cidade || '—',
    ]);
  });

  rows.push([
    `TOTAL CONSOLIDADO (${campaigns.length} AÇÕES)`,
    '',
    '',
    '',
    Number(totalSpent.toFixed(2)),
    totalReach,
    totalConv > 0 ? `${totalConv} conversas` : `${totalReach} alcance`,
    avgCostPerConv > 0 ? Number(avgCostPerConv.toFixed(2)) : Number(avgCPM.toFixed(2)),
    '',
    '',
  ]);

  if (hasSocialData) {
    rows.push([]);
    rows.push(['3. BASE DE AUDIÊNCIA SOCIAL (ORGÂNICA)']);
    rows.push(['Métrica', 'Instagram Business', 'Facebook Page']);
    rows.push(['Seguidores Atuais', capa.ig.seguidores || '—', capa.fb.seguidores || '—']);
    rows.push(['Seguidores Mês Anterior', capa.ig.segAnterior || '—', capa.fb.segAnterior || '—']);
    rows.push(['Contas Alcançadas', capa.ig.alcancadas || '—', capa.fb.alcancadas || '—']);
    rows.push(['Visitas ao Perfil / Página', capa.ig.visitas || '—', capa.fb.visitas || '—']);
    rows.push(['Faixa Etária Principal', capa.ig.faixa || '—', capa.fb.faixa || '—']);
    rows.push([
      'Divisão de Gênero',
      `${capa.ig.mulheres || '—'} Mulheres / ${capa.ig.homens || '—'} Homens`,
      `${capa.fb.mulheres || '—'} Mulheres / ${capa.fb.homens || '—'} Homens`,
    ]);
  }

  return rows;
}

function buildPlanilhaCustosRows(
  meta: ReportMeta,
  campaigns: CampaignRow[]
): { rows: (string | number)[][]; headerRowIndex: number; totalRowIndex: number } {
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);

  const rows: (string | number)[][] = [
    [`PLANILHA DE CUSTOS UNIFICADA (17 COLUNAS) • ${(meta.cliente || 'CLIENTE').toUpperCase()} (${meta.mes || ''} ${meta.ano || ''})`],
    [
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
      'CONVERSAS INICIADAS',
    ],
  ];

  const headerRowIndex = 1;

  campaigns.forEach((r) => {
    const o = r.objective;
    const isReelsXl = /^Reels/i.test(o);
    const isAlcanceRow = o === 'Alc';
    const isDuplicateReach = isAlcanceRow && r.reach > 0 && r.eng === r.reach;

    rows.push([
      r.displayName || r.name,
      r.format || '-',
      r.validity || '-',
      r.budget > 0 ? Number(r.budget.toFixed(2)) : '-',
      r.spent > 0 ? Number(r.spent.toFixed(2)) : '-',
      r.reach > 0 ? r.reach : '-',
      isDuplicateReach ? '-' : r.eng > 0 ? r.eng : '-',
      r.links > 0 ? r.links : '-',
      isReelsXl && r.views > 0 ? r.views : '-',
      isAlcanceRow && r.cpm > 0 ? Number(r.cpm.toFixed(2)) : '-',
      r.cpc > 0 ? Number(r.cpc.toFixed(2)) : '-',
      isReelsXl && r.cThru > 0 ? Number(r.cThru.toFixed(4)) : '-',
      r.cInt > 0 ? Number(r.cInt.toFixed(2)) : '-',
      r.cConv > 0 ? Number(r.cConv.toFixed(2)) : '-',
      r.filtro || '-',
      r.cidade || '-',
      r.conv > 0 ? r.conv : '-',
    ]);
  });

  const totalRowIndex = rows.length;
  rows.push([
    'TOTAL GERAL CONSOLIDADO',
    `${campaigns.length} campanhas`,
    '-',
    totalBudget > 0 ? Number(totalBudget.toFixed(2)) : '-',
    totalSpent > 0 ? Number(totalSpent.toFixed(2)) : '-',
    totalReach > 0 ? totalReach : '-',
    totalInt > 0 ? totalInt : '-',
    totalLinks > 0 ? totalLinks : '-',
    totalViews > 0 ? totalViews : '-',
    totalReach > 0 && totalSpent > 0 ? Number(((totalSpent / totalReach) * 1000).toFixed(2)) : '-',
    totalLinks > 0 && totalSpent > 0 ? Number((totalSpent / totalLinks).toFixed(2)) : '-',
    totalViews > 0 && totalSpent > 0 ? Number((totalSpent / totalViews).toFixed(4)) : '-',
    totalInt > 0 && totalSpent > 0 ? Number((totalSpent / totalInt).toFixed(2)) : '-',
    totalConv > 0 && totalSpent > 0 ? Number((totalSpent / totalConv).toFixed(2)) : '-',
    '-',
    '-',
    totalConv > 0 ? totalConv : '-',
  ]);

  rows.push([]);
  rows.push(['GUIA DIDÁTICO E LEGENDA EXPLICATIVA DAS 17 COLUNAS']);
  rows.push(['Coluna', 'Nome da Coluna', 'Etapa do Funil', 'Descrição', 'Importância Estratégica']);
  COLUMNS_17_GUIDE.forEach((g) => {
    rows.push([`Col ${g.num}`, g.name, g.stage, g.meaning, g.importance]);
  });

  return { rows, headerRowIndex, totalRowIndex };
}

function buildPlanilhaCustosFormattingRequests(
  sheetId: number,
  headerRowIndex: number,
  totalRowIndex: number
): any[] {
  const requests: any[] = [
    // Freeze top 2 rows
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: headerRowIndex + 1 },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    // Banner row 0
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
        mergeType: 'MERGE_ALL',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.96, green: 0.62, blue: 0.04 },
            textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 0.08, green: 0.09, blue: 0.1 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    },
    // Header row (17 columns)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: headerRowIndex, endRowIndex: headerRowIndex + 1, startColumnIndex: 0, endColumnIndex: 17 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 },
            textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
      },
    },
    // Total row highlight
    {
      repeatCell: {
        range: { sheetId, startRowIndex: totalRowIndex, endRowIndex: totalRowIndex + 1, startColumnIndex: 0, endColumnIndex: 17 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 0.93, blue: 0.84 },
            textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.08, green: 0.09, blue: 0.1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Currency format on columns D, E (3..4) and J..N (9..13)
    ...[3, 4, 9, 10, 11, 12, 13].map((colIdx) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: headerRowIndex + 1, endRowIndex: totalRowIndex + 1, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '"R$ "#,##0.00' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })),
    // Integer format on columns F..I (5..8) and Q (16)
    ...[5, 6, 7, 8, 16].map((colIdx) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: headerRowIndex + 1, endRowIndex: totalRowIndex + 1, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })),
    // Auto-resize columns
    {
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 17 },
      },
    },
  ];

  return requests;
}

export async function createFormattedReportSpreadsheet(
  accessToken: string,
  spreadsheetTitle: string,
  meta: ReportMeta,
  campaigns: CampaignRow[],
  capa: CapaData
): Promise<ExportToSheetsResult> {
  const created = await googleFetch('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: spreadsheetTitle,
        locale: 'pt_BR',
      },
      sheets: [
        { properties: { title: 'Resumo do Relatório', index: 0 } },
        { properties: { title: 'Planilha de Custos', index: 1 } },
      ],
    }),
  });

  const spreadsheetId = String(created.spreadsheetId);
  const spreadsheetUrl = String(
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  );

  const summarySheetId = Number(created.sheets?.[0]?.properties?.sheetId ?? 0);
  const costsSheetId = Number(created.sheets?.[1]?.properties?.sheetId ?? 1);

  const summaryRows = buildSummaryTabRows(meta, campaigns, capa);
  const { rows: costsRows, headerRowIndex, totalRowIndex } = buildPlanilhaCustosRows(meta, campaigns);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${quoteSheetTitle('Resumo do Relatório')}!A1`,
            values: summaryRows,
          },
          {
            range: `${quoteSheetTitle('Planilha de Custos')}!A1`,
            values: costsRows,
          },
        ],
      }),
    }
  );

  const formatRequests = [
    // Banner row on Resumo do Relatório
    {
      mergeCells: {
        range: { sheetId: summarySheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
        mergeType: 'MERGE_ALL',
      },
    },
    {
      repeatCell: {
        range: { sheetId: summarySheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.09, blue: 0.1 },
            textFormat: { bold: true, fontSize: 13, foregroundColor: { red: 0.98, green: 0.75, blue: 0.14 } },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: summarySheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.16, green: 0.17, blue: 0.2 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: summarySheetId, startRowIndex: 15, endRowIndex: 16, startColumnIndex: 0, endColumnIndex: 10 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.16, green: 0.17, blue: 0.2 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      autoResizeDimensions: {
        dimensions: { sheetId: summarySheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 },
      },
    },
    ...buildPlanilhaCustosFormattingRequests(costsSheetId, headerRowIndex, totalRowIndex),
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests: formatRequests }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: spreadsheetTitle,
    tabTitle: 'Resumo do Relatório + Planilha de Custos',
  };
}

export async function updateExistingSpreadsheetTab(
  accessToken: string,
  spreadsheetId: string,
  targetTabTitle: string,
  createNewTab: boolean,
  existingSheetId: number | undefined,
  meta: ReportMeta,
  campaigns: CampaignRow[]
): Promise<ExportToSheetsResult> {
  const metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  let targetSheetId = existingSheetId;

  if (createNewTab) {
    const addRes = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: targetTabTitle },
              },
            },
          ],
        }),
      }
    );
    targetSheetId = Number(addRes?.replies?.[0]?.addSheet?.properties?.sheetId);
  } else {
    // Clear existing content before overwriting
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(quoteSheetTitle(targetTabTitle))}:clear`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
    if (targetSheetId === undefined) {
      const matched = metadata.sheets.find((s) => s.title === targetTabTitle);
      targetSheetId = matched?.sheetId;
    }
  }

  const { rows: costsRows, headerRowIndex, totalRowIndex } = buildPlanilhaCustosRows(meta, campaigns);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quoteSheetTitle(targetTabTitle)}!A1`)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${quoteSheetTitle(targetTabTitle)}!A1`,
        majorDimension: 'ROWS',
        values: costsRows,
      }),
    }
  );

  if (typeof targetSheetId === 'number' && !Number.isNaN(targetSheetId)) {
    const requests = buildPlanilhaCustosFormattingRequests(targetSheetId, headerRowIndex, totalRowIndex);
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl: metadata.spreadsheetUrl,
    title: metadata.title,
    tabTitle: targetTabTitle,
  };
}
