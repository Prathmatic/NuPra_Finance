import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X,
  CalendarCheck, 
  Plus, 
  Check, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  ArrowRightLeft,
  Users,
  User,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { calculateSplitwiseBalance, getBillSplitInfo } from '../../utils/splitwise';
import { BillItem } from '../../types/finance';
import { AddBillModal } from './AddBillModal';
import { SettleUpModal } from './SettleUpModal';

export const BillsView: React.FC = () => {
  const { 
    bills, 
    currency, 
    currentUser, 
    partner, 
    markBillAsPaid, 
    deleteBill,
    settleBill 
  } = useFinance();

  const [tab, setTab] = useState<'all' | 'unpaid' | 'paid' | 'debts'>('all');
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<BillItem | null>(null);

  // Splitwise Net Calculations
  const splitwiseSummary = useMemo(() => {
    return calculateSplitwiseBalance(bills, currentUser?.id, partner?.id);
  }, [bills, currentUser?.id, partner?.id]);

  const unpaidBills = useMemo(() => bills.filter(b => !b.isPaid), [bills]);
  const paidBills = useMemo(() => bills.filter(b => b.isPaid), [bills]);
  const debtBills = useMemo(() => {
    return bills.filter(b => {
      if (b.isSettled) return false;
      const split = b.splitType || 'equal';
      if (split === 'personal') return false;
      return Boolean(b.paidByUserId || b.payerId);
    });
  }, [bills]);

  const displayedBills = useMemo(() => {
    if (tab === 'unpaid') return unpaidBills;
    if (tab === 'paid') return paidBills;
    if (tab === 'debts') return debtBills;
    return bills;
  }, [tab, bills, unpaidBills, paidBills, debtBills]);

  const totalUnpaid = useMemo(() => {
    return unpaidBills.reduce((acc, b) => acc + b.amount, 0);
  }, [unpaidBills]);

  const partnerName = partner?.name || 'Partner';
  const myName = currentUser?.name || 'You';

  const handleConfirmPay = (billId: string, payerId: string, payerName: string) => {
    markBillAsPaid(billId, payerId, payerName);
    setPayingBill(null);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-orange-950/70 via-slate-900 to-amber-950/70 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Bills & Splitwise</h2>
              <p className="text-xs text-slate-400">Track recurring dues & who owes whom</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddBillOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>

        {/* Total Unpaid Due */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Total Pending Dues</p>
            <p className="text-xl font-black text-orange-400">{formatCurrency(totalUnpaid, currency)}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">
            {unpaidBills.length} Due Soon
          </span>
        </div>
      </div>

      {/* Splitwise Net Balance Banner */}
      {partner ? (
        <div className={`p-4 rounded-3xl border transition-all ${
          splitwiseSummary.netAmount > 0
            ? 'glass-panel bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
            : splitwiseSummary.netAmount < 0
            ? 'glass-panel bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'glass-panel bg-slate-900/80 border-white/10'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                splitwiseSummary.netAmount > 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : splitwiseSummary.netAmount < 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/10 text-emerald-400'
              }`}>
                {splitwiseSummary.netAmount > 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : splitwiseSummary.netAmount < 0 ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                {splitwiseSummary.netAmount > 0 ? (
                  <>
                    <p className="text-xs text-slate-300 font-medium">
                      <span className="font-bold text-white">{partnerName}</span> owes you
                    </p>
                    <p className="text-xl font-black text-emerald-400">
                      {formatCurrency(splitwiseSummary.netAmount, currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      From {splitwiseSummary.unsettledBillsCount} shared bill(s)
                    </p>
                  </>
                ) : splitwiseSummary.netAmount < 0 ? (
                  <>
                    <p className="text-xs text-slate-300 font-medium">
                      You owe <span className="font-bold text-white">{partnerName}</span>
                    </p>
                    <p className="text-xl font-black text-amber-400">
                      {formatCurrency(Math.abs(splitwiseSummary.netAmount), currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      From {splitwiseSummary.unsettledBillsCount} shared bill(s)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>All settled up!</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You and {partnerName} have no outstanding debts
                    </p>
                  </>
                )}
              </div>
            </div>

            {splitwiseSummary.netAmount !== 0 && (
              <button
                onClick={() => setIsSettleModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Settle Up</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span>Connect your partner to calculate automatic Splitwise debt balances!</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex p-1 rounded-2xl bg-slate-900/90 border border-white/10 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('all')}
          className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl transition-all text-center ${
            tab === 'all'
              ? 'bg-white text-slate-900 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({bills.length})
        </button>

        <button
          onClick={() => setTab('unpaid')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            tab === 'unpaid'
              ? 'bg-orange-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Due ({unpaidBills.length})</span>
        </button>

        <button
          onClick={() => setTab('paid')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            tab === 'paid'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          <span>Paid ({paidBills.length})</span>
        </button>

        <button
          onClick={() => setTab('debts')}
          className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            tab === 'debts'
              ? 'bg-indigo-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HandCoins className="w-3 h-3" />
          <span>Debts ({debtBills.length})</span>
        </button>
      </div>

      {/* Bills List */}
      {displayedBills.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl text-center space-y-2 border border-white/5">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
          <p className="text-sm font-semibold text-white">No bills found</p>
          <p className="text-xs text-slate-400">
            {tab === 'unpaid' 
              ? 'No pending bills due!' 
              : tab === 'paid' 
              ? 'No paid bills recorded yet.' 
              : tab === 'debts' 
              ? 'No active debts between partners.' 
              : 'Add your first bill to track payments and splits.'}
          </p>
          <button
            onClick={() => setIsAddBillOpen(true)}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold mt-2 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedBills.map((b) => {
            const splitInfo = getBillSplitInfo(b, currentUser?.id, partner?.id, partnerName);
            const isUnsettledDebt = !b.isSettled && (splitInfo.status === 'partner_owes_you' || splitInfo.status === 'you_owe_partner');

            return (
              <div
                key={b.id}
                className="glass-card p-4 rounded-3xl border border-white/5 hover:border-white/15 transition-all space-y-2.5 group relative"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold text-white ${b.isPaid ? 'line-through text-slate-300' : ''}`}>
                        {b.title}
                      </p>

                      {/* Paid or Unpaid Badge */}
                      {b.isPaid ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Paid
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Due
                        </span>
                      )}

                      {/* Frequency */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-medium">
                        {b.recurring}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-orange-400" />
                        <span>Due: {formatDate(b.dueDate)}</span>
                      </span>
                      {b.paidDate && (
                        <span>· Paid by {b.paidByUserName || 'Partner'} on {formatDate(b.paidDate)}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount and delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base font-black text-white">
                      {formatCurrency(b.amount, currency)}
                    </span>
                    <button
                      onClick={() => deleteBill(b.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-80 group-hover:opacity-100"
                      title="Delete bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Splitwise Debt Info Card */}
                <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {splitInfo.status === 'partner_owes_you' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{partnerName} owes you {formatCurrency(splitInfo.amountOwed, currency)}</span>
                      </span>
                    ) : splitInfo.status === 'you_owe_partner' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 shrink-0">
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>You owe {partnerName} {formatCurrency(splitInfo.amountOwed, currency)}</span>
                      </span>
                    ) : splitInfo.status === 'settled' ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-semibold border border-white/10 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>Settled</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-semibold border border-blue-500/30 flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3" />
                        <span>Split 50/50 ({formatCurrency(b.amount / 2, currency)} each)</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                      {splitInfo.description}
                    </span>
                  </div>

                  {/* Actions for this bill */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* If unpaid, allow paying */}
                    {!b.isPaid && (
                      <button
                        onClick={() => {
                          if (partner) setPayingBill(b);
                          else markBillAsPaid(b.id);
                        }}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    )}

                    {/* If unsettled debt, allow settling this bill */}
                    {isUnsettledDebt && (
                      <button
                        onClick={() => settleBill(b.id)}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold transition-all flex items-center gap-1"
                        title="Mark this bill's debt as settled"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>Settle</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Bill Modal (Who paid picker) */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Who paid this bill?</h3>
                <p className="text-xs text-orange-400 font-semibold">{payingBill.title}</p>
              </div>
              <button onClick={() => setPayingBill(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleConfirmPay(payingBill.id, currentUser!.id, currentUser!.name)}
                className="w-full p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-left transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">I Paid ({myName})</p>
                  <p className="text-[10px] text-slate-300">
                    Paid {formatCurrency(payingBill.amount, currency)}
                  </p>
                </div>
                <Check className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => handleConfirmPay(payingBill.id, partner!.id, partner!.name)}
                className="w-full p-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-left transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{partnerName} Paid</p>
                  <p className="text-[10px] text-slate-300">
                    Paid {formatCurrency(payingBill.amount, currency)}
                  </p>
                </div>
                <Check className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        netAmount={splitwiseSummary.netAmount}
        unsettledBills={splitwiseSummary.unsettledBills}
      />

      {/* Add Bill Modal */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
      />
    </div>
  );
};
