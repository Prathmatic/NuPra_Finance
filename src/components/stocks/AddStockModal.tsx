import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, TrendingUp, Plus, DollarSign, Calendar } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/formatters';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STOCK_PRESETS = [
  { name: 'NIFTY 50 Index ETF', ticker: 'NIFTYBEES' },
  { name: 'Vanguard All-World UCITS', ticker: 'VWCE' },
  { name: 'Apple Inc.', ticker: 'AAPL' },
  { name: 'S&P 500 Index Fund', ticker: 'VOO' },
  { name: 'Tata Consultancy Services', ticker: 'TCS' },
  { name: 'Reliance Industries', ticker: 'RELIANCE' },
  { name: 'Microsoft Corp', ticker: 'MSFT' },
];

export const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, partner, currency, addStock } = useFinance();
  const [assetName, setAssetName] = useState('');
  const [ticker, setTicker] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [shares, setShares] = useState('');
  const [investorId, setInvestorId] = useState(currentUser.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(investedAmount);
    if (!assetName.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const investor = (partner && investorId === partner.id) ? partner : currentUser;
    const monthYear = date.slice(0, 7); // "YYYY-MM"

    addStock({
      assetName: assetName.trim(),
      ticker: ticker.trim().toUpperCase() || undefined,
      investedAmount: amountNum,
      shares: shares ? parseFloat(shares) : undefined,
      monthYear,
      date,
      userId: investor.id,
      userName: investor.name,
      userAvatar: investor.avatarUrl,
      notes: notes.trim() || undefined,
    });

    setAssetName('');
    setTicker('');
    setInvestedAmount('');
    setShares('');
    setNotes('');
    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-glow-indigo">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Stock Investment</h2>
              <p className="text-xs text-slate-400">Add monthly capital contribution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stock Presets */}
        <div className="mt-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Quick Popular Picks:</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {STOCK_PRESETS.map((p) => (
              <button
                key={p.ticker}
                type="button"
                onClick={() => {
                  setAssetName(p.name);
                  setTicker(p.ticker);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium shrink-0 border border-white/5"
              >
                {p.ticker}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Asset / Fund Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. NIFTY 50 ETF, Apple, S&P 500"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ticker (Optional)</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="AAPL, VWCE"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Shares/Units (Optional)</label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Invested Capital ({currencySymbol})
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                placeholder="25000"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-base font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Who Made This Investment?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInvestorId(currentUser.id)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  investorId === currentUser.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-white/5 bg-slate-800/60 text-slate-400'
                }`}
              >
                <img src={currentUser.avatarUrl} alt="Me" className="w-6 h-6 rounded-full object-cover" />
                <span className="text-xs font-semibold">{currentUser.name} (Me)</span>
              </button>

              {partner && (
                <button
                  type="button"
                  onClick={() => setInvestorId(partner.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    investorId === partner.id
                      ? 'border-indigo-500 bg-indigo-500/20 text-white'
                      : 'border-white/5 bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <img src={partner.avatarUrl} alt="Partner" className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs font-semibold">{partner.name}</span>
                </button>
              )}
            </div>
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
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Investment</span>
          </button>
        </form>
      </div>
    </div>
  );
};
