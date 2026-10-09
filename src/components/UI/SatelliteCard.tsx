import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  SatelliteItem,
  CurrentPosition
} from '../../types';
import {
  calculateSatellitePosition
} from '../../services/tleService';
import {
  X,
  Compass,
  Gauge,
  ArrowUpRight,
  Eye,
  Crosshair,
  Calendar,
  Layers,
  Radio
} from 'lucide-react';
import { sounds } from '../../utils/soundManager';

interface SatelliteCardProps {
  sat: SatelliteItem;
  simulatedTime: Date;
  onClose: () => void;
  isTracked: boolean;
  onToggleTrack: () => void;
}

const CATEGORY_NAMES: Record<string, { label: string; color: string; icon: string }> = {
  stations: { label: 'Пилотируемая станция', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '🛰️' },
  starlink: { label: 'Starlink (Связь)', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: '💎' },
  navigation: { label: 'Навигационный спутник', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '▲' },
  weather: { label: 'Метео / ДЗЗ', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: '📡' },
  science: { label: 'Научная обсерватория', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: '✦' },
  other: { label: 'Орбитальный аппарат', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: '●' }
};

export const SatelliteCard: React.FC<SatelliteCardProps> = ({
  sat,
  simulatedTime,
  onClose,
  isTracked,
  onToggleTrack
}) => {
  const position = useMemo(() => {
    return calculateSatellitePosition(sat, simulatedTime);
  }, [sat, simulatedTime]);

  const catMeta = CATEGORY_NAMES[sat.category] || CATEGORY_NAMES.other;

  const formatLat = (lat: number) => {
    const dir = lat >= 0 ? 'N' : 'S';
    return `${Math.abs(lat).toFixed(2)}° ${dir}`;
  };

  const formatLng = (lng: number) => {
    const dir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lng).toFixed(2)}° ${dir}`;
  };

  return (
    <motion.div
      id="satellite-detail-card"
      initial={{ x: -100, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -80, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-18 left-4 sm:left-6 z-30 w-80 sm:w-92 max-h-[calc(100vh-8.5rem)] overflow-y-auto custom-scrollbar bg-slate-950/92 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-2xl shadow-cyan-950/20 text-slate-100"
    >
      {/* Header bar */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-800/80 bg-slate-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${catMeta.color}`}>
              <span>{catMeta.icon}</span>
              {catMeta.label}
            </span>
            {sat.launchYear && (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {sat.launchYear}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {sat.name}
          </h2>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
            <span>NORAD {sat.id}</span>
            {sat.intlDesig && (
              <>
                <span>•</span>
                <span>{sat.intlDesig}</span>
              </>
            )}
          </div>
        </div>

        <button
          id="btn-close-card"
          onClick={() => {
            sounds.playSelect();
            onClose();
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Altitude */}
          <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" /> Высота
              </span>
            </div>
            {position ? (
              <div className="text-base font-mono font-bold text-cyan-400">
                {Math.round(position.altitudeKm)} км
              </div>
            ) : (
              <div className="h-6 w-20 bg-slate-800/80 animate-pulse rounded" />
            )}
            <div className="text-[10px] text-slate-400 mt-0.5">
              Апогей {sat.apogeeKm} / Перигей {sat.perigeeKm} км
            </div>
          </div>

          {/* Velocity */}
          <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Скорость
              </span>
            </div>
            {position ? (
              <div className="text-base font-mono font-bold text-emerald-400">
                {position.speedKmS.toFixed(2)} км/с
              </div>
            ) : (
              <div className="h-6 w-20 bg-slate-800/80 animate-pulse rounded" />
            )}
            <div className="text-[10px] text-slate-400 mt-0.5">
              {position ? `${Math.round(position.speedKmS * 3600).toLocaleString('ru-RU')} км/ч` : '27 500 км/ч'}
            </div>
          </div>
        </div>

        {/* Geographic Sub-satellite position */}
        <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1.5 font-sans">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Координаты подспутниковой точки
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-200">
            <span>Широта:</span>
            <span className="font-semibold text-slate-100">
              {position ? formatLat(position.lat) : (
                <span className="inline-block w-16 h-3.5 bg-slate-800 animate-pulse rounded" />
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-200 mt-1">
            <span>Долгота:</span>
            <span className="font-semibold text-slate-100">
              {position ? formatLng(position.lng) : (
                <span className="inline-block w-16 h-3.5 bg-slate-800 animate-pulse rounded" />
              )}
            </span>
          </div>
        </div>

        {/* Orbital Parameters */}
        <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/70 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" /> Наклонение орбиты:
            </span>
            <span className="font-mono text-slate-200">{sat.inclinationDeg.toFixed(2)}°</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Период обращения:</span>
            <span className="font-mono text-slate-200">{sat.periodMin.toFixed(1)} мин (~{(sat.periodMin / 60).toFixed(1)} ч)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Эксцентриситет:</span>
            <span className="font-mono text-slate-200">{sat.eccentricity.toFixed(4)}</span>
          </div>
        </div>

        {/* Action button */}
        <button
          id="btn-card-track"
          onClick={() => {
            sounds.playSelect();
            onToggleTrack();
          }}
          className={`w-full py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isTracked
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25'
          }`}
        >
          {isTracked ? (
            <>
              <Crosshair className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
              Сопровождение активно (Камера привязана)
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Следить за спутником камерой
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
