import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Users,
  AlertCircle
} from 'lucide-react';
import { PaymentMethod } from '../../types/finance';
import { CategoryDropdown } from '../categories/CategoryDropdown';
import { getCurrencySymbol } from '../../utils/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'None / Not specified', value: 'None' },
  { label: 'UPI / Pix', value: 'UPI / Pix' },
  { label: 'Credit Card', value: 'Credit Card' },
  { label: 'Debit Card', value: 'Debit Card' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Crypto', value: 'Crypto' },
  { label: 'Other', value: 'Other' },
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    partner, 
    categories, 
    currency, 
    addTransaction 
  } = useFinance();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('cat-food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('None');
  const [paidByUserId, setPaidByUserId] = useState(currentUser?.id ?? '');
  const [isShared, setIsShared] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setAmount('');
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('None');
      setPaidByUserId(currentUser?.id ?? '');
      setSelectedCatId(type === 'expense' ? 'cat-food' : 'cat-salary');
    }
  }, [isOpen, currentUser, type]);

  if (!isOpen || !currentUser) return null;

  const currentCategories = (categories || []).filter(
    c => c.type === 'both' || c.type === type
  );

  const selectedCategory = currentCategories.find(c => c.id === selectedCatId) 
    || (categories || []).find(c => c.id === selectedCatId) 
    || currentCategories[0] 
    || (categories || [])[0]
    || { id: 'cat-general', name: 'General', color: '#6366f1', icon: 'Tag', type: 'both' };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
    setErrorMessage('');
  };

  const executeAddTransaction = (keepOpenAfterRecord = false) => {
    setErrorMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return false;
    }

    // Additional Description is completely optional: defaults to selected category name
    const finalTitle = title.trim() || selectedCategory.name;
    const paidByUser = (partner && paidByUserId === partner.id) ? partner : currentUser;

    addTransaction({
      title: finalTitle,
      amount: parsedAmount,
      type,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryColor: selectedCategory.color,
      categoryIcon: selectedCategory.icon,
      paymentMethod: paymentMethod === 'None' ? undefined : paymentMethod,
      date: date || new Date().toISOString().split('T')[0],
      userId: paidByUser.id,
      userName: paidByUser.name,
      userAvatar: paidByUser.avatarUrl,
      isShared,
    });

    if (keepOpenAfterRecord) {
      // Clear amount and title for next entry, keep category and modal open
      setAmount('');
      setTitle('');
      setErrorMessage('');
    } else {
      // Immediately reset and CLOSE the page!
      setTitle('');
      setAmount('');
      setPaymentMethod('None');
      setErrorMessage('');
      onClose();
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAddTransaction(false);
  };

  const handleRecordAndAddAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    executeAddTransaction(true);
  };

  const currencySymbol = getCurrencySymbol(currency);
  const quickPills = currency === 'INR' ? [100, 500, 1000, 2000, 5000] : [5, 10, 25, 50, 100];

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
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">
              Record {type === 'expense' ? 'Expense' : 'Income'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Expense vs Income Toggle */}
          <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setSelectedCatId('cat-food');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setSelectedCatId('cat-salary');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Income</span>
            </button>
          </div>

          {/* Amount Input with Currency Symbol */}
          <div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="0.00"
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/80 border border-white/15 text-2xl font-black text-white focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-1">
              {quickPills.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 active:scale-95 border border-white/5 whitespace-nowrap transition-all"
                >
                  +{currencySymbol}{val}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Description Input (Optional Additional Description) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Additional Description <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${selectedCategory.name} or item name`}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500 transition-all"
            />
          </div>

          {/* Category Dropdown (Clean, searchable, full name, single '+' sign) */}
          <CategoryDropdown
            selectedCatId={selectedCatId}
            onChange={setSelectedCatId}
            type={type}
            label="Category Label"
          />

          {/* Who Paid / Received */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {type === 'expense' ? 'Who Paid?' : 'Received By:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidByUserId(currentUser.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  paidByUserId === currentUser.id
                    ? 'border-rose-500 bg-rose-500/15 text-white'
                    : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-rose-500 shrink-0"
                />
                <div className="text-left truncate">
                  <p className="text-xs font-bold truncate">{currentUser.name} (Me)</p>
                  <p className="text-[10px] text-slate-400">Payer</p>
                </div>
              </button>

              {partner && (
                <button
                  type="button"
                  onClick={() => setPaidByUserId(partner.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    paidByUserId === partner.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={partner.avatarUrl}
                    alt={partner.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500 shrink-0"
                  />
                  <div className="text-left truncate">
                    <p className="text-xs font-bold truncate">{partner.name}</p>
                    <p className="text-[10px] text-slate-400">Partner</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Payment Method (Optional) & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Method <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 transition-all cursor-pointer"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value} className="bg-slate-900 text-white">
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          {/* Shared vs Personal Expense Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-white/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              <div>
                <p className="text-xs font-semibold text-white">Shared Couple Expense</p>
                <p className="text-[10px] text-slate-400">Included in joint monthly calculations</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900 accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Action Buttons: Primary Record (Closes modal immediately) + Optional Add Another */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Record {type === 'expense' ? 'Expense' : 'Income'}</span>
            </button>

            <button
              type="button"
              onClick={handleRecordAndAddAnother}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record & Add Another</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
