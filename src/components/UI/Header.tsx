import React, { useState, useEffect } from 'react';
import {
  Rocket,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  List,
  Orbit,
  Clock,
  Radio,
  Sparkles
} from 'lucide-react';
import { sounds } from '../../utils/soundManager';

interface HeaderProps {
  totalCount: number;
  visibleCount: number;
  dataSource: 'celestrak' | 'cache' | 'fallback';
  lastUpdated: Date;
  isUpdatingTLE: boolean;
  onRefreshTLE: () => void;
  onOpenMissions: () => void;
  onOpenSatelliteList: () => void;
  simulatedTime: Date;
  isRealtime: boolean;
  isBloomEnabled: boolean;
  onToggleBloom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  visibleCount,
  dataSource,
  lastUpdated,
  isUpdatingTLE,
  onRefreshTLE,
  onOpenMissions,
  onOpenSatelliteList,
  simulatedTime,
  isRealtime,
  isBloomEnabled,
  onToggleBloom
}) => {
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleAudio = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    sounds.enabled = next;
    if (next) sounds.playPing();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const formatUtcTime = (d: Date) => {
    return d.toISOString().substring(11, 19) + ' UTC';
  };

  const formatDate = (d: Date) => {
    return d.toISOString().substring(0, 10);
  };

  return (
    <header
      id="main-header"
      className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 select-none shadow-2xl"
    >
      {/* Brand & Identity */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
          <Orbit className="w-5 h-5 animate-spin" style={{ animationDuration: '24s' }} />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              OrbitWatch
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-800/80">
                SGP4 Real-time
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            3D-визуализация спутников и миссий
          </p>
        </div>
      </div>

      {/* Center: Mission Time Clock */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-100 font-semibold">{formatUtcTime(simulatedTime)}</span>
          <span className="text-slate-500 text-[11px]">{formatDate(simulatedTime)}</span>
        </div>
        {isRealtime ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
          </span>
        ) : (
          <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
            SIM WARP
          </span>
        )}
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* TLE Status & Refresh */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'celestrak' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
            <span className="text-slate-300 text-[11px]">
              {dataSource === 'celestrak' ? 'CelesTrak' : 'Кэш TLE'}:
            </span>
            <span className="text-cyan-400 font-semibold">{visibleCount} / {totalCount}</span>
          </div>

          <button
            id="btn-refresh-tle"
            onClick={onRefreshTLE}
            disabled={isUpdatingTLE}
            title="Обновить TLE орбитальные данные с CelesTrak"
            className="ml-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingTLE ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Space Missions Button */}
        <button
          id="btn-open-missions"
          onClick={onOpenMissions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm group"
        >
          <Rocket className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Миссии & Запуски</span>
          <span className="sm:hidden">Миссии</span>
        </button>

        {/* Satellite List Drawer Button */}
        <button
          id="btn-open-sat-list"
          onClick={onOpenSatelliteList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm"
        >
          <List className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Каталог</span>
        </button>

        {/* Bloom Glow Effect Toggle */}
        <button
          id="btn-toggle-bloom"
          onClick={() => {
            sounds.playSelect();
            onToggleBloom();
          }}
          title={isBloomEnabled ? 'Отключить кинематографический Bloom' : 'Включить кинематографический Bloom'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
            isBloomEnabled
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline text-[11px] font-mono">Glow</span>
        </button>

        {/* Audio Toggle */}
        <button
          id="btn-toggle-audio"
          onClick={toggleAudio}
          title={isAudioOn ? 'Выключить звук' : 'Включить звуковые эффекты'}
          className={`p-2 rounded-xl text-xs border transition-all ${
            isAudioOn
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
          }`}
        >
          {isAudioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          id="btn-toggle-fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          className="hidden sm:flex p-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
