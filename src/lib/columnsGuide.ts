import { CampaignRow } from '../types';

export interface ColumnInfo {
  num: number;
  name: string;
  short: string;
  category: 'setup' | 'financeiro' | 'topo' | 'meio' | 'fundo' | 'geo';
  stage: string;
  stageColor: string;
  badge: string;
  meaning: string;
  importance: string;
  formula?: string;
  tip: string;
  idealFor: string;
}

export const COLUMNS_17_GUIDE: ColumnInfo[] = [
  {
    num: 1,
    name: 'Nome da Ação',
    short: 'Nome da Ação',
    category: 'setup',
    stage: 'Identificação & Setup',
    stageColor: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    badge: 'Controle Criativo',
    meaning: 'Identificação da peça publicitária, produto ou tema anunciado e a data de veiculação na Meta.',
    importance: 'Permite rastrear o histórico de cada encarte, promoção ou oferta temática. É a base para comparar quais produtos atraem mais atenção do público da sua cidade.',
    tip: 'Mantenha um padrão claro no nome (ex: "2026-10-15 - Panfleto Hortifruti").',
    idealFor: 'Organização e auditoria de anúncios'
  },
  {
    num: 2,
    name: 'Formato',
    short: 'Formato',
    category: 'setup',
    stage: 'Tipo de Mídia',
    stageColor: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    badge: 'Mídia Visual',
    meaning: 'O tipo de formato criativo exibido (Panfleto Virtual, Post Estático, Carrossel de Ofertas, Vídeo / Reels).',
    importance: 'Cada formato se comporta de forma única no algoritmo da Meta: Reels retêm a atenção por mais tempo, Carrosséis incentivam folhear produtos e Panfletos geram impacto visual rápido no feed.',
    tip: 'Alterne formatos conforme a oferta: encartes com muitos itens pedem Carrossel; pratos e receitas pedem Reels.',
    idealFor: 'Estratégia de conteúdo e criativos'
  },
  {
    num: 3,
    name: 'Validade',
    short: 'Validade',
    category: 'setup',
    stage: 'Janela de Tempo',
    stageColor: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    badge: 'Tempo de Campanha',
    meaning: 'Janela de dias em que o anúncio esteve ativo (data inicial até a data final de entrega).',
    importance: 'Fundamental para ofertas pontuais (ex: encartes de quinta a domingo). Garante que a empresa não gaste verba veiculando promoções cujos preços já expiraram na loja física.',
    tip: 'Ofertas com prazo curto geram senso de urgência ("só até domingo").',
    idealFor: 'Controle de promoções semanais'
  },
  {
    num: 4,
    name: 'Investimento',
    short: 'Investimento',
    category: 'financeiro',
    stage: 'Orçamento Programado',
    stageColor: 'text-amber-400 bg-amber-950/50 border-amber-800/40',
    badge: 'Budget Aprovado',
    meaning: 'Verba orçada e programada no plano de mídia mensal para aquela ação específica.',
    importance: 'Garante que o planejamento financeiro seja cumprido rigorosamente, sem estourar o orçamento total aprovado pelo cliente para o mês.',
    tip: 'Serve de parâmetro para saber se a Meta conseguiu entregar todo o valor previsto.',
    idealFor: 'Planejamento e governança de verba'
  },
  {
    num: 5,
    name: 'Valor Gasto',
    short: 'Valor Gasto',
    category: 'financeiro',
    stage: 'Financeiro Efetivo',
    stageColor: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
    badge: 'Consumo Real Meta',
    meaning: 'Montante que a Meta Ads efetivamente consumiu e faturou na entrega do anúncio.',
    importance: 'É o valor financeiro real investido. Serve de denominador oficial para calcular o retorno sobre o investimento (ROI) e todos os custos unitários (CPM, CPC, Custo por Conversa).',
    formula: 'Total faturado pela Meta no ciclo da campanha',
    tip: 'Deve fechar o mais próximo possível do Investimento programado.',
    idealFor: 'Auditoria de gastos e cálculo de CAC/ROI'
  },
  {
    num: 6,
    name: 'Alcance',
    short: 'Alcance',
    category: 'topo',
    stage: 'Topo de Funil (Consciência)',
    stageColor: 'text-blue-400 bg-blue-950/60 border-blue-700/60',
    badge: 'Pessoas Únicas',
    meaning: 'Número total de pessoas físicas distintas (contas únicas no Instagram/Facebook) que viram o anúncio pelo menos 1 vez.',
    importance: 'Mede a amplitude da marca na cidade. Ao contrário das impressões (que contam repetições na mesma pessoa), o Alcance mede quantas pessoas reais foram informadas sobre sua loja ou promoção.',
    tip: 'Sem alcance forte no Topo do Funil, o restante das campanhas fica sem público para converter.',
    idealFor: 'Construção de marca e reconhecimento local'
  },
  {
    num: 7,
    name: 'Engajamento',
    short: 'Engajamento',
    category: 'meio',
    stage: 'Meio de Funil (Interesse)',
    stageColor: 'text-sky-400 bg-sky-950/60 border-sky-700/60',
    badge: 'Interações Ativas',
    meaning: 'Total de interações com o post: curtidas, reações, comentários, salvamentos e compartilhamentos com amigos.',
    importance: 'Mede o nível de conexão e receptividade da comunidade. Publicações com alto engajamento geram prova social forte e sinalizam à Meta que o criativo tem qualidade, o que barateia os custos de entrega.',
    tip: 'Em campanhas exclusivas de alcance, não duplica o valor do alcance para manter os dados fiéis.',
    idealFor: 'Prova social, reciprocidade e aquecimento'
  },
  {
    num: 8,
    name: 'Cliques no Link',
    short: 'Cliques Link',
    category: 'meio',
    stage: 'Meio de Funil (Tráfego)',
    stageColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/60',
    badge: 'Tráfego Externo',
    meaning: 'Quantidade de usuários que clicaram no botão para sair da rede social e acessar um endereço externo (site, encarte digital interativo, catálogo ou WhatsApp web).',
    importance: 'Mede o interesse qualificado em dar o próximo passo. O usuário que clica no link demonstrou intenção ativa de conhecer detalhes da oferta.',
    tip: 'Crucial para campanhas de encartes digitais interativos e lojas virtuais.',
    idealFor: 'Geração de tráfego e visualização de encarte'
  },
  {
    num: 9,
    name: 'Visualização (ThruPlay)',
    short: 'ThruPlay',
    category: 'meio',
    stage: 'Meio de Funil (Retenção)',
    stageColor: 'text-purple-400 bg-purple-950/60 border-purple-700/60',
    badge: 'Atenção Audiovisual',
    meaning: 'Vídeos ou Reels assistidos por pelo menos 15 segundos ou assistidos até o fim (caso o vídeo tenha menos de 15 segundos).',
    importance: 'É o padrão de excelência da Meta para vídeos. Descarta quem apenas rolou o feed sem prestar atenção e mede os espectadores reais que foram tocados pela mensagem ou receita da sua empresa.',
    tip: 'Pessoas que assistem 15s de um Reels têm propensão muito maior de se tornarem clientes fiéis.',
    idealFor: 'Reels, receitas, dicas e vídeos institucionais'
  },
  {
    num: 10,
    name: 'Custo por 1.000 Pessoas (CPM)',
    short: 'CPM',
    category: 'topo',
    stage: 'Eficiência de Topo',
    stageColor: 'text-blue-400 bg-blue-950/60 border-blue-700/60',
    badge: 'Custo de Propagação',
    meaning: 'Valor investido para fazer o anúncio alcançar 1.000 pessoas únicas na sua região geográfica.',
    importance: 'É o termômetro do leilão da Meta Ads. Indica se a entrega está barata ou cara. Um CPM baixo significa que a campanha está conseguindo espalhar a marca gastando muito pouco por pessoa.',
    formula: '(Valor Gasto ÷ Alcance) × 1.000',
    tip: 'No varejo alimentar e comércio local, manter o CPM entre R$ 3,00 e R$ 7,00 indica ótima eficiência.',
    idealFor: 'Avaliar o custo de entrega e escala'
  },
  {
    num: 11,
    name: 'Custo por Cliques Link (CPC)',
    short: 'CPC',
    category: 'meio',
    stage: 'Eficiência de Tráfego',
    stageColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/60',
    badge: 'Custo por Visitante',
    meaning: 'Preço médio pago para levar uma pessoa interessada da rede social até a página de destino da ação.',
    importance: 'Avalia a atratividade do anúncio e a força da chamada para ação (CTA). Se o CPC está baixo, significa que a oferta gerou alta curiosidade e o criativo foi certeiro.',
    formula: 'Valor Gasto ÷ Cliques no Link',
    tip: 'CPCs abaixo de R$ 0,50 no varejo são considerados excelentes.',
    idealFor: 'Otimização de páginas de destino e catálogos'
  },
  {
    num: 12,
    name: 'Custo por ThruPlay',
    short: 'Custo ThruPlay',
    category: 'meio',
    stage: 'Eficiência Audiovisual',
    stageColor: 'text-purple-400 bg-purple-950/60 border-purple-700/60',
    badge: 'Custo por Atenção',
    meaning: 'Valor pago por cada usuário que assistiu a 15 segundos ou ao vídeo completo do Reels.',
    importance: 'Mostra quanto custou prender a atenção de um cliente em potencial com conteúdo de vídeo. Custos de centavos (R$ 0,01 a R$ 0,03) tornam o Reels muito mais vantajoso que mídia tradicional.',
    formula: 'Valor Gasto ÷ Visualizações ThruPlay',
    tip: 'Se o Custo por ThruPlay estiver em R$ 0,01 ou R$ 0,02, o criativo teve excelente aceitação.',
    idealFor: 'Avaliar retorno de produção de vídeos e Reels'
  },
  {
    num: 13,
    name: 'Custo por Interação',
    short: 'Custo Interação',
    category: 'meio',
    stage: 'Eficiência de Envolvimento',
    stageColor: 'text-sky-400 bg-sky-950/60 border-sky-700/60',
    badge: 'Custo por Reação',
    meaning: 'Valor médio investido para gerar cada curtida, comentário, compartilhamento ou envolvimento geral.',
    importance: 'Permite comparar quais tipos de postagens (sorteios, dicas, novidades) mobilizam a comunidade com o menor custo de investimento.',
    formula: 'Valor Gasto ÷ Total de Engajamentos',
    tip: 'Útil para calibrar a linha editorial e saber o que mais desperta interesse no feed.',
    idealFor: 'Linha editorial e engajamento comunitário'
  },
  {
    num: 14,
    name: 'Custo por Conversa',
    short: 'Custo Conversa',
    category: 'fundo',
    stage: 'Eficiência de Vendas',
    stageColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60',
    badge: 'Custo de Aquisição (CAC)',
    meaning: 'Valor que precisou ser investido para fazer 1 novo cliente abrir um chat comercial no WhatsApp.',
    importance: 'Uma das métricas mais vitais do negócio. Diz quanto custa colocar um cliente pronto para comprar na mão dos seus vendedores ou atendentes.',
    formula: 'Valor Gasto ÷ Conversas Iniciadas',
    tip: 'Se a sua margem por cliente é boa, pagar R$ 1,00 a R$ 3,00 por conversa gera um retorno financeiro estrondoso.',
    idealFor: 'Geração de vendas, cotações e orçamentos'
  },
  {
    num: 15,
    name: 'Filtro',
    short: 'Filtro',
    category: 'setup',
    stage: 'Segmentação',
    stageColor: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    badge: 'Público-Alvo',
    meaning: 'Configurações de segmentação aplicadas na Meta: raio em quilômetros ao redor da loja, faixa etária, gênero e interesses.',
    importance: 'Protege a verba da empresa garantindo que os anúncios sejam vistos exclusivamente por pessoas com perfil e capacidade de comprar na loja.',
    tip: 'No varejo físico, o raio geográfico bem calibrado (ex: 3 km a 8 km) é a configuração que mais evita desperdício.',
    idealFor: 'Precisão e proteção orçamentária'
  },
  {
    num: 16,
    name: 'Cidade',
    short: 'Cidade',
    category: 'setup',
    stage: 'Geolocalização',
    stageColor: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    badge: 'Praça Comercial',
    meaning: 'Município, bairro ou região onde a veiculação dos anúncios foi concentrada.',
    importance: 'Garante que os clientes impactados estejam na área de atuação da loja física ou do serviço de delivery da empresa.',
    tip: 'Permite que empresas com múltiplas filiais comparem o desempenho entre cidades diferentes.',
    idealFor: 'Análise de praça e penetração territorial'
  },
  {
    num: 17,
    name: 'Conversas Iniciadas',
    short: 'Conversas Whats',
    category: 'fundo',
    stage: 'Fundo de Funil (Conversão)',
    stageColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60',
    badge: 'Leads & Vendas Reais',
    meaning: 'Total de clientes que clicaram no anúncio e enviaram uma mensagem inicial no WhatsApp da loja.',
    importance: 'É o objetivo final de conversão: reflete contatos comerciais diretos, pedidos de delivery, cotações e novas vendas geradas para a empresa.',
    tip: 'Fundo de Funil puro: esse resultado é maximizado quando a loja também investe em Alcance e Reels para aquecer o público.',
    idealFor: 'Vendas diretas, atendimento e novos clientes'
  }
];

const PDF_COLUMN_WEIGHTS: Record<number, number> = {
  1: 15,
  2: 5,
  3: 6,
  4: 5.5,
  5: 5.5,
  6: 5,
  7: 4.8,
  8: 4.8,
  9: 5,
  10: 5.2,
  11: 5,
  12: 5.2,
  13: 5,
  14: 5.4,
  15: 6.5,
  16: 6,
  17: 5.1,
};

export interface RowDisplayMetrics {
  engValue: number;
  linksValue: number;
  viewsValue: number;
  cpmValue: number;
  cpcValue: number;
  cThruValue: number;
  cIntValue: number;
  cConvValue: number;
  convValue: number;
}

export function getCampaignRowDisplayMetrics(r: CampaignRow): RowDisplayMetrics {
  const o = r.objective;
  const isReels = /^Reels/i.test(o);
  const isAlcanceOnly = o === 'Alc';
  const isDuplicateReach = r.reach > 0 && r.eng === r.reach;

  const showEngVal =
    !isAlcanceOnly &&
    !isDuplicateReach &&
    (o === 'Eng' ||
      o === 'EngLink' ||
      o === 'TrafLink' ||
      o === 'ReelsEng' ||
      o === 'ReelsEngLink' ||
      o === 'ReelsTrafLink' ||
      o === 'ReelsEngWhats' ||
      o === 'ReelsTrafWhats' ||
      r.eng > 0);
  const engValue = showEngVal ? r.eng || 0 : 0;

  const showLinksVal =
    o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.links > 0;
  const linksValue = showLinksVal ? r.links || 0 : 0;

  const showViewsVal = (isReels || r.views > 0) && r.views > 0;
  const viewsValue = showViewsVal ? r.views || 0 : 0;

  const showCpmVal = o === 'Alc' && r.cpm > 0;
  const cpmValue = showCpmVal ? r.cpm || 0 : 0;

  const showCpcVal =
    (o === 'EngLink' || o === 'TrafLink' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.links > 0) &&
    r.cpc > 0;
  const cpcValue = showCpcVal ? r.cpc || 0 : 0;

  const showCThruVal =
    (o === 'ReelsAlc' || o === 'ReelsEng' || o === 'ReelsEngLink' || o === 'ReelsTrafLink' || r.views > 0) &&
    r.cThru > 0;
  const cThruValue = showCThruVal ? r.cThru || 0 : 0;

  const showCIntVal =
    (o === 'Eng' || o === 'ReelsEng' || (!isAlcanceOnly && !isDuplicateReach && r.eng > 0)) && r.cInt > 0;
  const cIntValue = showCIntVal ? r.cInt || 0 : 0;

  const showConvMetric =
    o === 'EngWhats' || o === 'TrafWhats' || o === 'ReelsEngWhats' || o === 'ReelsTrafWhats' || r.conv > 0;
  const convValue = showConvMetric && r.conv > 0 ? r.conv || 0 : 0;
  const cConvValue = showConvMetric && r.cConv > 0 ? r.cConv : 0;

  return {
    engValue,
    linksValue,
    viewsValue,
    cpmValue,
    cpcValue,
    cThruValue,
    cIntValue,
    cConvValue,
    convValue,
  };
}

const hasFilledText = (val: string | undefined): boolean => {
  const s = (val || '').trim();
  return Boolean(s && s !== '-' && s !== '—');
};

export interface ActiveCostColumnsResult {
  activeColumns: ColumnInfo[];
  visibleSet: Set<number>;
  displayNumMap: Map<number, number>;
  allVisible: boolean;
  leadingColSpan: number;
  pdfWidths: Record<number, string>;
}

export function getActiveCostColumns(
  campaigns: CampaignRow[],
  omitEmpty: boolean
): ActiveCostColumnsResult {
  let activeColumns: ColumnInfo[];

  if (!omitEmpty || campaigns.length === 0) {
    activeColumns = COLUMNS_17_GUIDE;
  } else {
    const metricsList = campaigns.map(getCampaignRowDisplayMetrics);
    const hasCol: Record<number, boolean> = {
      1: campaigns.some((r) => hasFilledText(r.displayName || r.name)),
      2: campaigns.some((r) => hasFilledText(r.format)),
      3: campaigns.some((r) => hasFilledText(r.validity)),
      4: campaigns.some((r) => (r.budget || 0) > 0),
      5: campaigns.some((r) => (r.spent || 0) > 0),
      6: campaigns.some((r) => (r.reach || 0) > 0),
      7: metricsList.some((m) => m.engValue > 0),
      8: metricsList.some((m) => m.linksValue > 0),
      9: metricsList.some((m) => m.viewsValue > 0),
      10: metricsList.some((m) => m.cpmValue > 0),
      11: metricsList.some((m) => m.cpcValue > 0),
      12: metricsList.some((m) => m.cThruValue > 0),
      13: metricsList.some((m) => m.cIntValue > 0),
      14: metricsList.some((m) => m.cConvValue > 0),
      15: campaigns.some((r) => hasFilledText(r.filtro)),
      16: campaigns.some((r) => hasFilledText(r.cidade)),
      17: metricsList.some((m) => m.convValue > 0),
    };

    const filtered = COLUMNS_17_GUIDE.filter((col) => hasCol[col.num]);
    activeColumns = filtered.length > 0 ? filtered : COLUMNS_17_GUIDE;
  }

  const visibleSet = new Set(activeColumns.map((c) => c.num));
  const displayNumMap = new Map<number, number>();
  activeColumns.forEach((col, index) => {
    displayNumMap.set(col.num, omitEmpty ? index + 1 : col.num);
  });

  const leadingColSpan = [1, 2, 3].filter((num) => visibleSet.has(num)).length;
  const totalWeight = activeColumns.reduce((acc, col) => acc + (PDF_COLUMN_WEIGHTS[col.num] || 5), 0) || 100;
  const pdfWidths: Record<number, string> = {};
  activeColumns.forEach((col) => {
    pdfWidths[col.num] = `${(((PDF_COLUMN_WEIGHTS[col.num] || 5) / totalWeight) * 100).toFixed(2)}%`;
  });

  return {
    activeColumns,
    visibleSet,
    displayNumMap,
    allVisible: activeColumns.length === COLUMNS_17_GUIDE.length,
    leadingColSpan,
    pdfWidths,
  };
}

