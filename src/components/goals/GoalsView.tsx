import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Sparkles,
  TrendingUp,
  Users,
  User,
  HeartHandshake
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FinanceGoal } from '../../types/finance';
import { ContributeModal } from './ContributeModal';

interface GoalsViewProps {
  onOpenAddGoalModal: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ onOpenAddGoalModal }) => {
  const { goals, currency, currentUser, partner, deleteGoal, viewMode } = useFinance();
  const [selectedGoalForContribute, setSelectedGoalForContribute] = useState<FinanceGoal | null>(null);
  const [filter, setFilter] = useState<'all' | 'both' | 'me' | 'partner'>('all');

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

  // Determine goal assignment relative to current user
  const getGoalAssignment = useMemo(() => {
    return (goal: FinanceGoal) => {
      // 1. Explicit assignedUserId matching current user
      if (goal.assignedUserId && currentUser && goal.assignedUserId === currentUser.id) {
        return {
          type: 'me' as const,
          label: 'For You',
          shortLabel: currentUser.name?.split(' ')[0] || 'Me',
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          Icon: User,
        };
      }
      // 2. Explicit assignedUserId matching partner
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
      // 3. Fallback for assignedTo 'me' without explicit ID
      if (goal.assignedTo === 'me') {
        return {
          type: 'me' as const,
          label: 'For You',
          shortLabel: currentUser?.name?.split(' ')[0] || 'Me',
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          Icon: User,
        };
      }
      // 4. Default: Joint milestone (Both of Us)
      return {
        type: 'both' as const,
        label: 'Both of Us',
        shortLabel: 'Joint',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        Icon: Users,
      };
    };
  }, [currentUser, partner]);

  // Counts for each category
  const counts = useMemo(() => {
    let both = 0;
    let me = 0;
    let partnerCount = 0;
    goals.forEach(g => {
      const type = getGoalAssignment(g).type;
      if (type === 'both') both++;
      else if (type === 'me') me++;
      else if (type === 'partner') partnerCount++;
    });
    return { all: goals.length, both, me, partner: partnerCount };
  }, [goals, getGoalAssignment]);

  // Filtered goals based on active tab
  const filteredGoals = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter(g => getGoalAssignment(g).type === filter);
  }, [goals, filter, getGoalAssignment]);

  // Summary statistics for displayed goals
  const { totalTarget, totalSaved, totalNeededMore } = useMemo(() => {
    let target = 0;
    let saved = 0;
    let needed = 0;
    filteredGoals.forEach(g => {
      target += g.targetAmount;
      saved += g.currentAmount;
      needed += Math.max(0, g.targetAmount - g.currentAmount);
    });
    return { totalTarget: target, totalSaved: saved, totalNeededMore: needed };
  }, [filteredGoals]);

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  if (goals.length === 0) {
    return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white">Finance Goals</h2>
          <button
            onClick={onOpenAddGoalModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">No goals yet</p>
            <p className="text-slate-400 text-sm mt-1">Set a goal for yourself, your partner, or both of you!</p>
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
      {/* Overview Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-rose-950/70 via-slate-900 to-indigo-950/70 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Finance Goals</h2>
              <p className="text-xs text-slate-400">
                {filter === 'all' 
                  ? 'All Joint & Personal Milestones' 
                  : filter === 'both' 
                  ? 'Shared Couple Goals' 
                  : filter === 'me' 
                  ? `Personal Goals for ${currentUser?.name || 'You'}` 
                  : `Personal Goals for ${partner?.name || 'Partner'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAddGoalModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        {/* Summary cards */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 mb-0.5">
                Total Saved {filter !== 'all' ? `(${filter === 'both' ? 'Joint' : filter === 'me' ? 'For You' : 'For Partner'})` : 'Across Goals'}
              </p>
              <p className="text-base sm:text-lg font-black leading-tight text-emerald-400 break-words [overflow-wrap:anywhere]">
                {formatCurrency(totalSaved, currency)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-slate-500 block">{overallProgress}% of target</span>
              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 mb-0.5">Amount Still Needed</p>
              <p className="text-base sm:text-lg font-black leading-tight text-amber-400 break-words [overflow-wrap:anywhere]">
                {formatCurrency(totalNeededMore, currency)}
              </p>
            </div>
            <div className="shrink-0 p-2 rounded-xl bg-amber-500/10">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assignment Filter Pills */}
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
          <span>Both of Us ({counts.both})</span>
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

        <button
          onClick={() => setFilter('partner')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            filter === 'partner'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-purple-300 border border-white/5'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>For {partner?.name?.split(' ')[0] || 'Partner'} ({counts.partner})</span>
        </button>
      </div>

      {/* Goal Cards */}
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
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const assignment = getGoalAssignment(goal);

            let myContribution = 0;
            let partnerContribution = 0;
            goal.contributions.forEach(c => {
              if (currentUser && c.userId === currentUser.id) myContribution += c.amount;
              else partnerContribution += c.amount;
            });

            return (
              <div
                key={goal.id}
                className="glass-card rounded-3xl p-5 border border-white/10 hover:border-white/20 transition-all space-y-4 relative overflow-hidden"
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                    >
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">{goal.title}</h3>
                        {/* Assignment Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${assignment.badgeClass}`}>
                          <assignment.Icon className="w-3 h-3" />
                          <span>{assignment.label}</span>
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Target: {formatDate(goal.targetDate)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Optional Notes */}
                {goal.notes && (
                  <p className="text-xs text-slate-400 italic bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                    "{goal.notes}"
                  </p>
                )}

                {/* Progress */}
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
                    <button
                      onClick={() => setSelectedGoalForContribute(goal)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Deposit</span>
                    </button>
                  </div>
                </div>

                {/* Contributions split */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
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
    </div>
  );
};
