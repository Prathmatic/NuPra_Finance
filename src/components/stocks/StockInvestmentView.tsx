import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Calendar, 
  PieChart, 
  DollarSign, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { formatCurrency, formatDate, formatMonthYear } from '../../utils/formatters';

interface StockInvestmentViewProps {
  onOpenAddStockModal: () => void;
}

export const StockInvestmentView: React.FC<StockInvestmentViewProps> = ({ onOpenAddStockModal }) => {
  const { stocks, currency, currentUser, partner, deleteStock } = useFinance();

  // Find all distinct months in stocks records
  const availableMonths = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthsSet = new Set<string>([currentMonth]);
    stocks.forEach(s => {
      if (s.monthYear) monthsSet.add(s.monthYear);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [stocks]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().slice(0, 7)
  );

  // Month-specific calculations (Explicit user requirement)
  const monthStats = useMemo(() => {
    let totalMonth = 0;
    let myMonth = 0;
    let partnerMonth = 0;

    stocks.filter(s => s.monthYear === selectedMonth).forEach(s => {
      totalMonth += s.investedAmount;
      if (s.userId === currentUser.id) {
        myMonth += s.investedAmount;
      } else {
        partnerMonth += s.investedAmount;
      }
    });

    const myPct = totalMonth > 0 ? Math.round((myMonth / totalMonth) * 100) : 0;
    const partnerPct = totalMonth > 0 ? Math.round((partnerMonth / totalMonth) * 100) : 0;

    return { totalMonth, myMonth, partnerMonth, myPct, partnerPct };
  }, [stocks, selectedMonth, currentUser]);

  // Overall Individual Capital Breakdown (Explicit user requirement)
  const allTimeStats = useMemo(() => {
    let totalAllTime = 0;
    let myTotal = 0;
    let partnerTotal = 0;

    stocks.forEach(s => {
      totalAllTime += s.investedAmount;
      if (s.userId === currentUser.id) {
        myTotal += s.investedAmount;
      } else {
        partnerTotal += s.investedAmount;
      }
    });

    return { totalAllTime, myTotal, partnerTotal };
  }, [stocks, currentUser]);

  // Filtered investments list
  const currentMonthStocks = useMemo(() => {
    return stocks.filter(s => s.monthYear === selectedMonth);
  }, [stocks, selectedMonth]);

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/70 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-glow-indigo">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Stock Market Portfolio</h2>
              <p className="text-xs text-slate-400">Monthly Investments & Capital Split</p>
            </div>
          </div>

          <button
            onClick={onOpenAddStockModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
        </div>

        {/* Month Selector Pill */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-2xl border border-white/5">
          <span className="text-xs text-slate-400 font-medium pl-2">Filter by Month:</span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {availableMonths.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedMonth === m
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {formatMonthYear(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Done That Month by Both (User Key Requirement) */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Total Invested in {formatMonthYear(selectedMonth)}</p>
              <p className="text-2xl font-black text-indigo-400">
                {formatCurrency(monthStats.totalMonth, currency)}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              Joint Capital
            </span>
          </div>

          {/* Visual Bar Split for this month */}
          {monthStats.totalMonth > 0 && partner && (
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-800 flex overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${monthStats.myPct}%` }}
                  title={`${currentUser.name}: ${monthStats.myPct}%`}
                />
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${monthStats.partnerPct}%` }}
                  title={`${partner.name}: ${monthStats.partnerPct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300 font-medium">{currentUser.name}:</span>
                  <span className="text-rose-400 font-bold">{formatCurrency(monthStats.myMonth, currency)} ({monthStats.myPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-slate-300 font-medium">{partner.name}:</span>
                  <span className="text-indigo-400 font-bold">{formatCurrency(monthStats.partnerMonth, currency)} ({monthStats.partnerPct}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Stock Market Capital Cards (All Time) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2.5 px-1">
          Individual Stock Market Capital (Total Portfolio)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-3xl border border-rose-500/30 bg-rose-950/20 space-y-1">
            <div className="flex items-center gap-2">
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-rose-500" />
              <p className="text-xs font-bold text-slate-200">{currentUser.name}'s Capital</p>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-rose-400 pt-1">
              {formatCurrency(allTimeStats.myTotal, currency)}
            </p>
            <p className="text-[10px] text-slate-400">Total invested in equities</p>
          </div>

          {partner && (
            <div className="glass-card p-4 rounded-3xl border border-indigo-500/30 bg-indigo-950/20 space-y-1">
              <div className="flex items-center gap-2">
                <img src={partner.avatarUrl} alt={partner.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-500" />
                <p className="text-xs font-bold text-slate-200">{partner.name}'s Capital</p>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-indigo-400 pt-1">
                {formatCurrency(allTimeStats.partnerTotal, currency)}
              </p>
              <p className="text-[10px] text-slate-400">Total invested in equities</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Holdings & Additions List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Holdings Added in {formatMonthYear(selectedMonth)}
          </h3>
          <span className="text-xs text-slate-400">{currentMonthStocks.length} assets</span>
        </div>

        {currentMonthStocks.length === 0 ? (
          <div className="glass-card p-8 rounded-3xl text-center space-y-2">
            <p className="text-sm font-semibold text-white">No stocks added in {formatMonthYear(selectedMonth)}</p>
            <p className="text-xs text-slate-400">Tap "+ Add Stock" to log equity purchases for this month.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentMonthStocks.map((stock) => (
              <div
                key={stock.id}
                className="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-slate-800/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {stock.ticker?.slice(0, 3) || 'STK'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{stock.assetName}</p>
                      {stock.ticker && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                          {stock.ticker}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{formatDate(stock.date)}</span>
                      {stock.shares && <span>• {stock.shares} units</span>}
                      {stock.notes && <span className="italic truncate max-w-[120px]">({stock.notes})</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-black text-indigo-400">
                      {formatCurrency(stock.investedAmount, currency)}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {stock.userAvatar && (
                        <img src={stock.userAvatar} alt={stock.userName} className="w-3.5 h-3.5 rounded-full object-cover" />
                      )}
                      <span className="text-[10px] text-slate-400">{stock.userName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteStock(stock.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Remove stock entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
