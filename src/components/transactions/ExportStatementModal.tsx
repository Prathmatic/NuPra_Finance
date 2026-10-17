import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Users, 
  User, 
  FileDown,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  ExternalLink,
  Target
} from 'lucide-react';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';
import { Transaction } from '../../types/finance';
import { generateStatementPdfBlob, StatementData } from '../../utils/pdfGenerator';
import { exportFile } from '../../utils/fileDownloader';

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
    currency, 
    selectedMonth,
    showToast 
  } = useFinance();

  const [scope, setScope] = useState<StatementScope>('couple');
  const [periodType, setPeriodType] = useState<StatementPeriod>('monthly');
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [targetYear, setTargetYear] = useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
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
  const { totalIncome, totalExpense, netSavings, savingsRate, goalCapital } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    statementTransactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });

    // Goal capital allocated in this timeframe
    let goalsTotal = 0;
    (goals || []).forEach(g => {
      (g.contributions || []).forEach(c => {
        if (periodType === 'monthly' && c.date?.startsWith(targetMonth)) goalsTotal += c.amount;
        else if (periodType === 'yearly' && c.date?.startsWith(targetYear)) goalsTotal += c.amount;
        else if (periodType === 'all') goalsTotal += c.amount;
      });
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;

    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: net,
      savingsRate: rate,
      goalCapital: goalsTotal,
    };
  }, [statementTransactions, goals, periodType, targetMonth, targetYear]);

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

    const rows = statementTransactions.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.categoryName || '').replace(/"/g, '""')}"`,
      `"${t.type.toUpperCase()}"`,
      t.amount,
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

      const relevantGoals = (goals || []).map(g => ({
        id: g.id,
        title: g.title,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        isCompleted: Boolean(g.isCompleted || g.currentAmount >= g.targetAmount),
      }));

      const statementData: StatementData = {
        scopeLabel,
        periodLabel,
        statementDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        vaultName: vault?.name || 'Couple Vault',
        vaultId: vault?.id || 'NP-VAULT',
        accountHolders: `${currentUser.name}${partner ? ` & ${partner.name}` : ''}`,
        currency,
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        goalCapital,
        transactions: statementTransactions.map(t => ({
          date: t.date,
          title: t.title,
          categoryName: t.categoryName,
          userName: t.userName,
          paymentMethod: t.paymentMethod,
          type: t.type,
          amount: t.amount,
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
      showToast('Could not generate PDF. Opening Print View...', 'error');
      setShowPrintPreview(true);
    } finally {
      setIsExporting(false);
    }
  };

  // Open Full In-App Statement Preview / Print Dialog
  const handleOpenPrintPreview = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Print call warning:', e);
      }
    }, 350);
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
      {/* ───────────────────────────────────────────────────────────────────
          VIEW 1: IN-APP HIGH-DEFINITION STATEMENT PRINT PREVIEW
          ─────────────────────────────────────────────────────────────────── */}
      {showPrintPreview ? (
        <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Top Actions Bar (Hidden during print) */}
          <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPrintPreview(false)}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Options</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print / Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleShareTextSummary}
                className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Summary</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Printable Statement Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-1" id="statement-printable-section">
            {/* Statement Header with NP Logo */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-700 border-2 border-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                  NP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">NuPra Finance</h1>
                    <span className="bg-slate-900 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                      Official Statement
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified Financial Ledger & Audit Trail • {vault?.name || 'Couple Vault'}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-0.5">
                <p>Generated: <strong className="text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                <p>Period: <strong className="text-slate-900">{periodLabel}</strong></p>
                <p className="text-[10px] text-slate-400">Vault ID: {vault?.id || 'NP-VAULT'}</p>
              </div>
            </div>

            {/* Account & Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Holder Scope</p>
                <p className="font-bold text-slate-900 text-sm">{scopeLabel}</p>
                <p className="text-slate-600">Vault: <strong className="text-slate-900">{vault?.name || 'Couple Vault'}</strong></p>
                <p className="text-slate-600">Members: <strong className="text-slate-900">{currentUser.name}{partner ? ` & ${partner.name}` : ''}</strong></p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Financials</p>
                <p className="text-slate-600">Currency: <strong className="text-slate-900">{currency}</strong></p>
                <p className="text-slate-600">Total Records: <strong className="text-slate-900">{statementTransactions.length} transactions</strong></p>
                <p className="text-slate-600">
                  Net Balance: <strong className={netSavings >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{formatCurrency(netSavings, currency)}</strong>
                </p>
              </div>
            </div>

            {/* Summary Metrics Quad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <p className="text-[9px] uppercase font-bold text-emerald-700">Total Income (+)</p>
                <p className="text-base sm:text-lg font-black text-emerald-800">+{formatCurrency(totalIncome, currency)}</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                <p className="text-[9px] uppercase font-bold text-rose-700">Total Expense (-)</p>
                <p className="text-base sm:text-lg font-black text-rose-800">-{formatCurrency(totalExpense, currency)}</p>
              </div>
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-2xl text-center">
                <p className="text-[9px] uppercase font-bold text-slate-700">Net Savings ({savingsRate}%)</p>
                <p className={`text-base sm:text-lg font-black ${netSavings >= 0 ? 'text-slate-900' : 'text-rose-800'}`}>
                  {formatCurrency(netSavings, currency)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-center">
                <p className="text-[9px] uppercase font-bold text-purple-700">Goals Capital</p>
                <p className="text-base sm:text-lg font-black text-purple-800">
                  {formatCurrency(goalCapital, currency)}
                </p>
              </div>
            </div>

            {/* Financial Goals & Milestones Section (Separately) */}
            {goals && goals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Financial Goals & Milestones
                  </h3>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-3 font-bold">Goal Name</th>
                        <th className="py-2 px-3 font-bold">Target</th>
                        <th className="py-2 px-3 font-bold">Current Saved</th>
                        <th className="py-2 px-3 font-bold">Progress</th>
                        <th className="py-2 px-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {goals.map(g => {
                        const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                        return (
                          <tr key={g.id} className="bg-white">
                            <td className="py-2 px-3 font-bold text-slate-900">{g.title}</td>
                            <td className="py-2 px-3 text-slate-600">{formatCurrency(g.targetAmount, currency)}</td>
                            <td className="py-2 px-3 text-emerald-700 font-bold">{formatCurrency(g.currentAmount, currency)}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                g.isCompleted || pct >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {g.isCompleted || pct >= 100 ? 'Completed' : 'In Progress'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Transaction Ledger & Audit Trail
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 font-bold">Date</th>
                      <th className="py-2.5 px-3 font-bold">Description</th>
                      <th className="py-2.5 px-3 font-bold">Category</th>
                      <th className="py-2.5 px-3 font-bold">Paid By</th>
                      <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statementTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No transactions found in this period.
                        </td>
                      </tr>
                    ) : (
                      statementTransactions.map((t, idx) => (
                        <tr key={t.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {t.title}
                            {t.isGoalExpense && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">Goal</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{t.categoryName || 'General'}</td>
                          <td className="py-2 px-3 text-slate-500">{t.userName || 'Joint'}</td>
                          <td className={`py-2 px-3 text-right font-black whitespace-nowrap ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              <p>NuPra Finance Official Statement • Personal and confidential financial ledger</p>
            </div>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────────────
            VIEW 2: STATEMENT CONFIGURATION & DOWNLOAD MODAL
            ─────────────────────────────────────────────────────────────────── */
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
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(true)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 active:scale-95 transition-all"
                  >
                    View Ledger
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
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

              <button
                type="button"
                onClick={handleOpenPrintPreview}
                disabled={statementTransactions.length === 0 || isExporting}
                className="py-3 px-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                title={statementTransactions.length === 0 ? "Select a timeframe with records to enable" : "Open Print dialog or Save as PDF"}
              >
                <Printer className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Print View</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
