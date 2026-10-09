import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ExternalLink,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  Maximize2,
  Minimize2,
  FileText,
  Download
} from 'lucide-react';
import { PRESENTATION_SLIDES, SlideItem } from '../../data/presentationSlides';
import { sounds } from '../../utils/soundManager';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSatelliteById?: (id: string) => void;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  onClose,
  onSelectSatelliteById
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showSpeechNotes, setShowSpeechNotes] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Rehearsal Stopwatch State (target 7:00 = 420 seconds)
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const currentSlide: SlideItem = PRESENTATION_SLIDES[currentSlideIndex];
  const totalSlides = PRESENTATION_SLIDES.length;

  // Stopwatch effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev > 0) {
        sounds.playSelect();
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev < totalSlides - 1) {
        sounds.playSelect();
        return prev + 1;
      }
      return prev;
    });
  }, [totalSlides]);

  const handleGoToSlide = (index: number) => {
    sounds.playSelect();
    setCurrentSlideIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full max-w-5xl ${
          isFullscreen ? 'h-full max-w-full rounded-none border-none' : 'max-h-[94vh] h-[92vh]'
        }`}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Защита проекта «OrbitWatch»
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  День 15
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  v1.0.0 Release
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Шинин Чаян, гр. ИСП-401 • Презентация для аттестационной комиссии
              </p>
            </div>
          </div>

          {/* Rehearsal Timer & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stopwatch widget */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span
                className={`font-semibold ${
                  timerSeconds > 420
                    ? 'text-rose-400 animate-pulse'
                    : timerSeconds > 360
                    ? 'text-amber-400'
                    : 'text-cyan-300'
                }`}
              >
                {formatTimer(timerSeconds)}
              </span>
              <span className="text-[10px] text-slate-500">/ 07:00</span>

              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? 'Пауза секундомера' : 'Запустить таймер доклада'}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors ml-1"
              >
                {isTimerRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>

              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                title="Сбросить таймер"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Toggle Speech Notes */}
            <button
              onClick={() => setShowSpeechNotes(!showSpeechNotes)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                showSpeechNotes
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Показать / скрыть шпаргалку текста выступления"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Заметки спикера</span>
            </button>

            {/* Download PPTX presentation button */}
            <a
              href="/presentation.pptx"
              download="OrbitWatch_Presentation_Shinin_Chayan_ISP-43.pptx"
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60 transition-colors flex items-center gap-1.5"
              title="Скачать готовую презентацию в формате Microsoft PowerPoint (.pptx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Скачать .PPTX</span>
            </a>

            {/* Toggle Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Обычный режим' : 'Во весь экран'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-950/50 hover:border-rose-800 transition-colors"
              title="Закрыть презентацию"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Selector Carousel / Mini pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto scrollbar-thin">
          {PRESENTATION_SLIDES.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={slide.id}
                onClick={() => handleGoToSlide(idx)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20 scale-105'
                    : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
                title={`Слайд ${slide.id}: ${slide.title}`}
              >
                <span>#{slide.id}</span>
                <span className="hidden lg:inline max-w-[120px] truncate text-[11px]">
                  {slide.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slide Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950">
          <div className="space-y-6">
            {/* Top Slide Meta: Category, Number, Duration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                  {currentSlide.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {currentSlide.badge}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>⏱ Регламент: ~{currentSlide.durationSec} сек</span>
                <span className="text-cyan-400 font-bold">
                  {currentSlide.id} / {totalSlides}
                </span>
              </div>
            </div>

            {/* Slide Title and Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300 tracking-tight">
                {currentSlide.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-2 font-light">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Metrics cards if available */}
            {currentSlide.metrics && currentSlide.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {currentSlide.metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 shadow-inner flex flex-col justify-between"
                  >
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                      {metric.label}
                    </span>
                    <span
                      className={`text-lg sm:text-xl font-bold mt-1 font-mono ${
                        metric.color === 'emerald'
                          ? 'text-emerald-400'
                          : metric.color === 'cyan'
                          ? 'text-cyan-400'
                          : metric.color === 'indigo'
                          ? 'text-indigo-400'
                          : metric.color === 'amber'
                          ? 'text-amber-400'
                          : metric.color === 'rose'
                          ? 'text-rose-400'
                          : 'text-white'
                      }`}
                    >
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bullets List */}
            <div className="space-y-3 pt-2">
              {currentSlide.bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-slate-700/80 transition-colors"
                >
                  <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </div>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                    {bullet}
                  </p>
                </div>
              ))}
            </div>

            {/* Technical Diagram if present */}
            {currentSlide.diagram && currentSlide.diagram.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs sm:text-sm text-cyan-300/90 whitespace-pre overflow-x-auto shadow-inner">
                {currentSlide.diagram.join('\n')}
              </div>
            )}

            {/* Special Action button for Slide 6 (Live Demo) */}
            {currentSlide.demoAction === 'select_iss' && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playPing();
                    if (onSelectSatelliteById) {
                      onSelectSatelliteById('25544'); // ISS NORAD ID
                    }
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 group-hover:scale-125 transition-transform" />
                  <span>Перейти к интерактивному Live Demo МКС</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400">
                  (Закрывает окно слайдов и фокусирует 3D-камеру на Международной космической станции)
                </span>
              </div>
            )}
          </div>

          {/* Speaker Speech Notes Accordion */}
          {showSpeechNotes && (
            <div className="mt-6 pt-4 border-t border-slate-800/90 animate-fadeIn">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 relative">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Текст выступления (Заметки докладчика для Слайда #{currentSlide.id}):</span>
                </div>
                <p className="text-sm text-indigo-100/90 leading-relaxed font-sans italic">
                  «{currentSlide.speech}»
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
              <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">(←)</span>
            </button>

            <span className="text-xs font-mono text-slate-400 px-2">
              Слайд <span className="text-cyan-400 font-bold">{currentSlide.id}</span> из {totalSlides}
            </span>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex === totalSlides - 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 transition-colors shadow-sm shadow-cyan-400/20"
            >
              <span>Вперёд</span>
              <span className="hidden sm:inline text-[10px] text-slate-900/70 font-mono">(→)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick links & Hotkey help */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 hidden md:inline font-mono">
              Клавиши: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">←</kbd> / <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">→</kbd> или <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">Space</kbd>
            </span>

            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              Вернуться к 3D-глобусу
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
