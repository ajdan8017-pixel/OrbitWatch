import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Orbit,
  ChevronRight,
  Radio
} from 'lucide-react';
import { SatelliteItem } from '../../types';
import { sounds } from '../../utils/soundManager';

interface SatelliteListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  satellites: SatelliteItem[];
  selectedSat: SatelliteItem | null;
  onSelectSat: (sat: SatelliteItem) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  stations: 'bg-amber-400 shadow-sm shadow-amber-400/50',
  starlink: 'bg-cyan-400 shadow-sm shadow-cyan-400/50',
  navigation: 'bg-emerald-400 shadow-sm shadow-emerald-400/50',
  weather: 'bg-indigo-400 shadow-sm shadow-indigo-400/50',
  science: 'bg-rose-400 shadow-sm shadow-rose-400/50',
  other: 'bg-slate-400'
};

export const SatelliteListDrawer: React.FC<SatelliteListDrawerProps> = ({
  isOpen,
  onClose,
  satellites,
  selectedSat,
  onSelectSat
}) => {
  const [localSearch, setLocalSearch] = useState('');

  const filtered = satellites.filter(sat => {
    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase().trim();
    return (
      sat.name.toLowerCase().includes(q) ||
      sat.id.includes(q) ||
      sat.category.includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="satellite-list-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-start select-none"
          onClick={onClose}
        >
          <motion.div
            id="satellite-list-drawer-content"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-full max-w-sm sm:max-w-md h-full bg-slate-950/95 border-r border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Orbit className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Каталог спутников
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Всего в выборке: {filtered.length} объектов
                  </p>
                </div>
              </div>

              <button
                id="btn-close-drawer"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Local Search Input */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/30">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="input-drawer-search"
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Фильтр по названию или NORAD..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Satellites Scroll List */}
            <div
              id="satellite-drawer-items"
              className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1"
            >
              {satellites.length === 0 ? (
                /* Loading skeletons */
                <div className="p-3 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-800 rounded" />
                          <div className="w-20 h-2.5 bg-slate-800/60 rounded" />
                        </div>
                      </div>
                      <div className="w-4 h-4 bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Спутники по вашему запросу не найдены.
                </div>
              ) : (
                filtered.map((sat) => {
                  const isSelected = selectedSat?.id === sat.id;
                  const dotColor = CATEGORY_COLORS[sat.category] || 'bg-slate-400';

                  return (
                    <div
                      key={sat.id}
                      id={`drawer-sat-${sat.id}`}
                      onClick={() => {
                        sounds.playSelect();
                        onSelectSat(sat);
                        onClose();
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-cyan-950/60 border border-cyan-800/80 text-white'
                          : 'hover:bg-slate-900/80 text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                        <div>
                          <div className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                            {sat.name}
                            {isSelected && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                Выбран
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>NORAD {sat.id}</span>
                            <span>•</span>
                            <span className="text-cyan-400">~{sat.apogeeKm} км</span>
                            <span>•</span>
                            <span>{sat.periodMin.toFixed(0)} мин</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
