import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  Table as TableIcon,
  Eye,
  X
} from 'lucide-react';
import {
  CampaignRow,
  CapaData,
  ReportMeta
} from '../types';
import { ReporteiPresentationView } from './ReporteiPresentationView';
import { UnifiedTraditionalTable } from './UnifiedTraditionalTable';
import { SimpleFunctionalPdfReport } from './SimpleFunctionalPdfReport';

interface StepReportProps {
  meta: ReportMeta;
  campaigns: CampaignRow[];
  capa: CapaData;
  batchFiltro?: string;
  batchCidade?: string;
  onChangeBatchFiltro?: (value: string) => void;
  onChangeBatchCidade?: (value: string) => void;
  initialTab?: 'reportei' | 'table';
  onExportExcel: () => void;
  isExportingExcel: boolean;
  onExportGoogleSheets?: () => void;
  onBackToCapa: () => void;
  onUpdateFiltro?: (campaignId: string, newFiltro: string) => void;
  onUpdateCidade?: (campaignId: string, newCidade: string) => void;
  onBatchUpdateFiltroCidade?: (filtro: string, cidade: string) => void;
  isPresentationMode?: boolean;
  isClientLocked?: boolean;
  onTogglePresentationMode?: () => void;
  onCreateClientLink?: (preferredTab: 'reportei' | 'table') => Promise<string>;
}

export const StepReport: React.FC<StepReportProps> = ({
  meta,
  campaigns,
  capa,
  batchFiltro,
  batchCidade,
  onChangeBatchFiltro,
  onChangeBatchCidade,
  initialTab = 'reportei',
  onExportExcel,
  isExportingExcel,
  onExportGoogleSheets,
  onUpdateFiltro,
  onUpdateCidade,
  onBatchUpdateFiltroCidade,
  isPresentationMode = false,
  isClientLocked = false,
  onTogglePresentationMode,
  onCreateClientLink,
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (initialTab === 'table') {
      const el = document.getElementById('planilha-custos-tabela');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    }
  }, [initialTab]);

  const isReadOnlyView = isPresentationMode || isClientLocked;

  // Grand totals
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.reach || 0), 0);
  const totalViews = campaigns.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalConv = campaigns.reduce((acc, c) => acc + (c.conv || 0), 0);
  const totalLinks = campaigns.reduce((acc, c) => acc + (c.links || 0), 0);
  const totalInt = campaigns.reduce((acc, c) => acc + (c.eng || 0), 0);

  // Formatting helpers
  const fmtBRL = (v: number) =>
    typeof v === 'number' && v > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
      : '-';

  const fmtNum = (v: number) =>
    typeof v === 'number' && v > 0
      ? new Intl.NumberFormat('pt-BR').format(v)
      : '-';

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Modal de Prévia do PDF Funcional */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
          <div className="bg-[#141518] border border-[#2b2d33] rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#0e0f12] border-b border-[#26282f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Prévia do Relatório PDF</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Modelo idêntico à apresentação online: KPIs, Gráfico de Verba, Destaques, Audiência Social, Planilha de 17 Colunas e Glossário
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPdfPreview(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-950/40 transition-all whitespace-nowrap shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  title="Fechar prévia"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#07080a]">
              <SimpleFunctionalPdfReport
                meta={meta}
                campaigns={campaigns}
                capa={capa}
              />
            </div>
          </div>
        </div>
      )}

      {/* Screen Interactive Workspace */}
      <div className="screen-only">
        {/* Top Banner & Action Controls (Somente no modo editor) */}
        {!isReadOnlyView && (
          <div className="bg-[#141518] border border-[#2b2d33] rounded-2xl p-6 mb-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs text-neutral-400">
                <span className="font-bold text-amber-400">Passo 4 de 4</span>
                <span aria-hidden="true">·</span>
                <span>Relatório Mensal</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {meta.cliente || 'Relatório de Impulsionamento'}{' '}
                <span className="text-neutral-400 font-normal text-lg">
                  ({meta.mes} {meta.ano})
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Total Gasto: <strong className="text-white font-mono tabular-nums">{fmtBRL(totalSpent)}</strong> •{' '}
                Alcance Total: <strong className="text-white font-mono tabular-nums">{fmtNum(totalReach)}</strong> contas •{' '}
                Conversas WhatsApp: <strong className="text-emerald-400 font-mono tabular-nums">{totalConv}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Excel Export Button */}
              <button
                type="button"
                onClick={onExportExcel}
                disabled={isExportingExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingExcel ? 'Gerando Planilha...' : 'Baixar Excel (.xlsx)'}</span>
              </button>

              {/* Google Sheets Export Button */}
              {onExportGoogleSheets && (
                <button
                  type="button"
                  onClick={onExportGoogleSheets}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  title="Enviar este relatório diretamente para o Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Exportar Google Sheets</span>
                </button>
              )}

              {/* Client Presentation Mode Toggle */}
              {onTogglePresentationMode && (
                <button
                  type="button"
                  onClick={onTogglePresentationMode}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  title="Alternar para o Modo Apresentação Limpa para o Cliente"
                >
                  <span>{isPresentationMode ? 'Sair da Apresentação' : 'Ver como Cliente (Apresentação)'}</span>
                </button>
              )}

              {/* Prévia do Relatório PDF */}
              <button
                type="button"
                onClick={() => setShowPdfPreview(true)}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-amber-400/50 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap shrink-0"
                title="Visualizar modelo do PDF antes de imprimir ou baixar"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Prévia do PDF</span>
              </button>

              {/* Dedicated PDF Download Button */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-950/40 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                title="Baixar ou Imprimir o Relatório em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Baixar / Imprimir PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Unified Page Header Bar (Relatório Mensal) */}
        <div className="flex items-center justify-between gap-3 mb-6 border-b border-[#2b2d33] pb-3 overflow-x-auto no-print">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-amber-500 text-neutral-950 shadow-md font-extrabold whitespace-nowrap shrink-0">
              <Sparkles className="w-4 h-4 text-neutral-950" />
              <span>Relatório Mensal</span>
            </div>
          </div>

          <a
            href="#planilha-custos-tabela"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-amber-300 bg-[#141518] hover:bg-neutral-800 border border-[#2b2d33] hover:border-amber-500/40 transition-all whitespace-nowrap shrink-0"
            title="Ir para a seção da Planilha de Custos logo abaixo"
          >
            <TableIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Ir para Planilha de Custos</span>
          </a>
        </div>

        {/* CONTEÚDO UNIFICADO: RELATÓRIO MENSAL (VISÃO PRINCIPAL + PLANILHA DE CUSTOS LOGO ABAIXO) */}
        <div className="space-y-8">
          <ReporteiPresentationView
            meta={meta}
            campaigns={campaigns}
            capa={capa}
            onExportExcel={onExportExcel}
            isExportingExcel={isExportingExcel}
            onExportGoogleSheets={isClientLocked ? undefined : onExportGoogleSheets}
            isPresentationMode={isPresentationMode}
            isClientLocked={isClientLocked}
            onTogglePresentationMode={isClientLocked ? undefined : onTogglePresentationMode}
            onCreateClientLink={onCreateClientLink ? () => onCreateClientLink('reportei') : undefined}
          />

          <UnifiedTraditionalTable
            campaigns={campaigns}
            meta={meta}
            capa={capa}
            batchFiltro={batchFiltro}
            batchCidade={batchCidade}
            onChangeBatchFiltro={onChangeBatchFiltro}
            onChangeBatchCidade={onChangeBatchCidade}
            hideHeader={true}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            totalReach={totalReach}
            totalInt={totalInt}
            totalLinks={totalLinks}
            totalViews={totalViews}
            totalConv={totalConv}
            isReadOnly={isReadOnlyView}
            isClientLocked={isClientLocked}
            onExportExcel={onExportExcel}
            isExportingExcel={isExportingExcel}
            isPresentationMode={isPresentationMode}
            onTogglePresentationMode={isClientLocked ? undefined : onTogglePresentationMode}
            onCreateClientLink={onCreateClientLink ? () => onCreateClientLink('reportei') : undefined}
            onUpdateFiltro={isReadOnlyView ? undefined : onUpdateFiltro}
            onUpdateCidade={isReadOnlyView ? undefined : onUpdateCidade}
            onBatchUpdateFiltroCidade={isReadOnlyView ? undefined : onBatchUpdateFiltroCidade}
          />
        </div>
      </div>

      {/* Relatório PDF Oficial (Renderizado exclusivamente durante a impressão / PDF) */}
      <div className="print-only">
        <SimpleFunctionalPdfReport
          meta={meta}
          campaigns={campaigns}
          capa={capa}
        />
      </div>
    </div>
  );
};
