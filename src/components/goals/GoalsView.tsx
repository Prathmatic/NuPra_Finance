import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Sparkles,
  Users,
  User,
  HeartHandshake,
  Pencil,
  Flag,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
  Check,
  X,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FinanceGoal } from '../../types/finance';
import { ContributeModal } from './ContributeModal';
import { EditGoalModal } from './EditGoalModal';

interface GoalsViewProps {
  onOpenAddGoalModal: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ onOpenAddGoalModal }) => {
  const { 
    goals, currency, currentUser, partner, deleteGoal, viewMode,
    flagGoal, addGoalComment, transactions,
    approveGoalChange, rejectGoalChange, cancelGoalChange,
  } = useFinance();

  const [selectedGoalForContribute, setSelectedGoalForContribute] = useState<FinanceGoal | null>(null);
  const [selectedGoalForEdit, setSelectedGoalForEdit] = useState<FinanceGoal | null>(null);
  const [filter, setFilter] = useState<'all' | 'both' | 'me' | 'partner'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  // Synchronize filter when top-level header viewMode changes
  useEffect(() => {
    if (viewMode === 'me') {
      setFilter('me');
    } else if (viewMode === 'partner') {
      setFilter('partner');
    } else if (viewMode === 'both') {
      setFilter('all');
    }
  }, [viewMode]);

  // ── Savings calculations ──────────────────────────────────────────────────
  // Net savings = income - expenses per user across ALL transactions
  const { mySavings, partnerSavings } = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.userId) return;
      if (tx.type === 'income') incomeMap[tx.userId] = (incomeMap[tx.userId] || 0) + tx.amount;
      else if (tx.type === 'expense') expenseMap[tx.userId] = (expenseMap[tx.userId] || 0) + tx.amount;
    });
    const myId = currentUser?.id;
    const partnerId = partner?.id;
    const myNet = myId ? Math.max(0, (incomeMap[myId] || 0) - (expenseMap[myId] || 0)) : 0;
    const partnerNet = partnerId ? Math.max(0, (incomeMap[partnerId] || 0) - (expenseMap[partnerId] || 0)) : 0;
    return { mySavings: myNet, partnerSavings: partnerNet };
  }, [transactions, currentUser, partner]);

  const totalSavingsTogether = mySavings + partnerSavings;

  // ── Goals Summary Stats ───────────────────────────────────────────────────
  const { totalTarget, totalSaved, totalNeededMore, completedCount } = useMemo(() => {
    let target = 0, saved = 0, needed = 0, completed = 0;
    goals.forEach(g => {
      target += g.targetAmount;
      saved += g.currentAmount;
      needed += Math.max(0, g.targetAmount - g.currentAmount);
      if (g.currentAmount >= g.targetAmount && g.targetAmount > 0) {
        completed++;
      }
    });
    return { totalTarget: target, totalSaved: saved, totalNeededMore: needed, completedCount: completed };
  }, [goals]);

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completionRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  // ── Permission helpers ────────────────────────────────────────────────────
  const canEditGoal = (goal: FinanceGoal) => {
    if (!currentUser) return false;
    if (goal.isShared || goal.assignedTo === 'both') return true; // both partners can edit joint goals (will submit request)
    if (goal.assignedUserId === currentUser.id || goal.assignedTo === 'me') return true; // assigned user can edit
    if (goal.createdByUserId === currentUser.id && !goal.assignedUserId) return true; // creator can edit
    return false;
  };

  const canDeleteGoal = (goal: FinanceGoal) => {
    if (!currentUser) return false;
    if (goal.isShared || goal.assignedTo === 'both') return true;
    if (goal.assignedUserId === currentUser.id || goal.assignedTo === 'me') return true;
    if (goal.createdByUserId === currentUser.id && !goal.assignedUserId) return true;
    return false;
  };

  const canDepositGoal = (goal: FinanceGoal) => {
    if (!currentUser) return false;
    if (goal.isShared || goal.assignedTo === 'both') return true; // both can deposit to joint goals
    if (goal.assignedUserId === currentUser.id || goal.assignedTo === 'me') return true; // my personal goal
    return false; // partner's personal goal — can only comment/flag
  };

  // ── Goal assignment logic ─────────────────────────────────────────────────
  const getGoalAssignment = useMemo(() => {
    return (goal: FinanceGoal) => {
      if (goal.assignedUserId && currentUser && goal.assignedUserId === currentUser.id) {
        return {
          type: 'me' as const,
          label: 'For You',
          shortLabel: currentUser.name?.split(' ')[0] || 'Me',
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          Icon: User,
        };
      }
      if (
        (goal.assignedUserId && partner && goal.assignedUserId === partner.id) ||
        (goal.assignedTo === 'partner' && !goal.isShared)
      ) {
        return {
          type: 'partner' as const,
          label: `For ${partner?.name || goal.assignedUserName || 'Partner'}`,
          shortLabel: partner?.name?.split(' ')[0] || 'Partner',
          badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          Icon: HeartHandshake,
        };
      }
      if (goal.assignedTo === 'me') {
        return {
          type: 'me' as const,
          label: 'For You',
          shortLabel: currentUser?.name?.split(' ')[0] || 'Me',
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          Icon: User,
        };
      }
      return {
        type: 'both' as const,
        label: 'Both of Us',
        shortLabel: 'Joint',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        Icon: Users,
      };
    };
  }, [currentUser, partner]);

  // ── Counts for filter pills ───────────────────────────────────────────────
  const counts = useMemo(() => {
    let both = 0, me = 0, partnerCount = 0;
    goals.forEach(g => {
      const type = getGoalAssignment(g).type;
      if (type === 'both') both++;
      else if (type === 'me') me++;
      else if (type === 'partner') partnerCount++;
    });
    return { all: goals.length, both, me, partner: partnerCount };
  }, [goals, getGoalAssignment]);

  // ── Filtered goals ────────────────────────────────────────────────────────
  const filteredGoals = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter(g => getGoalAssignment(g).type === filter);
  }, [goals, filter, getGoalAssignment]);

  // ── Comment helpers ───────────────────────────────────────────────────────
  const toggleComments = (goalId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const handleAddComment = (goalId: string) => {
    const text = commentTexts[goalId]?.trim();
    if (!text) return;
    addGoalComment(goalId, text);
    setCommentTexts(prev => ({ ...prev, [goalId]: '' }));
    setExpandedComments(prev => new Set([...prev, goalId]));
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (goals.length === 0) {
    return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-base font-extrabold text-white">Finance Goals</h2>
          </div>
          <button
            onClick={onOpenAddGoalModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>

        {/* ── 3 Net Available Savings Cards Even on Empty State ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-blue-500/20 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">{currentUser?.name || 'You'}</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300">
                You
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-blue-400 truncate">
              {formatCurrency(mySavings, currency)}
            </p>
            <p className="text-[10px] text-slate-500">Available Net Savings</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/20 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">{partner?.name || 'Partner'}</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                Partner
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-purple-400 truncate">
              {formatCurrency(partnerSavings, currency)}
            </p>
            <p className="text-[10px] text-slate-500">Available Net Savings</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Together</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                Combined
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-400 truncate">
              {formatCurrency(totalSavingsTogether, currency)}
            </p>
            <p className="text-[10px] text-slate-500">Joint Savings Pool</p>
          </div>
        </div>

        <div className="glass-panel p-10 rounded-3xl border border-white/10 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">No goals yet</p>
            <p className="text-slate-400 text-xs mt-1">Set a shared or personal goal to start tracking progress together!</p>
          </div>
          <button
            onClick={onOpenAddGoalModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20"
          >
            Create First Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Finance Goals</h2>
            <p className="text-xs text-slate-400">
              Personal & Joint Milestones with Partner Approvals
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAddGoalModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* ── 3 Net Available Savings (Me, Partner, Together) Banner ──────── */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-rose-950/70 via-slate-900 to-indigo-950/70 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Available Net Savings
              </h3>
              <p className="text-[11px] text-slate-400">Net Balance (Income minus Expenses) for each partner & together</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Realtime
          </span>
        </div>

        {/* The 3 Individual & Combined Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Card 1: Current User's Savings */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-blue-500/30 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[120px]">{currentUser?.name || 'You'}</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                You
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-blue-400 truncate">
              {formatCurrency(mySavings, currency)}
            </p>
            <p className="text-[10px] text-slate-500">Your available net savings</p>
          </div>

          {/* Card 2: Partner's Savings */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate max-w-[120px]">{partner?.name || 'Partner'}</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Partner
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-purple-400 truncate">
              {formatCurrency(partnerSavings, currency)}
            </p>
            <p className="text-[10px] text-slate-500">{partner?.name || 'Partner'}'s available net savings</p>
          </div>

          {/* Card 3: Combined / Together Savings */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Together</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Combined
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-400 truncate">
              {formatCurrency(totalSavingsTogether, currency)}
            </p>
            <p className="text-[10px] text-slate-500">Joint couple savings pool</p>
          </div>
        </div>

        {/* Goals Progress Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-slate-400 mb-0.5">Goals Completed</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400">
              {completedCount} / {goals.length} ({completionRate}%)
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-slate-400 mb-0.5">Saved in Goals</p>
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {formatCurrency(totalSaved, currency)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-slate-400 mb-0.5">Total Target</p>
            <p className="text-xs sm:text-sm font-bold text-slate-300 truncate">
              {formatCurrency(totalTarget, currency)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-slate-400 mb-0.5">Still Needed</p>
            <p className="text-xs sm:text-sm font-bold text-amber-400 truncate">
              {formatCurrency(totalNeededMore, currency)}
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Overall Goals Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Filter Pills ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-md'
              : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Goals ({counts.all})</span>
        </button>

        <button
          onClick={() => setFilter('both')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filter === 'both'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-rose-300 border border-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Combined ({counts.both})</span>
        </button>

        <button
          onClick={() => setFilter('me')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filter === 'me'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-blue-300 border border-white/5'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>For Me ({counts.me})</span>
        </button>

        {partner && (
          <button
            onClick={() => setFilter('partner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'partner'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-purple-300 border border-white/5'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>For {partner.name?.split(' ')[0] || 'Partner'} ({counts.partner})</span>
          </button>
        )}
      </div>

      {/* ── Goal Cards ───────────────────────────────────────────────────── */}
      {filteredGoals.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl border border-white/5 text-center space-y-3">
          <p className="text-white font-semibold text-sm">
            No goals found {filter !== 'all' ? `for ${filter === 'both' ? 'Both of Us' : filter === 'me' ? 'You' : (partner?.name || 'Partner')}` : ''}
          </p>
          <p className="text-xs text-slate-400">
            Create a goal and assign it to {filter === 'me' ? 'yourself' : filter === 'partner' ? (partner?.name || 'your partner') : 'both of you'}!
          </p>
          <button
            onClick={onOpenAddGoalModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Set Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const neededMore = Math.max(0, goal.targetAmount - goal.currentAmount);
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const isCompleted = goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0;
            const assignment = getGoalAssignment(goal);
            const isBothGoal = assignment.type === 'both';
            const isMyGoal = assignment.type === 'me';
            const isPartnerGoal = assignment.type === 'partner';

            // Contribution breakdown
            let myContribution = 0;
            let partnerContribution = 0;
            goal.contributions.forEach(c => {
              if (currentUser && c.userId === currentUser.id) myContribution += c.amount;
              else partnerContribution += c.amount;
            });

            const userCanEdit = canEditGoal(goal);
            const userCanDelete = canDeleteGoal(goal);
            const userCanDeposit = canDepositGoal(goal);
            const commentsOpen = expandedComments.has(goal.id);
            const commentCount = goal.comments?.length || 0;
            const isFlaggedByMe = goal.isFlagged && goal.flaggedByUserId === currentUser?.id;

            // Change request status
            const hasPendingChange = Boolean(goal.pendingChange && goal.pendingChange.status === 'pending');
            const isPendingChangeRequester = Boolean(
              hasPendingChange && goal.pendingChange?.requestedByUserId === currentUser?.id
            );
            const isPendingChangeApprover = Boolean(
              hasPendingChange && goal.pendingChange?.requestedByUserId !== currentUser?.id
            );

            return (
              <div
                key={goal.id}
                className={`glass-card rounded-3xl p-5 border transition-all space-y-4 relative overflow-hidden ${
                  goal.isFlagged
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : hasPendingChange
                    ? 'border-indigo-500/40 bg-indigo-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Flag or pending change indicator strip */}
                {goal.isFlagged && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                )}
                {!goal.isFlagged && hasPendingChange && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-rose-500" />
                )}

                {/* ── Goal Header ────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                    >
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">{goal.title}</h3>
                        {/* Assignment Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 ${assignment.badgeClass}`}>
                          <assignment.Icon className="w-3 h-3" />
                          <span>{assignment.label}</span>
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Done!
                          </span>
                        )}
                        {goal.isFlagged && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 shrink-0">
                            <Flag className="w-3 h-3" /> Flagged
                          </span>
                        )}
                        {hasPendingChange && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-indigo-400" /> Change Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Target: {formatDate(goal.targetDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons - top right */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Flag button — available to all */}
                    <button
                      onClick={() => flagGoal(goal.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isFlaggedByMe
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                      }`}
                      title={isFlaggedByMe ? 'Remove flag' : 'Flag for review'}
                    >
                      <Flag className="w-4 h-4" />
                    </button>

                    {/* Edit button — only for permitted users */}
                    {userCanEdit && (
                      <button
                        onClick={() => setSelectedGoalForEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title={isBothGoal ? 'Request change to goal' : 'Edit goal'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button — only for permitted users */}
                    {userCanDelete && (
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Pending Change Request Banner ──────────────────────── */}
                {hasPendingChange && goal.pendingChange && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-indigo-200">
                            {isPendingChangeApprover 
                              ? `Change Request from ${goal.pendingChange.requestedByUserName || 'Partner'}` 
                              : 'Your Change Request is Pending Approval'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Requested {new Date(goal.pendingChange.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Diff tags */}
                    <div className="space-y-1 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                      {goal.pendingChange.proposedChanges.title && goal.pendingChange.proposedChanges.title !== goal.title && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold min-w-[70px]">Title:</span>
                          <span className="line-through text-slate-500">{goal.title}</span>
                          <span className="text-indigo-300 font-bold">➔ {goal.pendingChange.proposedChanges.title}</span>
                        </div>
                      )}
                      {goal.pendingChange.proposedChanges.targetAmount && goal.pendingChange.proposedChanges.targetAmount !== goal.targetAmount && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold min-w-[70px]">Target:</span>
                          <span className="line-through text-slate-500">{formatCurrency(goal.targetAmount, currency)}</span>
                          <span className="text-emerald-400 font-bold">➔ {formatCurrency(goal.pendingChange.proposedChanges.targetAmount, currency)}</span>
                        </div>
                      )}
                      {goal.pendingChange.proposedChanges.targetDate && goal.pendingChange.proposedChanges.targetDate !== goal.targetDate && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold min-w-[70px]">Target Date:</span>
                          <span className="line-through text-slate-500">{formatDate(goal.targetDate)}</span>
                          <span className="text-amber-300 font-bold">➔ {formatDate(goal.pendingChange.proposedChanges.targetDate)}</span>
                        </div>
                      )}
                      {goal.pendingChange.proposedChanges.notes && goal.pendingChange.proposedChanges.notes !== goal.notes && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold min-w-[70px]">Notes:</span>
                          <span className="text-slate-300 italic truncate max-w-[200px]">"{goal.pendingChange.proposedChanges.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isPendingChangeApprover && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => approveGoalChange(goal.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Changes</span>
                        </button>
                        <button
                          onClick={() => rejectGoalChange(goal.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {isPendingChangeRequester && (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] text-indigo-300/80">
                          Waiting for {partner?.name || 'partner'} to approve this change.
                        </span>
                        <button
                          onClick={() => cancelGoalChange(goal.id)}
                          className="text-xs text-rose-400 hover:underline font-semibold"
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Notes */}
                {goal.notes && (
                  <p className="text-xs text-slate-400 italic bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                    "{goal.notes}"
                  </p>
                )}

                {/* ── Progress ──────────────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Saved: </span>
                      <strong className="text-sm text-white">{formatCurrency(goal.currentAmount, currency)}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Target: </span>
                      <strong className="text-sm text-slate-300">{formatCurrency(goal.targetAmount, currency)}</strong>
                    </div>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, backgroundColor: goal.color }}
                    />
                  </div>

                  {/* Amount needed + deposit button */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">Still Needed:</p>
                        <p className="text-base font-extrabold text-amber-400 truncate">
                          {neededMore === 0 ? 'Goal Achieved! 🎉' : formatCurrency(neededMore, currency)}
                        </p>
                      </div>
                    </div>
                    {userCanDeposit ? (
                      <button
                        onClick={() => setSelectedGoalForContribute(goal)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Deposit</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/5 shrink-0">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-semibold">View Only</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Contributions Split ───────────────────────────────── */}
                <div className="pt-2 border-t border-white/5">
                  {/* For joint goals: show both contributions */}
                  {isBothGoal && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-300">{currentUser?.name ?? 'You'}:</span>
                        <span className="text-emerald-400 font-semibold">{formatCurrency(myContribution, currency)}</span>
                      </div>
                      {partner && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-300">{partner.name}:</span>
                          <span className="text-indigo-400 font-semibold">{formatCurrency(partnerContribution, currency)}</span>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500">{goal.contributions.length} deposits</span>
                    </div>
                  )}

                  {/* For my goal: only show my contribution */}
                  {isMyGoal && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="font-medium text-slate-300">Your contributions:</span>
                        <span className="text-emerald-400 font-semibold">{formatCurrency(myContribution, currency)}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{goal.contributions.filter(c => c.userId === currentUser?.id).length} deposits</span>
                    </div>
                  )}

                  {/* For partner's goal: only show partner's contribution */}
                  {isPartnerGoal && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <HeartHandshake className="w-3 h-3 text-purple-400" />
                        <span className="font-medium text-slate-300">{partner?.name || 'Partner'}'s contributions:</span>
                        <span className="text-purple-400 font-semibold">{formatCurrency(partnerContribution, currency)}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{goal.contributions.filter(c => c.userId !== currentUser?.id).length} deposits</span>
                    </div>
                  )}
                </div>

                {/* ── Comments Section ─────────────────────────────────── */}
                <div className="border-t border-white/5 pt-2">
                  <button
                    onClick={() => toggleComments(goal.id)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Add a comment'}</span>
                    {commentsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                  </button>

                  {commentsOpen && (
                    <div className="mt-3 space-y-3 animate-in fade-in duration-150">
                      {/* Comment input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentTexts[goal.id] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(goal.id); }}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 placeholder-slate-600"
                        />
                        <button
                          onClick={() => handleAddComment(goal.id)}
                          disabled={!commentTexts[goal.id]?.trim()}
                          className="p-2 rounded-xl bg-rose-600 hover:opacity-90 disabled:opacity-30 text-white transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Comment list */}
                      {(goal.comments || []).length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {(goal.comments || []).map(c => (
                            <div key={c.id} className="flex items-start gap-2">
                              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                c.userId === currentUser?.id ? 'bg-blue-600' : 'bg-purple-600'
                              }`}>
                                {c.userName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0 bg-slate-800/60 rounded-xl px-2.5 py-1.5">
                                <div className="flex items-baseline gap-1.5 mb-0.5">
                                  <span className={`text-[10px] font-bold ${c.userId === currentUser?.id ? 'text-blue-400' : 'text-purple-400'}`}>
                                    {c.userId === currentUser?.id ? 'You' : c.userName}
                                  </span>
                                  <span className="text-[9px] text-slate-600">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 break-words">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ContributeModal
        goal={selectedGoalForContribute}
        isOpen={!!selectedGoalForContribute}
        onClose={() => setSelectedGoalForContribute(null)}
      />

      <EditGoalModal
        goal={selectedGoalForEdit}
        isOpen={!!selectedGoalForEdit}
        onClose={() => setSelectedGoalForEdit(null)}
      />
    </div>
  );
};
