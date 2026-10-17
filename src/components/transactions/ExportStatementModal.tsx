import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  FileText, 
  Download, 
  Users, 
  User, 
  FileDown,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle,
  Check,
  Share2,
  ExternalLink,
  Target
} from 'lucide-react';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';
import { Transaction } from '../../types/finance';
import { generateStatementPdfBlob, StatementData, StatementBreakdownItem } from '../../utils/pdfGenerator';
import { exportFile } from '../../utils/fileDownloader';
import { getSavedExchangeRate } from '../../services/exchangeRateService';

interface ExportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StatementScope = 'couple' | 'me' | 'partner';
type StatementPeriod = 'monthly' | 'yearly' | 'all';

export const ExportStatementModal: React.FC<ExportStatementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    currentUser, 
    partner, 
    vault, 
    transactions, 
    goals,
    stocks,
    currency, 
    selectedMonth,
    showToast,
    exchangeRate 
  } = useFinance();

  const effectiveExchangeRate = exchangeRate || getSavedExchangeRate().rate || 106.75;

  const [scope, setScope] = useState<StatementScope>('couple');
  const [periodType, setPeriodType] = useState<StatementPeriod>('monthly');
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [targetYear, setTargetYear] = useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [csvCopied, setCsvCopied] = useState<boolean>(false);

  // Robust user matching functions that gracefully handle ID or username variations
  const isMyTransaction = (t: Transaction): boolean => {
    if (!currentUser) return false;
    if (t.userId && t.userId === currentUser.id) return true;
    if (t.userName && currentUser.name && t.userName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
    if (partner?.id && t.userId && t.userId !== partner.id) return true;
    if (partner?.name && t.userName && t.userName.trim().toLowerCase() !== partner.name.trim().toLowerCase()) return true;
    return false;
  };

  const isPartnerTransaction = (t: Transaction): boolean => {
    if (!partner) return false;
    if (partner.id && t.userId === partner.id) return true;
    if (partner.name && t.userName && t.userName.trim().toLowerCase() === partner.name.trim().toLowerCase()) return true;
    if (currentUser?.id && t.userId && t.userId !== currentUser.id) return true;
    if (currentUser?.name && t.userName && t.userName.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()) return true;
    return false;
  };

  // Available unique months and years from transaction records + current date
  const { availableMonths, availableYears } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<string>();

    const now = new Date();
    monthsSet.add(now.toISOString().slice(0, 7));
    yearsSet.add(now.getFullYear().toString());

    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.slice(0, 7));
        yearsSet.add(t.date.slice(0, 4));
      }
    });

    const months = Array.from(monthsSet).sort().reverse();
    const years = Array.from(yearsSet).sort().reverse();

    return { availableMonths: months, availableYears: years };
  }, [transactions]);

  // All transactions matching the selected scope (unconstrained by month/year)
  const scopeTransactionsAllTime = useMemo(() => {
    return transactions.filter(t => {
      if (scope === 'me') return isMyTransaction(t);
      if (scope === 'partner') return isPartnerTransaction(t);
      return true; // couple joint
    });
  }, [transactions, scope, currentUser, partner]);

  // Map of YYYY-MM -> record count for current scope
  const activeMonthsForScope = useMemo(() => {
    const counts = new Map<string, number>();
    scopeTransactionsAllTime.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const m = t.date.slice(0, 7);
        counts.set(m, (counts.get(m) || 0) + 1);
      }
    });
    return counts;
  }, [scopeTransactionsAllTime]);

  // Latest month that actually has transactions for the selected scope
  const latestActiveMonth = useMemo(() => {
    const monthsWithRecords = Array.from(activeMonthsForScope.entries())
      .filter(([, count]) => count > 0)
      .map(([m]) => m)
      .sort()
      .reverse();
    return monthsWithRecords[0] || null;
  }, [activeMonthsForScope]);

  // Smart scope switcher: if current month has 0 records for the new scope, auto-switch to a month with records
  const handleScopeChange = (newScope: StatementScope) => {
    setScope(newScope);

    const filterFn = newScope === 'me' 
      ? isMyTransaction 
      : newScope === 'partner' 
      ? isPartnerTransaction 
      : () => true;

    const newScopeTxs = transactions.filter(filterFn);
    if (newScopeTxs.length === 0) return;

    if (periodType === 'monthly') {
      const countInCurrentMonth = newScopeTxs.filter(t => t.date?.startsWith(targetMonth)).length;
      if (countInCurrentMonth === 0) {
        const recentWithTx = newScopeTxs
          .map(t => t.date?.slice(0, 7))
          .filter((m): m is string => Boolean(m))
          .sort()
          .reverse()[0];

        if (recentWithTx) {
          setTargetMonth(recentWithTx);
        } else {
          setPeriodType('all');
        }
      }
    }
  };

  // Filtered transactions for the statement
  const statementTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Scope filter
      if (scope === 'me' && !isMyTransaction(t)) return false;
      if (scope === 'partner' && !isPartnerTransaction(t)) return false;

      // Period filter
      if (periodType === 'monthly' && !t.date?.startsWith(targetMonth)) return false;
      if (periodType === 'yearly' && !t.date?.startsWith(targetYear)) return false;

      return true;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || '')); // chronological for bank statement
  }, [transactions, scope, periodType, targetMonth, targetYear, currentUser, partner]);

  // Aggregate financial metrics
  const { totalIncome, totalExpense, netSavings, savingsRate, goalCapital, stocksInvested } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    statementTransactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });

    // Goal capital allocated in this timeframe
    let goalsTotal = 0;
    (goals || []).forEach(g => {
      (g.contributions || []).forEach((c: { date?: string; amount: number }) => {
        if (periodType === 'monthly' && c.date?.startsWith(targetMonth)) goalsTotal += c.amount;
        else if (periodType === 'yearly' && c.date?.startsWith(targetYear)) goalsTotal += c.amount;
        else if (periodType === 'all') goalsTotal += c.amount;
      });
    });

    // Stocks invested in this timeframe
    let stocksTotal = 0;
    (stocks || []).forEach(s => {
      if (periodType === 'monthly' && s.monthYear === targetMonth) stocksTotal += s.investedAmount;
      else if (periodType === 'yearly' && s.date?.startsWith(targetYear)) stocksTotal += s.investedAmount;
      else if (periodType === 'all') stocksTotal += s.investedAmount;
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;

    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: net,
      savingsRate: rate,
      goalCapital: goalsTotal,
      stocksInvested: stocksTotal,
    };
  }, [statementTransactions, goals, stocks, periodType, targetMonth, targetYear]);

  // Build breakdown for pie chart
  const breakdown = useMemo((): StatementBreakdownItem[] => {
    const CATEGORY_COLORS: Record<string, [number, number, number]> = {
      'Food': [0.95, 0.45, 0.25],
      'Groceries': [0.90, 0.60, 0.10],
      'Rent': [0.35, 0.45, 0.85],
      'Housing': [0.35, 0.45, 0.85],
      'Transport': [0.20, 0.60, 0.85],
      'Travel': [0.10, 0.65, 0.80],
      'Health': [0.80, 0.20, 0.40],
      'Shopping': [0.75, 0.30, 0.80],
      'Entertainment': [0.90, 0.70, 0.10],
      'Utilities': [0.30, 0.70, 0.60],
      'Education': [0.20, 0.40, 0.80],
      'Personal': [0.60, 0.40, 0.80],
      'Subscriptions': [0.50, 0.30, 0.70],
      'Other': [0.55, 0.60, 0.65],
    };
    const DEFAULT_COLOR: [number, number, number] = [0.55, 0.60, 0.65];

    const items: StatementBreakdownItem[] = [];

    // Category-wise expenses (excluding stock investments, which are tracked via stocksInvested below)
    const catMap = new Map<string, number>();
    statementTransactions
      .filter(t => t.type === 'expense' && !t.isGoalExpense && !(
        t.stockId || 
        t.title?.startsWith('Stock Investment:') || 
        t.categoryId === 'cat-investment' || 
        t.categoryName?.toLowerCase() === 'investment'
      ))
      .forEach(t => {
        const cat = t.categoryName || 'Other';
        catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
      });
    catMap.forEach((amount, name) => {
      items.push({ name, amount, percentage: 0, color: CATEGORY_COLORS[name] || DEFAULT_COLOR, type: 'expense' });
    });

    // Net savings
    if (netSavings > 0) {
      items.push({ name: 'Savings', amount: netSavings, percentage: 0, color: [0.06, 0.72, 0.51], type: 'savings' });
    }

    // Goals capital
    if (goalCapital > 0) {
      items.push({ name: 'Goals Allocation', amount: goalCapital, percentage: 0, color: [0.55, 0.25, 0.85], type: 'goal' });
    }

    // Stocks invested
    if (stocksInvested > 0) {
      items.push({ name: 'Share Market', amount: stocksInvested, percentage: 0, color: [0.12, 0.60, 0.85], type: 'stock' });
    }

    const total = items.reduce((s, i) => s + i.amount, 0);
    if (total > 0) {
      items.forEach(i => { i.percentage = Math.round((i.amount / total) * 100); });
    }

    return items.sort((a, b) => b.amount - a.amount);
  }, [statementTransactions, netSavings, goalCapital, stocksInvested]);

  if (!isOpen || !currentUser) return null;


  const scopeLabel = scope === 'couple' 
    ? 'Couple Joint Account' 
    : scope === 'me' 
    ? `${currentUser.name} (Personal Account)` 
    : `${partner?.name || 'Partner'} (Personal Account)`;

  const periodLabel = periodType === 'monthly'
    ? formatMonthYear(targetMonth)
    : periodType === 'yearly'
    ? `Full Year ${targetYear}`
    : 'All Time Financial History';

  // Export CSV (Universal mobile & desktop via fileDownloader)
  const handleExportCSV = async () => {
    if (statementTransactions.length === 0) {
      showToast('No transactions found in this timeframe to export', 'info');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Description',
      'Category',
      'Type',
      'Amount',
      'Currency',
      'Paid By',
      'Payment Method',
      'Shared Status'
    ];

    const rateMultiplier = currency === 'INR' ? effectiveExchangeRate : 1;
    const convertCsvAmount = (val: number) => currency === 'INR' ? Math.round(val * rateMultiplier) : val;

    const rows = statementTransactions.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.categoryName || '').replace(/"/g, '""')}"`,
      `"${t.type.toUpperCase()}"`,
      convertCsvAmount(t.amount),
      `"${currency}"`,
      `"${(t.userName || '').replace(/"/g, '""')}"`,
      `"${(t.paymentMethod || 'Unspecified').replace(/"/g, '""')}"`,
      `"${t.isShared ? 'Shared' : 'Personal'}"`
    ]);

    // UTF-8 BOM for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const cleanScope = scope === 'couple' ? 'Couple' : scope === 'me' ? currentUser.name : partner?.name || 'Partner';
    const cleanPeriod = periodType === 'monthly' ? targetMonth : periodType === 'yearly' ? targetYear : 'AllTime';
    const fileName = `NuPra_Statement_${cleanScope}_${cleanPeriod}.csv`;

    // 1. Copy to clipboard immediately as instant assurance
    try {
      await navigator.clipboard.writeText(csvContent);
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 4000);
    } catch {}

    // 2. Export file via universal downloader (native Capacitor Android / Web Share / Data URI)
    const result = await exportFile({
      fileName,
      data: csvContent,
      mimeType: 'text/csv;charset=utf-8',
      title: `NuPra Statement CSV - ${scopeLabel}`,
      text: `NuPra Finance CSV Statement: ${scopeLabel} (${periodLabel})`,
    });

    showToast(result.message, result.success ? 'success' : 'info');
  };

  // Direct PDF Download & Share (Universal mobile & desktop via fileDownloader)
  const handleExportPDF = async () => {
    if (statementTransactions.length === 0) {
      showToast('No transactions found in this timeframe to export', 'info');
      return;
    }

    setIsExporting(true);
    try {
      const cleanScope = scope === 'couple' ? 'Couple' : scope === 'me' ? currentUser.name : partner?.name || 'Partner';
      const cleanPeriod = periodType === 'monthly' ? targetMonth : periodType === 'yearly' ? targetYear : 'AllTime';
      const fileName = `NuPra_Statement_${cleanScope}_${cleanPeriod}.pdf`;

      const rateMultiplier = currency === 'INR' ? effectiveExchangeRate : 1;
      const convertPdfAmount = (val: number) => currency === 'INR' ? Math.round(val * rateMultiplier) : val;

      const relevantGoals = (goals || []).map(g => ({
        id: g.id,
        title: g.title,
        targetAmount: convertPdfAmount(g.targetAmount),
        currentAmount: convertPdfAmount(g.currentAmount),
        isCompleted: Boolean(g.isCompleted || g.currentAmount >= g.targetAmount),
      }));

      const convertedBreakdown = breakdown.map(item => ({
        ...item,
        amount: convertPdfAmount(item.amount),
      }));

      const statementData: StatementData = {
        scopeLabel,
        periodLabel,
        statementDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        vaultName: vault?.name || 'Couple Vault',
        vaultId: vault?.id || 'NP-VAULT',
        accountHolders: `${currentUser.name}${partner ? ` & ${partner.name}` : ''}`,
        currency,
        exchangeRate: effectiveExchangeRate,
        totalIncome: convertPdfAmount(totalIncome),
        totalExpense: convertPdfAmount(totalExpense),
        netSavings: convertPdfAmount(netSavings),
        savingsRate,
        goalCapital: convertPdfAmount(goalCapital),
        stocksInvested: convertPdfAmount(stocksInvested),
        breakdown: convertedBreakdown,
        transactions: statementTransactions.map(t => ({
          date: t.date,
          title: t.title,
          categoryName: t.categoryName,
          userName: t.userName,
          paymentMethod: t.paymentMethod,
          type: t.type,
          amount: convertPdfAmount(t.amount),
          isGoalExpense: Boolean(t.isGoalExpense),
        })),
        goals: relevantGoals,
      };

      const blob = generateStatementPdfBlob(statementData);
      const url = URL.createObjectURL(blob);
      setPdfDownloadUrl(url);
      setPdfFileName(fileName);

      // Export file via universal downloader (native Capacitor Android / Web Share / Data URI)
      const result = await exportFile({
        fileName,
        data: blob,
        mimeType: 'application/pdf',
        title: `NuPra Statement PDF - ${scopeLabel}`,
        text: `NuPra Finance PDF Statement: ${scopeLabel} (${periodLabel})`,
      });

      if (result.uri) {
        setPdfDownloadUrl(result.uri);
      }

      showToast(result.message, result.success ? 'success' : 'info');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Could not generate PDF. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Share plain text statement summary via WhatsApp, Email, Notes
  const handleShareTextSummary = async () => {
    const textSummary = `*NuPra Finance Statement*
Scope: ${scopeLabel}
Period: ${periodLabel}
Vault: ${vault?.name || 'Couple Vault'}
Total Income: +${formatCurrency(totalIncome, currency)}
Total Expense: -${formatCurrency(totalExpense, currency)}
Net Balance: ${formatCurrency(netSavings, currency)} (${savingsRate}% saved)
Goals Capital Allocated: ${formatCurrency(goalCapital, currency)}
Total Records: ${statementTransactions.length}

Ledger Breakdown:
${statementTransactions.slice(0, 15).map(t => `• ${t.date} | ${t.title} | ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, currency)} (${t.categoryName})`).join('\n')}${statementTransactions.length > 15 ? `\n...and ${statementTransactions.length - 15} more transactions` : ''}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `NuPra Statement - ${scopeLabel}`,
          text: textSummary,
        });
        showToast('Statement summary shared! 📲', 'success');
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(textSummary);
      showToast('Statement summary copied to clipboard! 📋', 'success');
    } catch {
      showToast('Could not share statement', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* STATEMENT CONFIGURATION & DOWNLOAD MODAL */}
      <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Export Financial Statement</h2>
                <p className="text-[11px] text-slate-400">Official bank-style ledger with NP branding & goals</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Scope Selector: Couple vs Individual */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Statement Scope
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleScopeChange('couple')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    scope === 'couple'
                      ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-md'
                      : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Couple (Joint)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeChange('me')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    scope === 'me'
                      ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md'
                      : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="truncate max-w-[90px]">{currentUser.name} (Me)</span>
                </button>

                {partner && (
                  <button
                    type="button"
                    onClick={() => handleScopeChange('partner')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      scope === 'partner'
                        ? 'border-purple-500 bg-purple-500/20 text-white shadow-md'
                        : 'border-white/5 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="truncate max-w-[90px]">{partner.name}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Period Type: Monthly vs Yearly vs All Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Statement Timeframe
              </label>
              <div className="flex p-1 rounded-xl bg-slate-950/80 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPeriodType('monthly')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    periodType === 'monthly'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('yearly')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    periodType === 'yearly'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yearly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    periodType === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Period Selector Dropdowns */}
            {periodType === 'monthly' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Select Month
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {activeMonthsForScope.get(targetMonth) || 0} records in this month
                  </span>
                </div>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {formatMonthYear(m)} ({activeMonthsForScope.get(m) || 0} records)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'yearly' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Year
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y} className="bg-slate-900 text-white">
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Empty State Helper Banner */}
            {statementTransactions.length === 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>No transactions found for {scopeLabel} in {periodLabel}</span>
                </div>
                {scopeTransactionsAllTime.length > 0 ? (
                  <div className="space-y-2 text-slate-300">
                    <p className="text-[11px] leading-relaxed">
                      You have <strong className="text-white">{scopeTransactionsAllTime.length} transactions</strong> recorded in other timeframes.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPeriodType('all')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                      >
                        <span>Switch to All Time ({scopeTransactionsAllTime.length} records)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {latestActiveMonth && latestActiveMonth !== targetMonth && (
                        <button
                          type="button"
                          onClick={() => {
                            setPeriodType('monthly');
                            setTargetMonth(latestActiveMonth);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
                        >
                          Go to {formatMonthYear(latestActiveMonth)} ({activeMonthsForScope.get(latestActiveMonth)} records)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    No expenses or income have been recorded for this account yet. Record a transaction to generate a statement.
                  </p>
                )}
              </div>
            )}

            {/* Live Preview Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400">{scopeLabel} · {periodLabel}</span>
                <span className="font-bold text-white">{statementTransactions.length} records</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <p className="text-[10px] text-slate-400">Total Income</p>
                  <p className="text-xs font-bold text-emerald-400">+{formatCurrency(totalIncome, currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Total Expense</p>
                  <p className="text-xs font-bold text-rose-400">-{formatCurrency(totalExpense, currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Net Savings</p>
                  <p className={`text-xs font-black ${netSavings >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {formatCurrency(netSavings, currency)}
                  </p>
                </div>
              </div>

              {currency === 'INR' && (
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5 text-slate-400">
                  <span>Conversion Benchmark:</span>
                  <span className="font-mono text-indigo-300 font-semibold">1 EUR = {effectiveExchangeRate.toFixed(2)} INR</span>
                </div>
              )}
            </div>

            {/* Generated PDF Direct Download Card */}
            {pdfDownloadUrl && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>PDF Statement Ready</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{pdfFileName}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={pdfDownloadUrl}
                    download={pdfFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Open / Download PDF</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>

                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={statementTransactions.length === 0 || isExporting}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-emerald-500/20"
                title={statementTransactions.length === 0 ? "Select a timeframe with records to enable" : "Save or Share Statement PDF on mobile or desktop"}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 shrink-0" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={statementTransactions.length === 0 || isExporting}
                className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
                title={statementTransactions.length === 0 ? "Select a timeframe with records to enable" : "Download Excel / CSV spreadsheet"}
              >
                {csvCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>CSV Copied!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Download CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};
