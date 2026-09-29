import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  Wallet, 
  Target, 
  Users, 
  User, 
  HeartHandshake, 
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { FinanceGoal } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';
import { useFinance } from '../../context/FinanceContext';

interface GoalStatsCardProps {
  goals: FinanceGoal[];
  mySavings: number;
  partnerSavings: number;
  totalSavingsTogether: number;
}

export const GoalStatsCard: React.FC<GoalStatsCardProps> = ({
  goals,
  mySavings,
  partnerSavings,
  totalSavingsTogether,
}) => {
  const { currency, currentUser, partner } = useFinance();
  const [selectedSegment, setSelectedSegment] = useState<'both' | 'me' | 'partner' | 'all'>('both');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // ── Overall Completion KPIs ───────────────────────────────────────────────
  const overallStats = useMemo(() => {
    let totalTarget = 0;
    let totalSaved = 0;
    let completedCount = 0;

    goals.forEach(g => {
      totalTarget += g.targetAmount;
      totalSaved += g.currentAmount;
      if (g.currentAmount >= g.targetAmount && g.targetAmount > 0) {
        completedCount++;
      }
    });

    const completionRate = goals.length > 0 
      ? Math.round((completedCount / goals.length) * 100) 
      : 0;

    const targetProgressPct = totalTarget > 0 
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) 
      : 0;

    return {
      totalTarget,
      totalSaved,
      completedCount,
      totalGoals: goals.length,
      completionRate,
      targetProgressPct,
    };
  }, [goals]);

  // ── Categorized Goals for the selected bucket ─────────────────────────────
  const { filteredGoals, segmentLabel } = useMemo(() => {
    let list: FinanceGoal[] = [];
    let label = 'Combined Goals';

    if (selectedSegment === 'both') {
      list = goals.filter(g => g.isShared || g.assignedTo === 'both');
      label = 'Combined Goals';
    } else if (selectedSegment === 'me') {
      list = goals.filter(g => !g.isShared && (g.assignedUserId === currentUser?.id || g.assignedTo === 'me'));
      label = `My Individual Goals (${currentUser?.name?.split(' ')[0] || 'Me'})`;
    } else if (selectedSegment === 'partner') {
      list = goals.filter(g => !g.isShared && (g.assignedUserId === partner?.id || g.assignedTo === 'partner'));
      label = `${partner?.name?.split(' ')[0] || 'Partner'}'s Individual Goals`;
    } else {
      list = goals;
      label = 'All Goals';
    }

    return { filteredGoals: list, segmentLabel: label };
  }, [goals, selectedSegment, currentUser, partner]);

  // ── Pie Chart Data ────────────────────────────────────────────────────────
  const { chartData, segmentTotalSaved } = useMemo(() => {
    const total = filteredGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Only include goals that have saved money > 0 in the pie chart
    const data = filteredGoals
      .filter(g => g.currentAmount > 0)
      .map(g => {
        const pctOfBucket = total > 0 ? Math.round((g.currentAmount / total) * 100) : 0;
        const pctOfTarget = g.targetAmount > 0 
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) 
          : 0;

        return {
          id: g.id,
          name: g.title,
          value: g.currentAmount,
          targetAmount: g.targetAmount,
          color: g.color || '#3B82F6',
          pctOfBucket,
          pctOfTarget,
        };
      });

    return { chartData: data, segmentTotalSaved: total };
  }, [filteredGoals]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-white text-sm">{item.name}</span>
          </div>
          <div className="pt-1 border-t border-white/10 space-y-0.5 text-slate-300">
            <p>
              Saved: <strong className="text-emerald-400 font-bold">{formatCurrency(item.value, currency)}</strong>
            </p>
            <p>
              Share of Savings: <strong className="text-white font-bold">{item.pctOfBucket}%</strong>
            </p>
            <p>
              Goal Completed: <strong className="text-indigo-300 font-bold">{item.pctOfTarget}% of target</strong>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl overflow-hidden transition-all duration-300">
      {/* ── Card Header (Collapsible Toggle) ─────────────────────────────── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-md">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Goal Analytics & Savings Distribution</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {overallStats.completedCount}/{overallStats.totalGoals} Completed
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive pie chart breakdown of goals savings contribution
            </p>
          </div>
        </div>
        <div className="p-1 rounded-lg bg-white/5 text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 space-y-5 animate-in fade-in duration-200">
          {/* ── Top 4 Key Metrics ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Metric 1: Goals Completed */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold">Goals Completed</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-400">
                {overallStats.completedCount} <span className="text-xs text-slate-400 font-normal">/ {overallStats.totalGoals}</span>
              </p>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700" 
                  style={{ width: `${overallStats.completionRate}%` }} 
                />
              </div>
            </div>

            {/* Metric 2: Target Progress */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold">Target Achieved</span>
                <Target className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-base sm:text-lg font-black text-indigo-400">
                {overallStats.targetProgressPct}%
              </p>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-700" 
                  style={{ width: `${overallStats.targetProgressPct}%` }} 
                />
              </div>
            </div>

            {/* Metric 3: Total Saved in Goals */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold">Saved in Goals</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-sm sm:text-base font-black text-blue-400 truncate">
                {formatCurrency(overallStats.totalSaved, currency)}
              </p>
              <p className="text-[9px] text-slate-500 truncate">
                of {formatCurrency(overallStats.totalTarget, currency)}
              </p>
            </div>

            {/* Metric 4: Available Net Savings */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-semibold">Available Net Savings</span>
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm sm:text-base font-black text-amber-400 truncate">
                {formatCurrency(totalSavingsTogether, currency)}
              </p>
              <p className="text-[9px] text-slate-500 truncate">
                Income - Expenses (Joint)
              </p>
            </div>
          </div>

          {/* ── Segment Selector (Combined vs Individual) ────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Savings Contribution Breakdown:</span>
              <span className="text-[11px] text-slate-400 font-medium">
                {chartData.length} active funded {chartData.length === 1 ? 'goal' : 'goals'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-800/80 border border-white/5">
              <button
                type="button"
                onClick={() => setSelectedSegment('both')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSegment === 'both'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Combined</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSegment('me')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSegment === 'me'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Goals</span>
              </button>

              {partner && (
                <button
                  type="button"
                  onClick={() => setSelectedSegment('partner')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedSegment === 'partner'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span className="truncate">{partner.name?.split(' ')[0] || 'Partner'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedSegment('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedSegment === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>All Goals</span>
              </button>
            </div>
          </div>

          {/* ── Pie Chart & Legend Section ───────────────────────────────── */}
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
              {/* Pie Chart */}
              <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                <div className="w-full h-56 max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="rgba(15, 23, 42, 0.8)"
                        strokeWidth={2}
                      >
                        {chartData.map((entry) => (
                          <Cell key={`cell-${entry.id}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Center text in donut chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Saved</span>
                  <span className="text-base font-black text-white">
                    {formatCurrency(segmentTotalSaved, currency)}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">
                    {segmentLabel.split(' ')[0]}
                  </span>
                </div>
              </div>

              {/* Goal List / Legend Breakdown */}
              <div className="md:col-span-7 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredGoals.map((g) => {
                  const pctOfBucket = segmentTotalSaved > 0 
                    ? Math.round((g.currentAmount / segmentTotalSaved) * 100) 
                    : 0;
                  const pctOfTarget = g.targetAmount > 0 
                    ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) 
                    : 0;

                  return (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: g.color }}
                          />
                          <span className="text-xs font-bold text-white truncate max-w-[160px]">
                            {g.title}
                          </span>
                          {g.currentAmount >= g.targetAmount && g.targetAmount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold shrink-0">
                              ✓ Done
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-emerald-400">
                            {formatCurrency(g.currentAmount, currency)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 min-w-[32px] text-right">
                            {pctOfBucket}%
                          </span>
                        </div>
                      </div>

                      {/* Goal completion bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pctOfTarget}%`, backgroundColor: g.color }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {pctOfTarget}% of {formatCurrency(g.targetAmount, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center space-y-2">
              <PieIcon className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
              <p className="text-white text-xs font-bold">No savings allocated in {segmentLabel} yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {filteredGoals.length > 0 
                  ? 'Click the "Deposit" button on any goal card below to start contributing savings!' 
                  : 'No goals found in this category. Create one using the "+ New Goal" button!'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
