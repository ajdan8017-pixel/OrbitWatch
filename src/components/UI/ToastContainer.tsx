import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Radio,
  Satellite
} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'satellite';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };

    setToasts((prev) => [...prev.slice(-3), newToast]);

    const dur = toast.duration || 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, dur);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        id="toast-notifications-container"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none select-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isWarn = toast.type === 'warning';
            const isSat = toast.type === 'satellite';

            return (
              <motion.div
                key={toast.id}
                id={`toast-${toast.id}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="pointer-events-auto p-3.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl flex items-start gap-3 text-slate-100"
              >
                <div className="mt-0.5 shrink-0">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isWarn && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {isSat && <Satellite className="w-5 h-5 text-cyan-400 animate-pulse" />}
                  {!isSuccess && !isWarn && !isSat && <Info className="w-5 h-5 text-cyan-400" />}
                </div>

                <div className="flex-1 pr-1">
                  <div className="text-xs font-bold text-white tracking-tight">
                    {toast.title}
                  </div>
                  {toast.message && (
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                      {toast.message}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
