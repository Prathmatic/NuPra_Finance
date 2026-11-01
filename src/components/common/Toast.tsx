import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    // Keep undo toasts up a bit longer (5.5s) to allow easy clicking
    const duration = toast.action ? 5500 : 3500;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const typeConfig = {
    success: {
      border: 'border-emerald-500/50 bg-slate-950/95',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_rgba(16,185,129,0.3)]',
    },
    info: {
      border: 'border-indigo-500/50 bg-slate-950/95',
      icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_rgba(99,102,241,0.3)]',
    },
    error: {
      border: 'border-rose-500/50 bg-slate-950/95',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_rgba(244,63,94,0.3)]',
    },
  };

  const config = typeConfig[toast.type || 'success'];

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[92%] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300"
      style={{
        top: 'max(48px, calc(env(safe-area-inset-top, 0px) + 20px))'
      }}
    >
      <div 
        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border ${config.border} ${config.glow} backdrop-blur-2xl text-white font-bold shadow-2xl`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            {config.icon}
          </div>
          <span className="truncate tracking-wide text-xs sm:text-sm">{toast.message}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide shadow-md transition-all active:scale-95 border border-indigo-400/40"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
