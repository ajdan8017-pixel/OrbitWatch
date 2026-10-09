import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SpaceScene } from './components/Globe/SpaceScene';
import { Header } from './components/UI/Header';
import { SatelliteCard } from './components/UI/SatelliteCard';
import { FilterBar } from './components/UI/FilterBar';
import { TimeController } from './components/UI/TimeController';
import { SatelliteListDrawer } from './components/UI/SatelliteListDrawer';
import { MissionsModal } from './components/UI/MissionsModal';
import { PresentationModal } from './components/UI/PresentationModal';
import { ToastProvider, useToast } from './components/UI/ToastContainer';
import {
  SatelliteItem,
  FilterOptions,
  TimeState
} from './types';
import {
  loadInitialSatelliteCatalog,
  fetchTLEForGroup
} from './services/tleService';
import { sounds } from './utils/soundManager';

function OrbitWatchMain() {
  const { showToast } = useToast();

  // Main Satellite State
  const [satellites, setSatellites] = useState<SatelliteItem[]>([]);
  const [selectedSat, setSelectedSat] = useState<SatelliteItem | null>(null);
  const [dataSource, setDataSource] = useState<'celestrak' | 'cache' | 'fallback'>('fallback');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdatingTLE, setIsUpdatingTLE] = useState<boolean>(true);

  // View & Mode States
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isTrackSatellite, setIsTrackSatellite] = useState<boolean>(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState<boolean>(false);
  const [isSatListOpen, setIsSatListOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [isBloomEnabled, setIsBloomEnabled] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    selectedCategories: ['stations', 'navigation', 'weather', 'science', 'starlink', 'other'],
    showStarlink: true,
    minAltitude: 0,
    maxAltitude: 100000,
    orbitType: 'all'
  });

  // Time & Simulation State
  const [timeState, setTimeState] = useState<TimeState>({
    simulatedTime: new Date(),
    speedMultiplier: 1,
    isPaused: false
  });

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Load initial satellites on mount
  useEffect(() => {
    let isMounted = true;

    loadInitialSatelliteCatalog()
      .then((res) => {
        if (!isMounted) return;
        setSatellites(res.satellites);
        setDataSource(res.source);
        setLastUpdated(res.timestamp);
        setIsUpdatingTLE(false);

        showToastRef.current({
          type: res.source === 'celestrak' ? 'success' : 'info',
          title: res.source === 'celestrak' ? 'Данные CelesTrak обновлены' : 'Загружен кэш TLE',
          message: `В каталоге ${res.satellites.length} спутников на орбите`
        });

        // Pre-select ISS (ZARYA) by default for immediate engagement
        const iss = res.satellites.find((s) => s.id === '25544');
        if (iss) {
          setSelectedSat(iss);
        }
      })
      .catch((err) => {
        console.error('Failed to load initial satellite catalog:', err);
        if (isMounted) {
          setIsUpdatingTLE(false);
          showToastRef.current({
            type: 'warning',
            title: 'Сбой подключения к CelesTrak',
            message: 'Используются резервные орбитальные данные'
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual TLE refresh
  const handleRefreshTLE = useCallback(async () => {
    sounds.playWarp();
    setIsUpdatingTLE(true);
    showToastRef.current({
      type: 'info',
      title: 'Синхронизация с CelesTrak...',
      message: 'Запрос свежих TLE строк...'
    });

    try {
      const res = await loadInitialSatelliteCatalog();
      setSatellites(res.satellites);
      setDataSource(res.source);
      setLastUpdated(res.timestamp);
      showToastRef.current({
        type: 'success',
        title: 'Орбиты актуализированы',
        message: `Обновлено ${res.satellites.length} объектов`
      });
    } catch (err) {
      console.warn('TLE update error:', err);
      showToastRef.current({
        type: 'warning',
        title: 'Ошибка обновления TLE',
        message: 'Проверьте сетевое соединение'
      });
    } finally {
      setIsUpdatingTLE(false);
    }
  }, []);

  // Animation time-step loop for simulation
  const lastRealTimeRef = useRef<number>(performance.now());
  const lastStateUpdateRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastRealTimeRef.current) / 1000;
      lastRealTimeRef.current = now;

      if (!timeState.isPaused && deltaSec > 0 && deltaSec < 2) {
        if (now - lastStateUpdateRef.current >= 35) {
          const elapsedSec = (now - lastStateUpdateRef.current) / 1000;
          lastStateUpdateRef.current = now;
          setTimeState((prev) => {
            const addedMs = elapsedSec * prev.speedMultiplier * 1000;
            return {
              ...prev,
              simulatedTime: new Date(prev.simulatedTime.getTime() + addedMs)
            };
          });
        }
      }

      animId = requestAnimationFrame(tick);
    };

    lastRealTimeRef.current = performance.now();
    lastStateUpdateRef.current = performance.now();
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [timeState.isPaused, timeState.speedMultiplier]);

  const handleResetToRealtime = useCallback(() => {
    setTimeState({
      simulatedTime: new Date(),
      speedMultiplier: 1,
      isPaused: false
    });
    sounds.playPing();
    showToastRef.current({
      type: 'info',
      title: 'Синхронизация времени',
      message: 'Текущее реальное время UTC'
    });
  }, []);

  // Selected satellite handler
  const handleSelectSatellite = useCallback((sat: SatelliteItem | null) => {
    setSelectedSat(sat);
    if (sat) {
      setIsAutoRotate(false);
      showToastRef.current({
        type: 'satellite',
        title: sat.name,
        message: `NORAD ${sat.id} • Апогей ~${sat.apogeeKm} км`
      });
    }
  }, []);

  // Bloom toggle handler
  const handleToggleBloom = useCallback(() => {
    setIsBloomEnabled((prev) => {
      const next = !prev;
      showToastRef.current({
        type: 'info',
        title: next ? 'Bloom Glow: Включен' : 'Bloom Glow: Выключен',
        message: next ? 'Кинематографическое свечение активно' : 'Стандартный рендеринг'
      });
      return next;
    });
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setIsAutoRotate((prev) => !prev);
  }, []);

  const handleToggleTrackSatellite = useCallback((val: boolean) => {
    setIsTrackSatellite(val);
    if (val && selectedSat) {
      showToastRef.current({
        type: 'info',
        title: 'Сопровождение объекта',
        message: `Камера зафиксирована на ${selectedSat.name}`
      });
    }
  }, [selectedSat]);

  // Compute category counts for filters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      stations: 0,
      navigation: 0,
      weather: 0,
      science: 0,
      starlink: 0,
      other: 0
    };
    for (const sat of satellites) {
      if (counts[sat.category] !== undefined) {
        counts[sat.category]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [satellites]);

  // Visible satellites count after filtering
  const visibleCount = useMemo(() => {
    return satellites.filter(sat => {
      if (!filters.selectedCategories.includes(sat.category)) return false;
      if (sat.category === 'starlink' && !filters.showStarlink) return false;
      if (filters.orbitType === 'leo' && sat.apogeeKm > 2000) return false;
      if (filters.orbitType === 'meo' && (sat.apogeeKm < 2000 || sat.apogeeKm > 35000)) return false;
      if (filters.orbitType === 'geo' && (sat.apogeeKm < 35000 || sat.apogeeKm > 36500)) return false;
      if (filters.searchQuery.trim().length > 0) {
        const q = filters.searchQuery.toLowerCase().trim();
        if (!sat.name.toLowerCase().includes(q) && !sat.id.includes(q)) return false;
      }
      return true;
    }).length;
  }, [satellites, filters]);

  const isRealtime = useMemo(() => {
    const now = Date.now();
    const sim = timeState.simulatedTime.getTime();
    return Math.abs(now - sim) < 5000 && timeState.speedMultiplier === 1 && !timeState.isPaused;
  }, [timeState]);

  return (
    <div
      id="orbitwatch-app-root"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* 1. Header Toolbar */}
      <Header
        totalCount={satellites.length}
        visibleCount={visibleCount}
        dataSource={dataSource}
        lastUpdated={lastUpdated}
        isUpdatingTLE={isUpdatingTLE}
        onRefreshTLE={handleRefreshTLE}
        onOpenMissions={() => {
          sounds.playSelect();
          setIsMissionsOpen(true);
        }}
        onOpenSatelliteList={() => {
          sounds.playSelect();
          setIsSatListOpen(true);
        }}
        onOpenPresentation={() => {
          sounds.playSelect();
          setIsPresentationOpen(true);
        }}
        simulatedTime={timeState.simulatedTime}
        isRealtime={isRealtime}
        isBloomEnabled={isBloomEnabled}
        onToggleBloom={handleToggleBloom}
      />

      {/* 2. 3D WebGL Space Scene & Earth Globe */}
      <SpaceScene
        satellites={satellites}
        selectedSat={selectedSat}
        onSelectSatellite={handleSelectSatellite}
        filters={filters}
        timeState={timeState}
        isAutoRotate={isAutoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
        isTrackSatellite={isTrackSatellite}
        onToggleTrackSatellite={handleToggleTrackSatellite}
        isBloomEnabled={isBloomEnabled}
      />

      {/* 3. Satellite Telemetry Detail Card */}
      {selectedSat && (
        <SatelliteCard
          sat={selectedSat}
          simulatedTime={timeState.simulatedTime}
          onClose={() => {
            setSelectedSat(null);
            setIsTrackSatellite(false);
          }}
          isTracked={isTrackSatellite}
          onToggleTrack={() => setIsTrackSatellite(!isTrackSatellite)}
        />
      )}

      {/* 4. Filter and Search Control Bar */}
      <FilterBar
        filters={filters}
        onChangeFilters={setFilters}
        categoryCounts={categoryCounts}
      />

      {/* 5. Simulation Time Controller */}
      <TimeController
        timeState={timeState}
        onChangeTimeState={setTimeState}
        onResetToRealtime={handleResetToRealtime}
        isRealtime={isRealtime}
      />

      {/* 6. Satellite Catalog Drawer */}
      <SatelliteListDrawer
        isOpen={isSatListOpen}
        onClose={() => setIsSatListOpen(false)}
        satellites={satellites}
        selectedSat={selectedSat}
        onSelectSat={(sat) => {
          handleSelectSatellite(sat);
        }}
      />

      {/* 7. Space Missions & Astronauts Modal */}
      <MissionsModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
      />

      {/* 8. Project Defense & Slides Modal (Day 15) */}
      <PresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onSelectSatelliteById={(id) => {
          const sat = satellites.find((s) => s.id === id);
          if (sat) {
            handleSelectSatellite(sat);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <OrbitWatchMain />
    </ToastProvider>
  );
}
