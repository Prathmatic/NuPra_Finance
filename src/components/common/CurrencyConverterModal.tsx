import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  RefreshCw, 
  ArrowRightLeft, 
  Sliders, 
  TrendingUp, 
  Check, 
  AlertCircle,
  Globe,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { formatRawEur, formatRawInr } from '../../utils/formatters';

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    exchangeRate, 
    exchangeRateData, 
    isRateLoading, 
    refreshExchangeRate, 
    setCustomExchangeRate, 
    clearCustomExchangeRate 
  } = useFinance();

  const [eurValue, setEurValue] = useState<string>('100');
  const [inrValue, setInrValue] = useState<string>('');
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false);
  const [customRateInput, setCustomRateInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sync initial calculation
  useEffect(() => {
    if (isOpen) {
      const initialEur = 100;
      setEurValue('100');
      setInrValue(Math.round(initialEur * exchangeRate).toString());
      setCustomRateInput(exchangeRate.toString());
      setErrorMessage('');
    }
  }, [isOpen, exchangeRate]);

  if (!isOpen) return null;

  const handleEurChange = (val: string) => {
    setEurValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setInrValue(Math.round(parsed * exchangeRate).toString());
    } else {
      setInrValue('');
    }
  };

  const handleInrChange = (val: string) => {
    setInrValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setEurValue((Math.round((parsed / exchangeRate) * 100) / 100).toString());
    } else {
      setEurValue('');
    }
  };

  const handleApplyCustomRate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const parsed = parseFloat(customRateInput);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Please enter a valid rate greater than 0.');
      return;
    }
    setCustomExchangeRate(parsed);
    // Recalculate with new rate
    const currentEur = parseFloat(eurValue) || 100;
    setInrValue(Math.round(currentEur * parsed).toString());
    setShowCustomConfig(false);
  };

  const handleResetToEcb = () => {
    clearCustomExchangeRate();
    setShowCustomConfig(false);
    setErrorMessage('');
  };

  const formattedDate = (() => {
    try {
      if (exchangeRateData.date) {
        const [y, m, d] = exchangeRateData.date.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      // Fallback
    }
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  const quickEurPills = [10, 50, 100, 250, 500, 1000];
  const quickInrPills = [1000, 5000, 10000, 25000, 50000, 100000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar"
        style={{
          marginTop: 'max(16px, env(safe-area-inset-top, 16px))',
          marginBottom: 'max(16px, env(safe-area-inset-bottom, 16px))'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 text-teal-400 border border-teal-500/30 shadow-inner">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Live Currency Exchange
                </h2>
                {exchangeRateData.isCustom ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Custom
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ECB Official
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Official European Central Bank Market Rate · Updated {formattedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Rate Hero Card */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reference Exchange Rate</span>
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  1 € = ₹{exchangeRate.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-medium">INR</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Source: <span className="text-slate-300 font-medium">{exchangeRateData.source}</span>
              </p>
            </div>

            <button
              onClick={() => refreshExchangeRate(true)}
              disabled={isRateLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 border border-white/10 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh live rate from ECB"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isRateLoading ? 'animate-spin' : ''}`} />
              <span>{isRateLoading ? 'Fetching...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Two-Way Interactive Calculator */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interactive Converter
            </label>
            <span className="text-[11px] text-slate-400">Type either amount</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Euro Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 focus-within:border-indigo-500/60 transition-all">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold mb-1">
                <span>Euros (EUR)</span>
                <span className="text-base font-bold">€</span>
              </div>
              <div className="relative flex items-center">
                <span className="text-slate-400 font-bold mr-1.5 text-base">€</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={eurValue}
                  onChange={e => handleEurChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                ≈ {formatRawInr(parseFloat(eurValue) * exchangeRate || 0)}
              </p>
            </div>

            {/* INR Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 focus-within:border-teal-500/60 transition-all">
              <div className="flex items-center justify-between text-xs text-teal-300 font-semibold mb-1">
                <span>Indian Rupees (INR)</span>
                <span className="text-base font-bold">₹</span>
              </div>
              <div className="relative flex items-center">
                <span className="text-slate-400 font-bold mr-1.5 text-base">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={inrValue}
                  onChange={e => handleInrChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                ≈ {formatRawEur((parseFloat(inrValue) || 0) / exchangeRate)}
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">EUR:</span>
              {quickEurPills.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleEurChange(val.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    parseFloat(eurValue) === val
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  €{val}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">INR:</span>
              {quickInrPills.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleInrChange(val.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    parseFloat(inrValue) === val
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  ₹{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Rate Override Section */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCustomConfig(!showCustomConfig)}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showCustomConfig ? 'Hide Custom Rate Options' : 'Custom Exchange Rate Override'}</span>
            </button>

            {exchangeRateData.isCustom && (
              <button
                type="button"
                onClick={handleResetToEcb}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to ECB Rate</span>
              </button>
            )}
          </div>

          {showCustomConfig && (
            <form onSubmit={handleApplyCustomRate} className="mt-3 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 animate-in fade-in duration-150">
              <p className="text-[11px] text-slate-400">
                You can lock in a custom exchange rate (e.g. transfer fee rate, remittance quote). All INR values across your app will use this rate until reset.
              </p>

              {errorMessage && (
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    1 € = ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={customRateInput}
                    onChange={e => setCustomRateInput(e.target.value)}
                    placeholder="108.12"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl pl-16 pr-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  Save Rate
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info note */}
        <div className="mt-5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-200 leading-relaxed">
            <span className="font-semibold text-white">How it works:</span> Your couple vault stores all financial transactions in standard base EUR. When you switch to the <span className="font-semibold text-white">INR</span> tab, every dashboard chart, budget limit, and transaction is converted live at the European Central Bank rate.
          </p>
        </div>
      </div>
    </div>
  );
};
