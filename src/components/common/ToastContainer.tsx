import React from 'react';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';
import type { ToastNotification } from '../../types/timeline';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md text-zinc-100 transition-all transform animate-in slide-in-from-top-2 duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : isWarning ? (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white tracking-tight">
                {toast.title}
              </h4>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
