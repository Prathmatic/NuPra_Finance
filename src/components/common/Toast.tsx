import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const typeConfig = {
    success: {
      border: 'border-emerald-500/40 bg-slate-950/95',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgb(16,185,129,0.2)]',
    },
    info: {
      border: 'border-indigo-500/40 bg-slate-950/95',
      icon: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgb(99,102,241,0.2)]',
    },
    error: {
      border: 'border-rose-500/40 bg-slate-950/95',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
      glow: 'shadow-[0_8px_30px_rgb(244,63,94,0.2)]',
    },
  };

  const config = typeConfig[toast.type || 'success'];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
      <div 
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${config.border} ${config.glow} backdrop-blur-xl text-white text-xs font-semibold`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {config.icon}
          <span className="truncate">{toast.message}</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
