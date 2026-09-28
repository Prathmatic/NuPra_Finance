import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  CalendarCheck, 
  Plus, 
  Users, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({ isOpen, onClose }) => {
  const { currency, addBill, currentUser, partner } = useFinance();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryName, setCategoryName] = useState('Utilities');
  const [recurring, setRecurring] = useState<'none' | 'monthly' | 'yearly'>('monthly');

  // Splitwise options
  const [paidStatus, setPaidStatus] = useState<'unpaid' | 'paid_by_me'>('unpaid');
  const [splitOption, setSplitOption] = useState<'equal' | 'partner_owes_me' | 'i_owe_partner' | 'personal'>('equal');

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedAmount <= 0) return;

    const isPaid = paidStatus === 'paid_by_me';
    const payerId = isPaid 
      ? currentUser?.id 
      : (splitOption === 'partner_owes_me' ? currentUser?.id : splitOption === 'i_owe_partner' ? (partner?.id || 'partner') : undefined);

    const payerName = isPaid 
      ? currentUser?.name 
      : (splitOption === 'partner_owes_me' ? currentUser?.name : splitOption === 'i_owe_partner' ? (partner?.name || 'Partner') : undefined);

    let splitType: 'equal' | 'full_debt' | 'personal' = 'equal';
    let borrowerId: string | undefined;
    let borrowerName: string | undefined;

    if (splitOption === 'equal') {
      splitType = 'equal';
    } else if (splitOption === 'partner_owes_me') {
      splitType = 'full_debt';
      borrowerId = partner?.id || 'partner';
      borrowerName = partner?.name || 'Partner';
    } else if (splitOption === 'i_owe_partner') {
      splitType = 'full_debt';
      borrowerId = currentUser?.id;
      borrowerName = currentUser?.name || 'Me';
    } else {
      splitType = 'personal';
    }

    addBill({
      title: title.trim(),
      amount: parsedAmount,
      dueDate,
      categoryName,
      categoryColor: '#F97316',
      recurring,
      splitType,
      isPaid,
      paidDate: isPaid ? new Date().toISOString().split('T')[0] : undefined,
      paidByUserId: isPaid ? payerId : undefined,
      paidByUserName: isPaid ? payerName : undefined,
      payerId,
      payerName,
      borrowerId,
      borrowerName,
      isSettled: false,
    });

    setTitle('');
    setAmount('');
    setPaidStatus('unpaid');
    setSplitOption('equal');
    onClose();
  };

  const currencySymbol = getCurrencySymbol(currency);
  const partnerName = partner?.name?.split(' ')[0] || 'Partner';
  const myName = currentUser?.name?.split(' ')[0] || 'Me';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Bill & Split</h2>
              <p className="text-[11px] text-slate-400">Track bills & calculate partner debts (Splitwise)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bill Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. WiFi Bill, Electricity, Rent, Groceries"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Bill Amount ({currencySymbol})
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-base font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-base font-bold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Paid Status Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Status (Who Paid?)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidStatus('unpaid')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  paidStatus === 'unpaid'
                    ? 'bg-orange-500/20 border-orange-500 text-white ring-1 ring-orange-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Unpaid Due</span>
                <span className="text-[10px] text-slate-400">Due later</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaidStatus('paid_by_me');
                  if (splitOption === 'i_owe_partner') setSplitOption('equal');
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  paidStatus === 'paid_by_me'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="truncate max-w-[120px]">Paid by {myName}</span>
                <span className="text-[10px] text-slate-400">I paid full</span>
              </button>
            </div>
          </div>

          {/* Splitwise Split Option Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              How to Split (Splitwise)?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSplitOption('equal')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  splitOption === 'equal'
                    ? 'bg-indigo-500/20 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${splitOption === 'equal' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">Split 50/50</span>
                </div>
                <p className="text-[10px] text-slate-400">Both partners share equally (half each)</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitOption('partner_owes_me');
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  splitOption === 'partner_owes_me'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${splitOption === 'partner_owes_me' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">{partnerName} owes Me</span>
                </div>
                <p className="text-[10px] text-slate-400">You paid full for {partnerName} (100% debt)</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitOption('i_owe_partner');
                  if (paidStatus === 'paid_by_me') setPaidStatus('unpaid');
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  splitOption === 'i_owe_partner'
                    ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${splitOption === 'i_owe_partner' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">I owe {partnerName}</span>
                </div>
                <p className="text-[10px] text-slate-400">{partnerName} paid full for you (100% debt)</p>
              </button>

              <button
                type="button"
                onClick={() => setSplitOption('personal')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  splitOption === 'personal'
                    ? 'bg-slate-600/30 border-slate-400 text-white ring-1 ring-slate-400/50'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${splitOption === 'personal' ? 'bg-slate-600 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">Personal Only</span>
                </div>
                <p className="text-[10px] text-slate-400">Solo bill, no partner debt calculation</p>
              </button>
            </div>
          </div>

          {/* Dynamic Debt Calculation Preview */}
          {parsedAmount > 0 && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs">
              <span className="text-sm">💡</span>
              <div className="text-slate-300">
                {splitOption === 'equal' && paidStatus === 'paid_by_me' && (
                  <span>
                    You paid full. <strong className="text-emerald-400 font-bold">{partnerName} will owe you {formatCurrency(parsedAmount / 2, currency)}</strong>.
                  </span>
                )}
                {splitOption === 'equal' && paidStatus === 'unpaid' && (
                  <span>
                    Shared upcoming bill. Both of you will split <strong className="text-white font-semibold">{formatCurrency(parsedAmount / 2, currency)}</strong> each.
                  </span>
                )}
                {splitOption === 'partner_owes_me' && (
                  <span>
                    Personal expense for {partnerName}. <strong className="text-emerald-400 font-bold">{partnerName} will owe you {formatCurrency(parsedAmount, currency)}</strong> in full.
                  </span>
                )}
                {splitOption === 'i_owe_partner' && (
                  <span>
                    Personal expense for you. <strong className="text-amber-400 font-bold">You will owe {partnerName} {formatCurrency(parsedAmount, currency)}</strong> in full.
                  </span>
                )}
                {splitOption === 'personal' && (
                  <span>Personal bill. Neither partner owes anything.</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Frequency</label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="none">One-time</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Save Bill</span>
          </button>
        </form>
      </div>
    </div>
  );
};
