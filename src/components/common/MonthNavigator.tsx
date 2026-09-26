import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface MonthNavigatorProps {
  className?: string;
  showAllTimeOption?: boolean;
  isAllTime?: boolean;
  onToggleAllTime?: () => void;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  className = '',
  showAllTimeOption = false,
  isAllTime = false,
  onToggleAllTime,
}) => {
  const { selectedMonth, goToPreviousMonth, goToNextMonth, setSelectedMonth } = useFinance();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonthStr && !isAllTime;

  // Format YYYY-MM into "Month Year" (e.g., "September 2026")
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const jumpToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
    if (isAllTime && onToggleAllTime) {
      onToggleAllTime();
    }
  };

  return (
    <div 
      className={`glass-card p-2.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs shadow-md ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={goToPreviousMonth}
          disabled={isAllTime}
          className={`p-1.5 rounded-xl border border-white/5 transition-all ${
            isAllTime 
              ? 'opacity-30 cursor-not-allowed bg-slate-900/40 text-slate-500' 
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95'
          }`}
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 px-1">
          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-bold text-white tracking-wide text-xs sm:text-sm">
            {isAllTime ? 'All Time History' : formatMonthDisplay(selectedMonth)}
          </span>
        </div>

        <button
          onClick={goToNextMonth}
          disabled={isAllTime}
          className={`p-1.5 rounded-xl border border-white/5 transition-all ${
            isAllTime 
              ? 'opacity-30 cursor-not-allowed bg-slate-900/40 text-slate-500' 
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95'
          }`}
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {!isCurrentMonth && (
          <button
            onClick={jumpToCurrentMonth}
            className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all active:scale-95"
          >
            Today
          </button>
        )}

        {showAllTimeOption && onToggleAllTime && (
          <button
            onClick={onToggleAllTime}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
              isAllTime
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {isAllTime ? 'By Month' : 'All Time'}
          </button>
        )}
      </div>
    </div>
  );
};
