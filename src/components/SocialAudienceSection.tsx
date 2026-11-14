import React from 'react';
import { CapaData } from '../types';

interface SocialAudienceSectionProps {
  capa: CapaData;
  forceShow?: boolean;
  className?: string;
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
}) => {
  if (!forceShow && !hasSocialAudienceData(capa)) {
    return null;
  }

  return (
    <div className={`bg-[#141518] border border-[#2b2d33] rounded-3xl p-6 sm:p-8 shadow-xl ${className}`}>
      <div className="mb-6 pb-4 border-b border-neutral-800">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
          Base de Audiência Social
        </span>
        <h3 className="text-xl font-black text-white mt-0.5">
          Demografia e Presença Orgânica Integrada
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Instagram Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
            <strong className="text-rose-400 text-sm font-bold uppercase tracking-wide">
              Instagram Business
            </strong>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {capa.ig.seguidores || '—'} seguidores
            </span>
          </div>
          <div className="space-y-2 text-xs text-neutral-300 font-mono tabular-nums">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
              <span>{capa.ig.segAnterior || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Alcance Orgânico/Total:</span>
              <span>{capa.ig.alcancadas || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Visitas ao Perfil:</span>
              <span>{capa.ig.visitas || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Faixa Etária Principal:</span>
              <span>{capa.ig.faixa || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Divisão de Gênero:</span>
              <span className="text-rose-300">
                {capa.ig.mulheres || '—'} Mulheres / {capa.ig.homens || '—'} Homens
              </span>
            </div>
          </div>
        </div>

        {/* Facebook Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
            <strong className="text-blue-400 text-sm font-bold uppercase tracking-wide">
              Facebook Page
            </strong>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {capa.fb.seguidores || '—'} seguidores
            </span>
          </div>
          <div className="space-y-2 text-xs text-neutral-300 font-mono tabular-nums">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Seguidores Mês Anterior:</span>
              <span>{capa.fb.segAnterior || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Alcance Total:</span>
              <span>{capa.fb.alcancadas || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Visitas à Página:</span>
              <span>{capa.fb.visitas || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Faixa Etária Principal:</span>
              <span>{capa.fb.faixa || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 font-sans">Divisão de Gênero:</span>
              <span className="text-blue-300">
                {capa.fb.mulheres || '—'} Mulheres / {capa.fb.homens || '—'} Homens
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
