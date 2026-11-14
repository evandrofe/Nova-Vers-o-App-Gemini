import React from 'react';
import { CapaData } from '../types';
import { EditablePercent, EditableText } from './EditableField';

interface SocialAudienceSectionProps {
  capa: CapaData;
  forceShow?: boolean;
  className?: string;
  isReadOnly?: boolean;
  onUpdateCapaField?: (platform: 'fb' | 'ig', field: keyof CapaData['fb'], value: string) => void;
}

export const hasSocialAudienceData = (capa: CapaData): boolean => {
  const fbValues = Object.values(capa.fb || {});
  const igValues = Object.values(capa.ig || {});
  return [...fbValues, ...igValues].some((v) => String(v || '').trim().length > 0);
};

export const SocialAudienceSection: React.FC<SocialAudienceSectionProps> = ({
  capa,
  forceShow = false,
  className = '',
  isReadOnly = true,
  onUpdateCapaField,
}) => {
  const canEdit = !isReadOnly && Boolean(onUpdateCapaField);

  if (!forceShow && !canEdit && !hasSocialAudienceData(capa)) {
    return null;
  }

  return (
    <div className={`bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl ${className}`}>
      <div className="mb-6 pb-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            Base de Audiência Social
          </span>
          <h3 className="text-xl font-black text-white mt-0.5">
            Demografia e Presença Orgânica Integrada
          </h3>
        </div>
        {canEdit && (
          <span className="text-[11px] text-neutral-400 no-print">
            Clique nos valores para editar Instagram e Facebook
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Instagram Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-neutral-800/80">
            <strong className="text-rose-400 text-sm font-bold uppercase tracking-wide">
              INSTAGRAM
            </strong>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-white tabular-nums">
              <EditableText
                value={capa.ig.seguidores}
                onChange={(v) => onUpdateCapaField?.('ig', 'seguidores', v)}
                isReadOnly={!canEdit}
                placeholder="0"
                className="text-right font-mono font-bold text-white w-20"
              />
              <span>seguidores</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-neutral-300 font-mono tabular-nums">
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
              <EditableText
                value={capa.ig.segAnterior}
                onChange={(v) => onUpdateCapaField?.('ig', 'segAnterior', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 39.710"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Alcance Orgânico/Total:</span>
              <EditableText
                value={capa.ig.alcancadas}
                onChange={(v) => onUpdateCapaField?.('ig', 'alcancadas', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 112.400"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Visitas ao Perfil:</span>
              <EditableText
                value={capa.ig.visitas}
                onChange={(v) => onUpdateCapaField?.('ig', 'visitas', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 14.890"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Faixa Etária Principal:</span>
              <EditableText
                value={capa.ig.faixa}
                onChange={(v) => onUpdateCapaField?.('ig', 'faixa', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 25 a 44 anos"
                className="text-right text-neutral-200 w-36"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Divisão de Gênero:</span>
              <div className="text-rose-300 flex items-center gap-1 flex-wrap justify-end">
                <EditablePercent
                  value={capa.ig.mulheres}
                  onChange={(v) => onUpdateCapaField?.('ig', 'mulheres', v)}
                  isReadOnly={!canEdit}
                  placeholder="0%"
                  className="text-right text-rose-300 w-16"
                />
                <span>Mulheres /</span>
                <EditablePercent
                  value={capa.ig.homens}
                  onChange={(v) => onUpdateCapaField?.('ig', 'homens', v)}
                  isReadOnly={!canEdit}
                  placeholder="0%"
                  className="text-right text-rose-300 w-16"
                />
                <span>Homens</span>
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-neutral-800/80">
            <strong className="text-blue-400 text-sm font-bold uppercase tracking-wide">
              FACEBOOK
            </strong>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-white tabular-nums">
              <EditableText
                value={capa.fb.seguidores}
                onChange={(v) => onUpdateCapaField?.('fb', 'seguidores', v)}
                isReadOnly={!canEdit}
                placeholder="0"
                className="text-right font-mono font-bold text-white w-20"
              />
              <span>seguidores</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-neutral-300 font-mono tabular-nums">
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
              <EditableText
                value={capa.fb.segAnterior}
                onChange={(v) => onUpdateCapaField?.('fb', 'segAnterior', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 17.890"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Alcance Total:</span>
              <EditableText
                value={capa.fb.alcancadas}
                onChange={(v) => onUpdateCapaField?.('fb', 'alcancadas', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 48.910"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Visitas à Página:</span>
              <EditableText
                value={capa.fb.visitas}
                onChange={(v) => onUpdateCapaField?.('fb', 'visitas', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 3.420"
                className="text-right text-neutral-200 w-28"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Faixa Etária Principal:</span>
              <EditableText
                value={capa.fb.faixa}
                onChange={(v) => onUpdateCapaField?.('fb', 'faixa', v)}
                isReadOnly={!canEdit}
                placeholder="Ex: 25 a 54 anos"
                className="text-right text-neutral-200 w-36"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-neutral-500 font-sans">Divisão de Gênero:</span>
              <div className="text-blue-300 flex items-center gap-1 flex-wrap justify-end">
                <EditablePercent
                  value={capa.fb.mulheres}
                  onChange={(v) => onUpdateCapaField?.('fb', 'mulheres', v)}
                  isReadOnly={!canEdit}
                  placeholder="0%"
                  className="text-right text-blue-300 w-16"
                />
                <span>Mulheres /</span>
                <EditablePercent
                  value={capa.fb.homens}
                  onChange={(v) => onUpdateCapaField?.('fb', 'homens', v)}
                  isReadOnly={!canEdit}
                  placeholder="0%"
                  className="text-right text-blue-300 w-16"
                />
                <span>Homens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
