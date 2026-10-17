import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  Wallet, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { UserProfile, Transaction, CurrencyCode } from '../../types/finance';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';

interface BankAccountsCardProps {
  currentUser: UserProfile | null | undefined;
  partner: UserProfile | null | undefined;
  currency: CurrencyCode;
  bankBalances: Record<string, number>;
  transactions: Transaction[];
  updateBankBalance: (userId: string, initialBalance: number) => void;
}

export const BankAccountsCard: React.FC<BankAccountsCardProps> = ({
  currentUser,
  partner,
  currency,
  bankBalances,
  transactions,
  updateBankBalance,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Compute live balances for each user and couple combined
  const { 
    myInitial, 
    myIncome, 
    myExpense, 
    myLiveBalance,
    partnerInitial, 
    partnerIncome, 
    partnerExpense, 
    partnerLiveBalance,
    totalLiveBalance,
    totalInitialBalance
  } = useMemo(() => {
    let myInc = 0;
    let myExp = 0;
    let pInc = 0;
    let pExp = 0;

    transactions.forEach(t => {
      // Goal allocations/contributions are earmarks, so they do NOT deduct from bank
      const isGoalSavings = t.title?.startsWith('Goal Savings:') || t.title?.includes('Goal Savings');

      if (currentUser && t.userId === currentUser.id) {
        if (t.type === 'income') myInc += t.amount;
        else if (t.type === 'expense' && !isGoalSavings) myExp += t.amount;
      } else if (partner && t.userId === partner.id) {
        if (t.type === 'income') pInc += t.amount;
        else if (t.type === 'expense' && !isGoalSavings) pExp += t.amount;
      }
    });

    const myInit = Number(currentUser ? (bankBalances[currentUser.id] || 0) : 0);
    const pInit = Number(partner ? (bankBalances[partner.id] || 0) : 0);

    const myLive = myInit + myInc - myExp;
    const pLive = pInit + pInc - pExp;

    return {
      myInitial: myInit,
      myIncome: myInc,
      myExpense: myExp,
      myLiveBalance: myLive,
      partnerInitial: pInit,
      partnerIncome: pInc,
      partnerExpense: pExp,
      partnerLiveBalance: pLive,
      totalLiveBalance: myLive + (partner ? pLive : 0),
      totalInitialBalance: myInit + (partner ? pInit : 0),
    };
  }, [currentUser, partner, bankBalances, transactions]);

  const targetUser = editingUserId === currentUser?.id ? currentUser : partner;
  const targetInitial = editingUserId === currentUser?.id ? myInitial : partnerInitial;
  const targetIncome = editingUserId === currentUser?.id ? myIncome : partnerIncome;
  const targetExpense = editingUserId === currentUser?.id ? myExpense : partnerExpense;

  const handleOpenEdit = (userId: string) => {
    setEditingUserId(userId);
    const currentVal = bankBalances[userId];
    setInputAmount(currentVal !== undefined && currentVal > 0 ? String(currentVal) : '');
    setIsConfirming(false);
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inputAmount);
    if (isNaN(num) || num < 0) return;
    setIsConfirming(true);
  };

  const handleConfirmSave = () => {
    if (!editingUserId) return;
    const num = parseFloat(inputAmount) || 0;
    updateBankBalance(editingUserId, Math.max(0, num));
    setEditingUserId(null);
    setIsConfirming(false);
  };

  const previewLiveBalance = useMemo(() => {
    const num = parseFloat(inputAmount);
    if (isNaN(num)) return targetInitial + targetIncome - targetExpense;
    return num + targetIncome - targetExpense;
  }, [inputAmount, targetInitial, targetIncome, targetExpense]);

  return (
    <>
      <div className="glass-card rounded-3xl p-4.5 border border-white/10 space-y-3.5 shadow-xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-950/40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Bank Accounts & Reserves
              </span>
              <p className="text-[10px] text-slate-400">Live combined couple bank funds</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs"
            title="How bank balance works"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info Explainer Banner (Toggleable) */}
        {showInfo && (
          <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200/90 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Bank Calculation
            </p>
            <p className="text-[10px] text-slate-300">
              <span className="font-bold">Live Balance = Starting Bank Amount + Incomes - Living Expenses & Bills</span>.
              Allocating savings to the Goal section stays in your bank reserves until a goal bill is actually paid.
            </p>
          </div>
        )}

        {/* Combined Total Live Balance Display */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900 border border-cyan-500/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Total Live Bank Balance</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalLiveBalance, currency)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Initial base: {formatCurrency(totalInitialBalance, currency)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Individual Partner Bank Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Current User Bank Account */}
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40"
                  />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400">Personal Bank</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEdit(currentUser.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-all active:scale-95 border border-white/5"
                >
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  <span>{myInitial > 0 ? 'Edit' : 'Set Initial'}</span>
                </button>
              </div>

              <div>
                <p className="text-base sm:text-lg font-black text-emerald-400">
                  {formatCurrency(myLiveBalance, currency)}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Starting: {formatCurrency(myInitial, currency)}</span>
                  <span className="text-slate-300 font-medium">
                    {myLiveBalance >= myInitial ? `+${formatCurrency(myLiveBalance - myInitial, currency)}` : `-${formatCurrency(myInitial - myLiveBalance, currency)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Partner Bank Account */}
          {partner ? (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={partner.avatarUrl}
                    alt={partner.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/40"
                  />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{partner.name}</p>
                    <p className="text-[10px] text-slate-400">Personal Bank</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEdit(partner.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-all active:scale-95 border border-white/5"
                >
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  <span>{partnerInitial > 0 ? 'Edit' : 'Set Initial'}</span>
                </button>
              </div>

              <div>
                <p className="text-base sm:text-lg font-black text-indigo-400">
                  {formatCurrency(partnerLiveBalance, currency)}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Starting: {formatCurrency(partnerInitial, currency)}</span>
                  <span className="text-slate-300 font-medium">
                    {partnerLiveBalance >= partnerInitial ? `+${formatCurrency(partnerLiveBalance - partnerInitial, currency)}` : `-${formatCurrency(partnerInitial - partnerLiveBalance, currency)}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center text-center py-4">
              <p className="text-xs text-slate-400">Partner not linked yet</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Invite your partner to view joint bank balances</p>
            </div>
          )}
        </div>
      </div>

      {/* Set / Edit Starting Bank Balance Modal with Confirmation */}
      {editingUserId && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-sm rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {isConfirming ? 'Confirm Bank Balance' : `Set Starting Balance (${targetUser.name})`}
                </h3>
              </div>
              <button
                onClick={() => { setEditingUserId(null); setIsConfirming(false); }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isConfirming ? (
              <form onSubmit={handleSaveClick} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Enter Starting Bank Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-bold text-base focus:outline-none focus:border-cyan-500"
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    This is your base bank account deposit. Monthly income will be added and expenses/bills deducted automatically.
                  </p>
                </div>

                {/* Calculation preview */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-xs">
                  <p className="font-semibold text-slate-300 text-[11px]">Balance Breakdown Preview</p>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Total Income recorded:</span>
                    <span className="text-emerald-400 font-semibold">+{formatCurrency(targetIncome, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Living Expenses & Bills:</span>
                    <span className="text-rose-400 font-semibold">-{formatCurrency(targetExpense, currency)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-white/10 flex justify-between font-bold text-white text-xs">
                    <span>Resulting Live Balance:</span>
                    <span className="text-cyan-400">{formatCurrency(previewLiveBalance, currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setEditingUserId(null); setIsConfirming(false); }}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white transition-all shadow-lg active:scale-95"
                  >
                    Continue
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">Confirm Balance Update</p>
                    <p className="text-[11px] text-amber-200/90 mt-0.5">
                      Are you sure you want to change {targetUser.name}'s starting bank balance to{' '}
                      <span className="font-bold underline text-white">
                        {formatCurrency(parseFloat(inputAmount) || 0, currency)}
                      </span>
                      ?
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Previous Starting:</span>
                    <span className="text-slate-300 font-semibold">{formatCurrency(targetInitial, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>New Starting:</span>
                    <span className="text-white font-bold">{formatCurrency(parseFloat(inputAmount) || 0, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-white/10">
                    <span>New Live Balance:</span>
                    <span className="text-cyan-400 font-black">{formatCurrency(previewLiveBalance, currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
                  >
                    Edit Again
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Yes, Confirm</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
