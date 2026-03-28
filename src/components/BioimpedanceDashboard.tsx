import React from 'react';
import { Building2, Mail, Printer } from 'lucide-react';
import { Sessao, Paciente, Profissional } from '../types';

interface BioDashboardProps {
  sessao: Sessao | null;
  paciente: Paciente;
  profissional?: Profissional;
}

const HumanSilhouette = ({ className, color = "currentColor" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 100 200" className={className} fill={color}>
    <circle cx="50" cy="20" r="15" />
    <path d="M50 35 C30 35 20 50 20 70 L20 100 L35 100 L35 190 L65 190 L65 100 L80 100 L80 70 C80 50 70 35 50 35 Z" />
  </svg>
);

const GaugeArc = ({ value, min, max, colorSegments, currentValueLabel }: { value: number, min: number, max: number, colorSegments: { color: string, stop: number }[], currentValueLabel: string }) => {
  const radius = 75;
  const strokeWidth = 14;
  const centerX = 100;
  const centerY = 100;
  
  const getCoordinatesForAngle = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY - radius * Math.sin(radians)
    };
  };

  const createArc = (sAngle: number, eAngle: number) => {
    const start = getCoordinatesForAngle(sAngle);
    const end = getCoordinatesForAngle(eAngle);
    const largeArcFlag = Math.abs(eAngle - sAngle) <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const needleAngle = 180 - percentage * 180;
  const needlePos = getCoordinatesForAngle(needleAngle);

  // Scale labels
  const labels = [];
  for (let i = 0; i <= 8; i++) {
    const angle = 180 - (i / 8) * 180;
    const pos = getCoordinatesForAngle(angle + 12); 
    const val = (min + (i / 8) * (max - min)).toFixed(1);
    labels.push({ x: pos.x, y: pos.y, val });
  }

  return (
    <div className="relative w-full aspect-[2/1]">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Background Arc */}
        <path d={createArc(180, 0)} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        
        {/* Color Segments */}
        {colorSegments.map((seg, i) => {
          const prevStop = i === 0 ? 0 : colorSegments[i-1].stop;
          const sAngle = 180 - (prevStop / 100) * 180;
          const eAngle = 180 - (seg.stop / 100) * 180;
          return (
            <path key={i} d={createArc(sAngle, eAngle)} stroke={seg.color} strokeWidth={strokeWidth} fill="none" />
          );
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y} fill="#94a3b8" fontSize="5" textAnchor="middle">
            {l.val}
          </text>
        ))}

        {/* Needle (Triangle) */}
        <g transform={`rotate(${90 - needleAngle}, ${centerX}, ${centerY})`}>
          <path d={`M ${centerX-5} ${centerY-radius-strokeWidth-2} L ${centerX+5} ${centerY-radius-strokeWidth-2} L ${centerX} ${centerY-radius+8} Z`} fill="#4f46e5" />
        </g>

        {/* Value Display */}
        <circle cx={centerX} cy={centerY - 15} r="28" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <text x={centerX} y={centerY - 10} fill="#4f46e5" fontSize="18" fontWeight="900" textAnchor="middle">
          {currentValueLabel}
        </text>
      </svg>
    </div>
  );
};

export const BioimpedanceDashboard: React.FC<BioDashboardProps> = ({ sessao, paciente, profissional }) => {
  if (!sessao) return null;
  const ctx = sessao.contexto_clinico;

  return (
    <div className="bg-white text-slate-900 p-4 md:p-8 rounded-3xl shadow-xl border border-slate-200 font-sans overflow-hidden">
      {/* Header - Minimalist */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 border-b border-slate-100 pb-6 md:pb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase">DASHBOARD <span className="text-indigo-600">BIOIMPEDÂNCIA</span></h2>
          <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-1">Análise de Composição Corporal e Celular</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
        {/* Gordura */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Gordura</h3>
          <div className="flex justify-between text-[9px] md:text-[10px] text-slate-500 uppercase font-bold">
            <div>
              <p>Massa Gorda</p>
              <p className="text-base md:text-lg text-slate-900 font-black">{ctx?.massa_gorda || 0} <span className="text-[10px] md:text-xs font-normal text-slate-400">Kg</span></p>
            </div>
            <div className="text-right">
              <p>% Gordura</p>
              <p className="text-base md:text-lg text-slate-900 font-black">{ctx?.percentual_gordura || 0} <span className="text-[10px] md:text-xs font-normal text-slate-400">%</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 md:gap-8">
             <HumanSilhouette className="w-16 md:w-20 h-32 md:h-40 text-red-500 opacity-80" />
             <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                  <circle 
                    cx="64" cy="64" r="50" stroke="#FF00FF" strokeWidth="12" fill="none" 
                    strokeDasharray={314} 
                    strokeDashoffset={314 - (314 * (ctx?.percentual_gordura || 0)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-lg md:text-xl font-black text-red-500">{ctx?.percentual_gordura || 0}%</p>
                </div>
             </div>
             <div className="flex flex-col gap-2">
                <button className="bg-blue-600 text-white text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 rounded">
                  Target
                </button>
             </div>
          </div>
        </div>

        {/* Hidratação */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Hidratação</h3>
          <div className="grid grid-cols-3 text-[9px] md:text-[10px] text-slate-500 uppercase font-bold gap-2">
            <div>
              <p>Água Corporal Total</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.agua_corporal_total || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">litros</span></p>
            </div>
            <div className="text-center">
              <p>Índice de hidratação</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.indice_hidratacao || 0}</p>
            </div>
            <div className="text-right">
              <p>Água na Massa Magra</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.agua_massa_magra || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">%</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <HumanSilhouette className="w-14 md:w-16 h-28 md:h-32 text-green-500 opacity-80" />
            <div className="flex-1">
               <GaugeArc 
                value={ctx?.indice_hidratacao || 0} 
                min={1.5} max={4.5} 
                colorSegments={[
                  { color: '#FF0000', stop: 33 },
                  { color: '#00FF00', stop: 66 },
                  { color: '#FF0000', stop: 100 }
                ]}
                currentValueLabel={`${ctx?.indice_hidratacao || 0}`}
               />
            </div>
          </div>
        </div>

        {/* Água Intra e Extra Celular */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Água Intra e Extra Celular</h3>
          <div className="grid grid-cols-3 text-[9px] md:text-[10px] text-slate-500 uppercase font-bold gap-2">
            <div>
              <p>Intracelular</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.intracelular || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">litros</span></p>
            </div>
            <div className="text-center">
              <p>Água Intracelular %</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.agua_intracelular_percentual || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">%</span></p>
            </div>
            <div className="text-right">
              <p>Extracelular</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.extracelular || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">litros</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <HumanSilhouette className="w-14 md:w-16 h-28 md:h-32 text-yellow-500 opacity-80" />
            <div className="flex-1">
               <GaugeArc 
                value={ctx?.agua_intracelular_percentual || 0} 
                min={45} max={58} 
                colorSegments={[
                  { color: '#FF0000', stop: 20 },
                  { color: '#FFFF00', stop: 40 },
                  { color: '#00FF00', stop: 60 },
                  { color: '#FFFF00', stop: 80 },
                  { color: '#FF0000', stop: 100 }
                ]}
                currentValueLabel={`${ctx?.agua_intracelular_percentual || 0}%`}
               />
            </div>
          </div>
        </div>

        {/* Massa Magra e Muscular */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Massa Magra e Muscular</h3>
          <div className="grid grid-cols-3 text-[9px] md:text-[10px] text-slate-500 uppercase font-bold gap-2">
            <div>
              <p>Massa Magra</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.massa_magra || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">Kg</span></p>
            </div>
            <div className="text-center">
              <p>Razão Músculo Gordura</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.razao_musculo_gordura || 0}</p>
            </div>
            <div className="text-right">
              <p>Massa Muscular</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.massa_muscular || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">Kg</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <HumanSilhouette className="w-14 md:w-16 h-28 md:h-32 text-green-500 opacity-80" />
            <div className="flex-1">
               <GaugeArc 
                value={ctx?.razao_musculo_gordura || 0} 
                min={0.2} max={6.0} 
                colorSegments={[
                  { color: '#FF0000', stop: 20 },
                  { color: '#FFFF00', stop: 40 },
                  { color: '#00FF00', stop: 60 },
                  { color: '#00AAFF', stop: 100 }
                ]}
                currentValueLabel={`${ctx?.razao_musculo_gordura || 0}`}
               />
            </div>
          </div>
        </div>

        {/* Peso, Altura e TMB */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">IMC e Taxa Metabólica</h3>
          <div className="grid grid-cols-3 text-[9px] md:text-[10px] text-slate-500 uppercase font-bold gap-2">
            <div>
              <p>IMC</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.imc || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">Kg/m²</span></p>
            </div>
            <div className="text-center">
              <p>Idade</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.idade || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">anos</span></p>
            </div>
            <div className="text-right">
              <p>Taxa Metabólica Basal</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.taxa_metabolica_basal || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">kcal/24h</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 md:gap-8 relative h-32 md:h-40">
            <div className="h-24 md:h-32 w-px bg-slate-200 relative">
               {[...Array(10)].map((_, i) => (
                 <div key={i} className="absolute w-2 h-px bg-slate-300" style={{ top: `${i * 10}%`, left: 0 }} />
               ))}
            </div>
            <HumanSilhouette className="w-16 md:w-20 h-32 md:h-40 text-slate-200 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[7px] md:text-[8px] text-slate-400 uppercase font-bold tracking-widest">Composição</p>
                <p className="text-[10px] md:text-xs font-black text-slate-900">{ctx?.imc ? "Análise Ativa" : "Aguardando Dados"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Análise Celular */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Análise celular</h3>
          <div className="grid grid-cols-3 text-[9px] md:text-[10px] text-slate-500 uppercase font-bold gap-2">
            <div>
              <p>Ângulo de Fase</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.angulo_fase || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">graus</span></p>
            </div>
            <div className="text-center">
              <p>Idade</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.idade || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">anos</span></p>
            </div>
            <div className="text-right">
              <p>Idade Celular</p>
              <p className="text-[10px] md:text-xs text-slate-900 font-black">{ctx?.idade_celular || 0} <span className="text-[8px] md:text-[9px] font-normal text-slate-400">anos</span></p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <HumanSilhouette className="w-14 md:w-16 h-28 md:h-32 text-green-500 opacity-80" />
            <div className="flex-1">
               <GaugeArc 
                value={ctx?.angulo_fase || 0} 
                min={3.2} max={7.2} 
                colorSegments={[
                  { color: '#FF0000', stop: 25 },
                  { color: '#FFFF00', stop: 50 },
                  { color: '#00FF00', stop: 75 },
                  { color: '#00AAFF', stop: 100 }
                ]}
                currentValueLabel={`${ctx?.angulo_fase || 0}°`}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
