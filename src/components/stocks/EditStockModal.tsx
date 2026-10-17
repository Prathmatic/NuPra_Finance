import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { StockInvestment } from '../../types/finance';
import { X, TrendingUp, Check, DollarSign, Calendar, Lock } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/formatters';

interface EditStockModalProps {
  stock: StockInvestment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({ stock, isOpen, onClose }) => {
  const { currentUser, currency, updateStock, convertInputToBase, exchangeRate } = useFinance();
  const [assetName, setAssetName] = useState('');
  const [ticker, setTicker] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [shares, setShares] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (stock) {
      setAssetName(stock.assetName);
      setTicker(stock.ticker || '');
      const displayAmt = currency === 'INR'
        ? Math.round(stock.investedAmount * exchangeRate).toString()
        : stock.investedAmount.toString();
      setInvestedAmount(displayAmt);
      setShares(stock.shares ? stock.shares.toString() : '');
      setDate(stock.date);
      setNotes(stock.notes || '');
    }
  }, [stock, currency, exchangeRate]);

  if (!isOpen || !stock || !currentUser) return null;

  // Security guard: Only the stock owner/purchaser can modify it
  if (stock.userId !== currentUser.id) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stock.userId !== currentUser.id) return;
    const amountNum = parseFloat(investedAmount);
    if (!assetName.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const baseInvested = convertInputToBase(amountNum);

    updateStock({
      ...stock,
      assetName: assetName.trim(),
      ticker: ticker.trim().toUpperCase() || undefined,
      investedAmount: baseInvested,
      shares: shares ? parseFloat(shares) : undefined,
      date,
      monthYear: date.slice(0, 7),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-glow-indigo">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Stock Investment</h2>
              <p className="text-xs text-slate-400">Modify your equity contribution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Asset / Stock Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. NIFTY 50 Index ETF"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ticker / Symbol</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="e.g. NIFTYBEES"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Units / Shares</label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="Optional"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Invested Amount ({currencySymbol})</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                step="any"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                placeholder="25000"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-base font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            {currency === 'INR' && parseFloat(investedAmount) > 0 && (
              <p className="mt-1 text-[11px] text-teal-300">
                ≈ €{Math.round(parseFloat(investedAmount) / exchangeRate)} EUR base capital
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Purchase</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Strategy</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly SIP, Long-term holding"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Check className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </form>
      </div>
    </div>
  );
};
