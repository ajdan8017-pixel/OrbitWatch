import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Rocket,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  AlertCircle,
  Video
} from 'lucide-react';
import { LaunchMission, Astronaut } from '../../types';
import { fetchSpaceMissions, fetchAstronautsInSpace } from '../../services/missionsService';
import { sounds } from '../../utils/soundManager';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'launches' | 'astros' | 'about'>('launches');
  const [missions, setMissions] = useState<LaunchMission[]>([]);
  const [astros, setAstros] = useState<Astronaut[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([fetchSpaceMissions(), fetchAstronautsInSpace()])
      .then(([missionsData, astrosData]) => {
        if (!isMounted) return;
        setMissions(missionsData);
        setAstros(astrosData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching missions modal data:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="missions-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none"
          onClick={onClose}
        >
          <motion.div
            id="missions-modal-content"
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="w-full max-w-4xl max-h-[85vh] bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Космические миссии & Запуски
              </h2>
              <p className="text-xs text-slate-400">
                Данные миссий SpaceX API, NASA и текущий статус космонавтов на орбите
              </p>
            </div>
          </div>

          <button
            id="btn-close-missions"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-900/30 text-xs font-medium">
          <button
            id="tab-launches"
            onClick={() => {
              sounds.playSelect();
              setActiveTab('launches');
            }}
            className={`pb-3 px-2 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'launches'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            Запуски и полеты ({missions.length})
          </button>

          <button
            id="tab-astros"
            onClick={() => {
              sounds.playSelect();
              setActiveTab('astros');
            }}
            className={`pb-3 px-2 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'astros'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Люди в космосе ({astros.length})
          </button>

          <button
            id="tab-about"
            onClick={() => {
              sounds.playSelect();
              setActiveTab('about');
            }}
            className={`pb-3 px-2 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'about'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            О технологии SGP4
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <Rocket className="w-8 h-8 text-cyan-400 animate-bounce" />
              <p className="text-xs font-mono">Загрузка космических данных с серверов...</p>
            </div>
          ) : activeTab === 'launches' ? (
            <div className="space-y-4">
              {missions.map((mission) => {
                const isSuccess = mission.success === true;
                const isUpcoming = mission.upcoming === true;

                return (
                  <div
                    key={mission.id}
                    id={`mission-card-${mission.id}`}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row gap-5"
                  >
                    {/* Mission patch or icon */}
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 p-2 shrink-0 self-start">
                      {mission.patchUrl ? (
                        <img
                          src={mission.patchUrl}
                          alt={mission.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Rocket className="w-7 h-7 text-amber-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-cyan-400 font-semibold">
                              {mission.rocket}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs font-mono text-slate-400">
                              {formatDate(mission.dateUtc)}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                            {mission.name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isUpcoming ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                              <Clock className="w-3.5 h-3.5" /> Запланирован
                            </span>
                          ) : isSuccess ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Успешный пуск
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-950/80 text-rose-300 border border-rose-800">
                              <AlertCircle className="w-3.5 h-3.5" /> Частичный успех
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {mission.details}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {mission.launchpad}
                        </span>

                        {mission.payloads && mission.payloads.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {mission.payloads.join(', ')}
                          </span>
                        )}

                        {mission.webcastUrl && (
                          <a
                            href={mission.webcastUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 ml-auto font-sans"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Трансляция <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'astros' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    В данный момент в космосе находятся {astros.length} человек
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Экипажи Международной космической станции (МКС) и китайской орбитальной станции «Тяньгун»
                  </p>
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-400 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                  {astros.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {astros.map((person, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400">
                        {person.name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{person.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Космонавт / Астронавт</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                      {person.craft}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Модель SGP4 и TLE (Two-Line Elements)
                </h3>
                <p>
                  Двухстрочный набор элементов (TLE) — стандартный формат данных, используемый NORAD и CelesTrak для кодирования параметров орбиты космических объектов вокруг Земли.
                </p>
                <p>
                  В OrbitWatch библиотека <strong className="text-white">satellite.js</strong> реализует аналитическую модель возмущений <strong className="text-white">SGP4 (Simplified General Perturbations-4)</strong>. Она учитывает сжатие Земли (гравитационные гармоники $J_2, J_3, J_4$), гравитационное влияние Луны и Солнца, а также сопротивление верхних слоев земной атмосферы.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="font-bold text-cyan-300 mb-1">CelesTrak API</div>
                  <p className="text-slate-400 text-[11px]">
                    Служба доктора Т.С. Келсо, обновляющая орбитальные данные каждые несколько часов на основе радарных измерений Космических сил США.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="font-bold text-cyan-300 mb-1">Координаты ECI и GST</div>
                  <p className="text-slate-400 text-[11px]">
                    Орбиты рассчитываются в геоцентрической инерциальной системе (ECI) и проецируются на сферу Земли с учетом гринвичского звездного времени (GST).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
