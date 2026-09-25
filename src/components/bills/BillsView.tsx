import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  CalendarCheck, 
  Plus, 
  Check, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AddBillModal } from './AddBillModal';

export const BillsView: React.FC = () => {
  const { bills, currency, currentUser, markBillAsPaid, deleteBill } = useFinance();
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);

  const unpaidBills = useMemo(() => bills.filter(b => !b.isPaid), [bills]);
  const paidBills = useMemo(() => bills.filter(b => b.isPaid), [bills]);

  const totalUnpaid = useMemo(() => {
    return unpaidBills.reduce((acc, b) => acc + b.amount, 0);
  }, [unpaidBills]);

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
              <h2 className="text-base font-extrabold text-white">Bill & Payment Tracker</h2>
              <p className="text-xs text-slate-400">Never miss shared utility or subscription dues</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddBillOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>

        {/* Total Unpaid Due */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Total Pending Bills</p>
            <p className="text-xl font-black text-orange-400">{formatCurrency(totalUnpaid, currency)}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">
            {unpaidBills.length} Due Soon
          </span>
        </div>
      </div>

      {/* Tabs: Unpaid vs Paid */}
      <div className="flex p-1 rounded-2xl bg-slate-900/90 border border-white/10 text-xs font-semibold">
        <button
          onClick={() => setTab('unpaid')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
            tab === 'unpaid'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Unpaid & Upcoming ({unpaidBills.length})</span>
        </button>
        <button
          onClick={() => setTab('paid')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
            tab === 'paid'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Paid ({paidBills.length})</span>
        </button>
      </div>

      {/* Bills List */}
      {tab === 'unpaid' ? (
        unpaidBills.length === 0 ? (
          <div className="glass-card p-8 rounded-3xl text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">All caught up!</p>
            <p className="text-xs text-slate-400">No unpaid or overdue bills for this month.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {unpaidBills.map((b) => (
              <div
                key={b.id}
                className="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-slate-800/40 transition-all group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{b.title}</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-medium">
                      {b.recurring}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                    <Calendar className="w-3 h-3 text-orange-400" />
                    <span>Due Date: {formatDate(b.dueDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-orange-400">
                    {formatCurrency(b.amount, currency)}
                  </span>

                  {/* Mark as Paid Action */}
                  <button
                    onClick={() => markBillAsPaid(b.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1"
                    title="Mark as Paid"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>

                  <button
                    onClick={() => deleteBill(b.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        paidBills.length === 0 ? (
          <div className="glass-card p-8 rounded-3xl text-center space-y-2">
            <p className="text-xs text-slate-400">No paid bill records yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paidBills.map((b) => (
              <div
                key={b.id}
                className="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between opacity-80"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white line-through">{b.title}</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                      Paid
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Paid by {b.paidByUserName || 'Partner'} on {formatDate(b.paidDate || '')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    {formatCurrency(b.amount, currency)}
                  </span>
                  <button
                    onClick={() => deleteBill(b.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Bill Modal */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
      />
    </div>
  );
};
