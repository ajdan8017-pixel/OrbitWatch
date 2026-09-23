import React from 'react';
import {
  Search,
  X,
  Filter,
  Layers,
  Radio,
  SlidersHorizontal
} from 'lucide-react';
import { FilterOptions, SatelliteCategory } from '../../types';
import { sounds } from '../../utils/soundManager';

interface FilterBarProps {
  filters: FilterOptions;
  onChangeFilters: (newFilters: FilterOptions) => void;
  categoryCounts: Record<string, number>;
}

const CATEGORIES: { id: SatelliteCategory; label: string; color: string }[] = [
  { id: 'stations', label: 'Станции (МКС)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 active:border-amber-400' },
  { id: 'navigation', label: 'Навигация (GPS)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'weather', label: 'Погода & ДЗЗ', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'science', label: 'Наука & Телескопы', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'starlink', label: 'Starlink', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  categoryCounts
}) => {
  const handleToggleCategory = (catId: string) => {
    sounds.playSelect();
    const current = new Set(filters.selectedCategories);
    if (current.has(catId)) {
      if (current.size > 1) {
        current.delete(catId);
      }
    } else {
      current.add(catId);
    }
    onChangeFilters({
      ...filters,
      selectedCategories: Array.from(current)
    });
  };

  const handleSelectAllCategories = () => {
    sounds.playSelect();
    onChangeFilters({
      ...filters,
      selectedCategories: ['stations', 'navigation', 'weather', 'science', 'starlink', 'other']
    });
  };

  const handleToggleStarlink = () => {
    sounds.playSelect();
    onChangeFilters({
      ...filters,
      showStarlink: !filters.showStarlink
    });
  };

  const handleOrbitTypeChange = (type: 'all' | 'leo' | 'meo' | 'geo') => {
    sounds.playSelect();
    onChangeFilters({
      ...filters,
      orbitType: type
    });
  };

  return (
    <div
      id="satellite-filter-bar"
      className="absolute top-18 right-4 sm:right-6 z-20 w-80 sm:w-88 flex flex-col gap-2 bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-3 shadow-2xl text-slate-100 select-none"
    >
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          id="input-satellite-search"
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChangeFilters({ ...filters, searchQuery: e.target.value })}
          placeholder="Поиск спутника или NORAD ID..."
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
        />
        {filters.searchQuery && (
          <button
            id="btn-clear-search"
            onClick={() => onChangeFilters({ ...filters, searchQuery: '' })}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Orbit classification tabs */}
      <div className="flex items-center justify-between gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] font-mono">
        <button
          id="btn-orbit-all"
          onClick={() => handleOrbitTypeChange('all')}
          className={`flex-1 py-1 rounded-lg text-center transition-all ${
            filters.orbitType === 'all'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Все
        </button>
        <button
          id="btn-orbit-leo"
          onClick={() => handleOrbitTypeChange('leo')}
          title="Низкая околоземная орбита (< 2000 км)"
          className={`flex-1 py-1 rounded-lg text-center transition-all ${
            filters.orbitType === 'leo'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          НОО
        </button>
        <button
          id="btn-orbit-meo"
          onClick={() => handleOrbitTypeChange('meo')}
          title="Средняя околоземная орбита (2000 - 35000 км)"
          className={`flex-1 py-1 rounded-lg text-center transition-all ${
            filters.orbitType === 'meo'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ССО
        </button>
        <button
          id="btn-orbit-geo"
          onClick={() => handleOrbitTypeChange('geo')}
          title="Геостационарная орбита (~35786 км)"
          className={`flex-1 py-1 rounded-lg text-center transition-all ${
            filters.orbitType === 'geo'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ГСО
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {CATEGORIES.map((cat) => {
          const isSelected = filters.selectedCategories.includes(cat.id);
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              id={`btn-cat-${cat.id}`}
              onClick={() => handleToggleCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                isSelected
                  ? cat.color
                  : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current' : 'bg-slate-600'}`} />
              {cat.label}
              <span className="font-mono text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Starlink Rapid Toggle & Reset */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
          <input
            id="toggle-starlink-visible"
            type="checkbox"
            checked={filters.showStarlink}
            onChange={handleToggleStarlink}
            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Показывать Starlink ({categoryCounts.starlink || 0})</span>
        </label>

        <button
          id="btn-reset-filters"
          onClick={handleSelectAllCategories}
          className="text-slate-400 hover:text-cyan-400 transition-colors"
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
};
