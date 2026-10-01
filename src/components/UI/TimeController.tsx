import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Clock,
  Radio
} from 'lucide-react';
import { TimeState } from '../../types';
import { sounds } from '../../utils/soundManager';

interface TimeControllerProps {
  timeState: TimeState;
  onChangeTimeState: (newState: TimeState) => void;
  onResetToRealtime: () => void;
  isRealtime: boolean;
}

const SPEED_PRESETS = [1, 5, 15, 60, 300];

export const TimeController: React.FC<TimeControllerProps> = ({
  timeState,
  onChangeTimeState,
  onResetToRealtime,
  isRealtime
}) => {
  const togglePlayPause = () => {
    sounds.playSelect();
    onChangeTimeState({
      ...timeState,
      isPaused: !timeState.isPaused
    });
  };

  const setSpeed = (multiplier: number) => {
    sounds.playWarp();
    onChangeTimeState({
      ...timeState,
      speedMultiplier: multiplier,
      isPaused: false
    });
  };

  const stepTime = (minutes: number) => {
    sounds.playSelect();
    const newTime = new Date(timeState.simulatedTime.getTime() + minutes * 60 * 1000);
    onChangeTimeState({
      ...timeState,
      simulatedTime: newTime
    });
  };

  return (
    <div
      id="time-controller-bar"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl text-slate-100 select-none"
    >
      {/* Play/Pause Button */}
      <button
        id="btn-time-play-pause"
        onClick={togglePlayPause}
        title={timeState.isPaused ? 'Запустить симуляцию' : 'Пауза'}
        className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all"
      >
        {timeState.isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4 fill-current" />}
      </button>

      {/* Step Back & Forward */}
      <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
        <button
          id="btn-step-backward"
          onClick={() => stepTime(-15)}
          title="Назад на 15 минут"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Rewind className="w-3.5 h-3.5" />
        </button>

        <button
          id="btn-step-forward"
          onClick={() => stepTime(15)}
          title="Вперед на 15 минут"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Speed Multipliers */}
      <div className="flex items-center gap-1 font-mono text-xs">
        {SPEED_PRESETS.map((speed) => {
          const isActive = !timeState.isPaused && timeState.speedMultiplier === speed;
          return (
            <button
              key={speed}
              id={`btn-speed-${speed}x`}
              onClick={() => setSpeed(speed)}
              className={`px-2 py-1 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {speed}x
            </button>
          );
        })}
      </div>

      {/* Reset to Realtime button */}
      <div className="border-l border-slate-800 pl-2">
        <button
          id="btn-reset-realtime"
          onClick={() => {
            sounds.playPing();
            onResetToRealtime();
          }}
          title="Синхронизировать с реальным временем"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all ${
            isRealtime
              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 shadow-sm shadow-emerald-900/30'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Сейчас</span>
          {isRealtime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
        </button>
      </div>
    </div>
  );
};
