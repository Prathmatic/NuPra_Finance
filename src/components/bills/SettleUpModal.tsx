import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, CheckCircle, ArrowRightLeft, Sparkles, Receipt } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../../utils/formatters';
import { BillItem } from '../../types/finance';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  netAmount: number; // positive: partner owes me; negative: I owe partner
  unsettledBills: BillItem[];
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  netAmount,
  unsettledBills,
}) => {
  const { currentUser, partner, currency, settleAllBills } = useFinance();
  const [recordTransaction, setRecordTransaction] = useState(true);

  if (!isOpen) return null;

  const partnerName = partner?.name || 'Partner';
  const myName = currentUser?.name || 'You';
  const absAmount = Math.abs(netAmount);
  const partnerOwesMe = netAmount > 0;
  const payerName = partnerOwesMe ? partnerName : myName;
  const receiverName = partnerOwesMe ? myName : partnerName;

  const handleSettle = () => {
    settleAllBills(recordTransaction);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settle Up Balances</h2>
              <p className="text-[11px] text-slate-400">Clear all pending debts between partners</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Debt Summary Card */}
          <div className={`p-4 rounded-2xl border text-center space-y-1 ${
            partnerOwesMe 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <p className="text-xs text-slate-300">
              {partnerOwesMe ? `${partnerName} pays ${myName}` : `${myName} pays ${partnerName}`}
            </p>
            <p className={`text-3xl font-black ${partnerOwesMe ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatCurrency(absAmount, currency)}
            </p>
            <p className="text-[11px] text-slate-400">
              Across {unsettledBills.length} unsettled bill(s)
            </p>
          </div>

          {/* Account Balance Effect Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-0.5">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Payer (Deducted)</span>
              <span className="text-white font-semibold truncate block">{payerName}</span>
              <span className="text-rose-400 font-black text-sm">-{formatCurrency(absAmount, currency)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Receiver (Added)</span>
              <span className="text-white font-semibold truncate block">{receiverName}</span>
              <span className="text-emerald-400 font-black text-sm">+{formatCurrency(absAmount, currency)}</span>
            </div>
          </div>

          {/* List of bills to be settled */}
          {unsettledBills.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Bills included in settlement
              </label>
              {unsettledBills.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-white font-medium truncate max-w-[180px]">{b.title}</span>
                  </div>
                  <span className="text-slate-300 font-bold">{formatCurrency(b.amount, currency)}</span>
                </div>
              ))}
              {unsettledBills.length > 5 && (
                <p className="text-[10px] text-center text-slate-500">
                  + {unsettledBills.length - 5} more bills
                </p>
              )}
            </div>
          )}

          {/* Record transaction checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
            <input
              type="checkbox"
              checked={recordTransaction}
              onChange={(e) => setRecordTransaction(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-white/20"
            />
            <div className="text-xs">
              <span className="text-white font-semibold block">Record settlement transaction</span>
              <span className="text-slate-400 text-[11px]">
                Deducts {formatCurrency(absAmount, currency)} from {payerName}'s account and adds it to {receiverName}'s account
              </span>
            </div>
          </label>

          <button
            onClick={handleSettle}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm Settlement ({formatCurrency(absAmount, currency)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
