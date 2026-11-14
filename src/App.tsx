import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { StepUpload } from './components/StepUpload';
import { StepReview } from './components/StepReview';
import { StepCapa } from './components/StepCapa';
import { StepReport } from './components/StepReport';
import { StepConfig } from './components/StepConfig';
import {
  CampaignRow,
  CapaData,
  ClassifierConfig,
  ObjectiveType,
  ReportMeta
} from './types';
import {
  applyCampaignPatch,
  DEFAULT_CLASSIFIER_CONFIG,
  getSampleDemoData,
  parseExcelWorkbook,
  parseFileName,
  sortCampaignRows
} from './lib/metaAdsParser';
import { exportToExcel } from './lib/excelExport';
import { SimpleFunctionalPdfReport } from './components/SimpleFunctionalPdfReport';

const STORAGE_KEY = 'relatorio_ads_gemini_state_v1';
const CONFIG_STORAGE_KEY = 'relatorio_ads_gemini_config_v1';
const PRESENTATION_CACHE_PREFIX = 'relatorio_presentation_snapshot_';

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [capa, setCapa] = useState<CapaData>({
    fb: { seguidores: '', segAnterior: '', homens: '', mulheres: '', faixa: '', alcancadas: '', visitas: '' },
    ig: { seguidores: '', segAnterior: '', homens: '', mulheres: '', faixa: '', alcancadas: '', visitas: '' }
  });
  const [batchFiltro, setBatchFiltro] = useState<string>('');
  const [batchCidade, setBatchCidade] = useState<string>('');
  const [config, setConfig] = useState<ClassifierConfig>(() => {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_CLASSIFIER_CONFIG;
    } catch {
      return DEFAULT_CLASSIFIER_CONFIG;
    }
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [sharedToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('apresentacao') || params.get('p');
    }
    return null;
  });

  const [isClientLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('apresentacao') || params.get('p') || params.get('mode') === 'client');
    }
    return false;
  });

  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(
        params.get('apresentacao') ||
        params.get('p') ||
        params.get('mode') === 'client' ||
        window.location.hash.includes('client')
      );
    }
    return false;
  });

  const [initialReportTab, setInitialReportTab] = useState<'reportei' | 'table'>('reportei');
  const [isLoadingSharedPresentation, setIsLoadingSharedPresentation] = useState<boolean>(Boolean(sharedToken));
  const [sharedPresentationError, setSharedPresentationError] = useState<string | null>(null);

  // Restore saved state or fetch exclusive client presentation snapshot
  useEffect(() => {
    if (sharedToken) {
      let cancelled = false;
      const loadSharedPresentation = async () => {
        setIsLoadingSharedPresentation(true);
        setSharedPresentationError(null);
        try {
          const res = await fetch(`/api/presentations/${encodeURIComponent(sharedToken)}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data?.presentation) {
              const p = data.presentation;
              setMeta(p.meta || null);
              setCampaigns(p.campaigns || []);
              if (p.capa) setCapa(p.capa);
              setInitialReportTab(p.initialTab === 'table' ? 'table' : 'reportei');
              setCurrentStep(4);
              setIsPresentationMode(true);
              setIsLoadingSharedPresentation(false);
              return;
            }
          }

          // Fallback: check localStorage cache if tested on same browser
          const cachedRaw = localStorage.getItem(`${PRESENTATION_CACHE_PREFIX}${sharedToken}`);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (!cancelled && cached?.campaigns?.length) {
              setMeta(cached.meta || null);
              setCampaigns(cached.campaigns || []);
              if (cached.capa) setCapa(cached.capa);
              setInitialReportTab(cached.initialTab === 'table' ? 'table' : 'reportei');
              setCurrentStep(4);
              setIsPresentationMode(true);
              setIsLoadingSharedPresentation(false);
              return;
            }
          }

          if (!cancelled) {
            setSharedPresentationError(
              'Este link de apresentação exclusivo não foi encontrado ou não está mais disponível.'
            );
          }
        } catch {
          if (!cancelled) {
            setSharedPresentationError('Não foi possível carregar a apresentação exclusiva.');
          }
        } finally {
          if (!cancelled) {
            setIsLoadingSharedPresentation(false);
          }
        }
      };

      loadSharedPresentation();
      return () => {
        cancelled = true;
      };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.campaigns && parsed.campaigns.length > 0) {
          setMeta(parsed.meta || null);
          setCampaigns(parsed.campaigns || []);
          if (parsed.capa) setCapa(parsed.capa);
          if (typeof parsed.batchFiltro === 'string') setBatchFiltro(parsed.batchFiltro);
          if (typeof parsed.batchCidade === 'string') setBatchCidade(parsed.batchCidade);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        }
      } else if (isPresentationMode) {
        const sample = getSampleDemoData();
        setMeta(sample.meta);
        setCampaigns(sample.rows);
        setCapa(sample.capa);
        setCurrentStep(4);
      }
    } catch (e) {
      console.warn('Erro ao restaurar dados salvos no navegador:', e);
    }
  }, [sharedToken, isPresentationMode]);

  // Save state on changes (never overwrite editor localStorage when viewing a locked client presentation)
  useEffect(() => {
    if (isClientLocked || sharedToken) return;
    if (campaigns.length > 0 && meta) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            meta,
            campaigns,
            capa,
            batchFiltro,
            batchCidade,
            currentStep
          })
        );
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
      }
    }
  }, [meta, campaigns, capa, batchFiltro, batchCidade, currentStep, isClientLocked, sharedToken]);

  // (State persistence handled in effect above)

  // Handle uploading and parsing of an .xlsx/.xls file
  const handleFileUpload = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('Não foi possível ler o arquivo.');

        const wb = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
        const data = parseExcelWorkbook(wb);
        if (!data || data.length === 0) {
          throw new Error('Nenhuma campanha identificada no arquivo.');
        }

        const parsedMeta = parseFileName(file.name);
        setMeta(parsedMeta);
        setCampaigns(data);
        setBatchFiltro('');
        setBatchCidade('');
        setCurrentStep(2);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(
          err.message || 'Erro ao processar o arquivo. Verifique se é uma exportação válida do Meta Ads.'
        );
      }
    };

    reader.onerror = () => {
      setErrorMessage('Erro de leitura do arquivo no navegador.');
    };

    reader.readAsArrayBuffer(file);
  };

  // Load complete pre-configured demonstration
  const handleLoadDemo = () => {
    const demo = getSampleDemoData();
    setMeta(demo.meta);
    setCampaigns(demo.rows);
    setCapa(demo.capa);
    setBatchFiltro('');
    setBatchCidade('');
    setCurrentStep(2);
    setErrorMessage(null);
  };

  // Clear state and start fresh
  const handleReset = () => {
    setMeta(null);
    setCampaigns([]);
    setCapa({
      fb: { seguidores: '', segAnterior: '', homens: '', mulheres: '', faixa: '', alcancadas: '', visitas: '' },
      ig: { seguidores: '', segAnterior: '', homens: '', mulheres: '', faixa: '', alcancadas: '', visitas: '' }
    });
    setBatchFiltro('');
    setBatchCidade('');
    setCurrentStep(1);
    setErrorMessage(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Update report metadata (cliente, mes, ano)
  const handleUpdateMeta = (patch: Partial<ReportMeta>) => {
    setMeta((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Update capa (Social Audience) field
  const handleUpdateCapaField = (
    platform: 'fb' | 'ig',
    field: keyof CapaData['fb'],
    value: string
  ) => {
    setCapa((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  // Generic campaign update with automatic recalculation of dependent mathematical unit costs
  const handleUpdateCampaign = (campaignId: string, patch: Partial<CampaignRow>) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? applyCampaignPatch(c, patch) : c))
    );
  };

  // Update objective for a specific campaign
  const handleUpdateObjective = (campaignId: string, newObjective: ObjectiveType) => {
    handleUpdateCampaign(campaignId, { objective: newObjective });
  };

  // Update display name for a specific campaign
  const handleUpdateDisplayName = (campaignId: string, newDisplayName: string) => {
    handleUpdateCampaign(campaignId, { displayName: newDisplayName });
  };

  // Update format for a specific campaign
  const handleUpdateFormat = (campaignId: string, newFormat: string) => {
    handleUpdateCampaign(campaignId, { format: newFormat });
  };

  // Update filtro for a specific campaign
  const handleUpdateFiltro = (campaignId: string, newFiltro: string) => {
    handleUpdateCampaign(campaignId, { filtro: newFiltro });
  };

  // Update cidade for a specific campaign
  const handleUpdateCidade = (campaignId: string, newCidade: string) => {
    handleUpdateCampaign(campaignId, { cidade: newCidade });
  };

  // Batch update filtro and cidade for all campaigns
  const handleBatchUpdateFiltroCidade = (filtro: string, cidade: string) => {
    const trimmedFiltro = filtro.trim();
    const trimmedCidade = cidade.trim();
    if (trimmedFiltro) setBatchFiltro(trimmedFiltro);
    if (trimmedCidade) setBatchCidade(trimmedCidade);

    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        ...(trimmedFiltro ? { filtro: trimmedFiltro } : {}),
        ...(trimmedCidade ? { cidade: trimmedCidade } : {})
      }))
    );
  };

  // Fill any empty filtro/cidade fields from pending batch inputs when navigating steps
  const applyPendingBatchToEmptyRows = () => {
    const trimmedFiltro = batchFiltro.trim();
    const trimmedCidade = batchCidade.trim();
    if (!trimmedFiltro && !trimmedCidade) return;

    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        ...(!c.filtro?.trim() && trimmedFiltro ? { filtro: trimmedFiltro } : {}),
        ...(!c.cidade?.trim() && trimmedCidade ? { cidade: trimmedCidade } : {})
      }))
    );
  };

  const handleSelectStep = (step: number) => {
    if (currentStep === 2 && step !== 2) {
      applyPendingBatchToEmptyRows();
    }
    setCurrentStep(step);
  };

  // Batch AI classification with Gemini
  const handleAiClassify = async () => {
    if (!campaigns.length) return;
    setIsAiClassifying(true);

    try {
      const res = await fetch('/api/gemini/classify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaigns }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao classificar com Gemini.');
      }

      const classifications: Array<{
        id: string;
        objective: ObjectiveType;
        format: string;
        displayName: string;
        reason: string;
        confidence: 'high' | 'medium' | 'low';
      }> = data.classifications || [];

      // Map back to campaigns
      setCampaigns((prev) => {
        const next = prev.map((camp) => {
          const match = classifications.find((c) => c.id === camp.id);
          if (match) {
            return {
              ...camp,
              objective: match.objective,
              format: match.format || camp.format,
              displayName: match.displayName || camp.displayName,
              aiNotes: `IA: ${match.reason}`,
              confidence: match.confidence,
            };
          }
          return camp;
        });
        sortCampaignRows(next);
        return next;
      });
    } catch (err: any) {
      alert('Erro na classificação inteligente: ' + err.message);
    } finally {
      setIsAiClassifying(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!campaigns.length || !meta) return;
    setIsExportingExcel(true);
    try {
      await exportToExcel(meta, campaigns, capa);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar planilha Excel: ' + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Save classifier config
  const handleSaveConfig = (newConfig: ClassifierConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch {}
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_CLASSIFIER_CONFIG);
    try {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    } catch {}
  };

  // Generate personalized, exclusive read-only presentation link for the client
  const handleCreateClientLink = async (preferredTab: 'reportei' | 'table' = 'reportei'): Promise<string> => {
    if (!meta || campaigns.length === 0) {
      throw new Error('Não há dados carregados para gerar o link.');
    }

    const res = await fetch('/api/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meta,
        campaigns,
        capa,
        initialTab: preferredTab,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.id) {
      throw new Error(data?.error || 'Não foi possível gerar o link exclusivo.');
    }

    try {
      localStorage.setItem(
        `${PRESENTATION_CACHE_PREFIX}${data.id}`,
        JSON.stringify({ meta, campaigns, capa, initialTab: preferredTab })
      );
    } catch {
      // Ignore storage quota issues
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?apresentacao=${encodeURIComponent(data.id)}`;
    await copyTextToClipboard(shareUrl);
    return shareUrl;
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      {!isPresentationMode && !isClientLocked && (
        <Header
          currentStep={currentStep}
          onSelectStep={handleSelectStep}
          meta={meta}
          hasData={campaigns.length > 0}
          onExportExcel={handleExportExcel}
          isExportingExcel={isExportingExcel}
          onReset={handleReset}
          onLoadDemo={handleLoadDemo}
        />
      )}

      {isPresentationMode && (
        <div className="bg-[#121316] border-b border-[#2b2d33] px-6 py-2.5 flex items-center justify-between text-xs text-neutral-400 no-print">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">
              {isClientLocked ? 'Apresentação Exclusiva do Cliente' : 'Modo Apresentação Ativo'}
            </span>
            <span className="hidden sm:inline text-neutral-500">•</span>
            <span className="hidden sm:inline">
              {meta?.cliente || 'Cliente'} ({meta?.mes} {meta?.ano}) • Somente leitura
            </span>
          </div>
          {!isClientLocked && (
            <button
              type="button"
              onClick={() => setIsPresentationMode(false)}
              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              Sair do Modo Apresentação (Voltar ao Editor)
            </button>
          )}
        </div>
      )}

      <main className="flex-1 pb-16">
        {isLoadingSharedPresentation && (
          <div className="max-w-xl mx-auto mt-16 p-8 bg-[#141518] border border-[#2b2d33] rounded-2xl text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">Carregando apresentação exclusiva...</h2>
            <p className="text-xs text-neutral-400">Buscando os dados consolidados do relatório.</p>
          </div>
        )}

        {!isLoadingSharedPresentation && sharedPresentationError && (
          <div className="max-w-xl mx-auto mt-16 p-8 bg-[#141518] border border-red-500/30 rounded-2xl text-center space-y-2">
            <h2 className="text-lg font-bold text-white">Apresentação indisponível</h2>
            <p className="text-xs text-neutral-400">{sharedPresentationError}</p>
          </div>
        )}

        {(!isLoadingSharedPresentation && !sharedPresentationError) && (
          <>
            {(!isClientLocked && !isPresentationMode && currentStep === 1) && (
              <StepUpload
                onFileUpload={handleFileUpload}
                onLoadDemo={handleLoadDemo}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
              />
            )}

            {(!isClientLocked && !isPresentationMode && currentStep === 2 && meta) && (
              <StepReview
                meta={meta}
                campaigns={campaigns}
                batchFiltro={batchFiltro}
                batchCidade={batchCidade}
                onChangeBatchFiltro={setBatchFiltro}
                onChangeBatchCidade={setBatchCidade}
                onUpdateMeta={handleUpdateMeta}
                onUpdateCampaign={handleUpdateCampaign}
                onUpdateObjective={handleUpdateObjective}
                onUpdateDisplayName={handleUpdateDisplayName}
                onUpdateFormat={handleUpdateFormat}
                onUpdateFiltro={handleUpdateFiltro}
                onUpdateCidade={handleUpdateCidade}
                onBatchUpdateFiltroCidade={handleBatchUpdateFiltroCidade}
                onAiClassify={handleAiClassify}
                isAiClassifying={isAiClassifying}
                onContinue={() => {
                  applyPendingBatchToEmptyRows();
                  setCurrentStep(3);
                }}
              />
            )}

            {(!isClientLocked && !isPresentationMode && currentStep === 3 && meta) && (
              <StepCapa
                meta={meta}
                capa={capa}
                onChangeCapa={setCapa}
                onBack={() => setCurrentStep(2)}
                onContinue={() => setCurrentStep(4)}
              />
            )}

            {((isPresentationMode || currentStep === 4) && meta) && (
              <StepReport
                meta={meta}
                campaigns={campaigns}
                capa={capa}
                batchFiltro={batchFiltro}
                batchCidade={batchCidade}
                onChangeBatchFiltro={setBatchFiltro}
                onChangeBatchCidade={setBatchCidade}
                initialTab={initialReportTab}
                onExportExcel={handleExportExcel}
                isExportingExcel={isExportingExcel}
                onBackToCapa={() => setCurrentStep(3)}
                onUpdateMeta={isPresentationMode || isClientLocked ? undefined : handleUpdateMeta}
                onUpdateCampaign={isPresentationMode || isClientLocked ? undefined : handleUpdateCampaign}
                onUpdateCapaField={isPresentationMode || isClientLocked ? undefined : handleUpdateCapaField}
                onUpdateFiltro={isPresentationMode || isClientLocked ? undefined : handleUpdateFiltro}
                onUpdateCidade={isPresentationMode || isClientLocked ? undefined : handleUpdateCidade}
                onBatchUpdateFiltroCidade={isPresentationMode || isClientLocked ? undefined : handleBatchUpdateFiltroCidade}
                isPresentationMode={isPresentationMode}
                isClientLocked={isClientLocked}
                onTogglePresentationMode={isClientLocked ? undefined : () => setIsPresentationMode(!isPresentationMode)}
                onCreateClientLink={isClientLocked ? undefined : handleCreateClientLink}
              />
            )}

            {(!isClientLocked && !isPresentationMode && currentStep === 5) && (
              <StepConfig
                config={config}
                onSaveConfig={handleSaveConfig}
                onResetConfig={handleResetConfig}
              />
            )}

            {/* Impressão Global do PDF Simples e Funcional */}
            {(meta && campaigns.length > 0 && currentStep !== 4 && !isPresentationMode && !isClientLocked) && (
              <div className="print-only">
                <SimpleFunctionalPdfReport
                  meta={meta}
                  campaigns={campaigns}
                  capa={capa}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[#1e2025] py-6 px-4 text-center text-xs text-neutral-500 bg-[#090a0c] no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Relatório de Impulsionamento Meta Ads • Tecnologia de análise corporativa e automação
          </p>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Versão 2.0</span>
            {!isClientLocked && !isPresentationMode && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Configurar Regras
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
