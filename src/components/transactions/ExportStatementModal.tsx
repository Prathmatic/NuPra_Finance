import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate, formatMonthYear } from '../../utils/formatters';
import { Transaction } from '../../types/finance';
import { downloadStatementPdf, printStatementHtml, StatementData } from '../../utils/pdfGenerator';

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
    currency,
    selectedMonth,
    showToast 
  } = useFinance();

  const [scope, setScope] = useState<StatementScope>('couple');
  const [periodType, setPeriodType] = useState<StatementPeriod>('monthly');
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [targetYear, setTargetYear] = useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState<boolean>(false);

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
  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    statementTransactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp,
    };
  }, [statementTransactions]);

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

  // Export CSV (with native mobile Web Share API + browser fallback)
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const cleanScope = scope === 'couple' ? 'Couple' : scope === 'me' ? currentUser.name : partner?.name || 'Partner';
    const cleanPeriod = periodType === 'monthly' ? targetMonth : periodType === 'yearly' ? targetYear : 'AllTime';
    const fileName = `NuPra_Statement_${cleanScope}_${cleanPeriod}.csv`;

    // 1. Mobile: Web Share API with File
    try {
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      if (nav && typeof nav.canShare === 'function' && typeof nav.share === 'function') {
        const file = new File([blob], fileName, { type: 'text/csv' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: fileName,
            text: `NuPra Finance CSV Statement: ${scopeLabel} (${periodLabel})`,
          });
          showToast('CSV statement exported successfully! 📊', 'success');
          onClose();
          return;
        }
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') return;
      console.warn('CSV share failed, falling back to download:', shareErr);
    }

    // 2. Standard browser download
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('CSV statement downloaded successfully', 'success');
      onClose();
    } catch (e) {
      console.error('CSV download error:', e);
      showToast('Could not download CSV', 'error');
    }
  };

  // Direct PDF Download (with native Android Web Share API + fallback)
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
        transactions: statementTransactions.map(t => ({
          date: t.date,
          title: t.title,
          categoryName: t.categoryName,
          userName: t.userName,
          paymentMethod: t.paymentMethod,
          type: t.type,
          amount: t.amount,
        })),
      };

      const success = await downloadStatementPdf(statementData, fileName);
      if (success) {
        showToast('PDF statement ready! 📄', 'success');
        onClose();
      } else {
        showToast('Opening print view as fallback...', 'info');
        handlePrintStatement();
      }
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Direct download failed, opening print view...', 'info');
      handlePrintStatement();
    } finally {
      setIsExporting(false);
    }
  };

  // Printable Statement / Save as PDF
  const handlePrintStatement = () => {
    const rowsHtml = statementTransactions.map(t => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-size: 12px; color: #475569;">${t.date}</td>
        <td style="padding: 10px 8px; font-size: 12px; font-weight: 600; color: #0f172a;">${t.title}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #64748b;">${t.categoryName}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #475569;">${t.userName}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #64748b;">${t.paymentMethod || 'None'}</td>
        <td style="padding: 10px 8px; font-size: 12px; text-align: right; font-weight: 700; color: ${t.type === 'income' ? '#059669' : '#dc2626'};">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, currency)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>NuPra Finance Statement — ${scopeLabel} — ${periodLabel}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 30px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
            .badge { background: #0f172a; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; margin-left: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 12px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .card-val { font-size: 20px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; background: #f1f5f9; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
            .print-btn { background: #0f172a; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #e2e8f0; padding: 12px 20px; border-radius: 12px;">
            <span style="font-size: 13px; font-weight: 600;">Bank Statement Ready</span>
            <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
          </div>

          <div class="header">
            <div>
              <div class="logo">NuPra Finance <span class="badge">Official Statement</span></div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Verified Ledger • ${vault?.name || 'Couple Vault'}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <div>Generated on: <strong>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
              <div>Period: <strong>${periodLabel}</strong></div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 13px;">ACCOUNT HOLDER DETAILS</div>
              <div style="color: #475569;">Scope: <strong style="color: #0f172a;">${scopeLabel}</strong></div>
              <div style="color: #475569;">Vault: <strong style="color: #0f172a;">${vault?.name || 'Couple Vault'}</strong></div>
              <div style="color: #475569;">Primary Members: <strong style="color: #0f172a;">${currentUser.name}${partner ? ` & ${partner.name}` : ''}</strong></div>
            </div>
            <div class="info-box">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 13px;">STATEMENT SUMMARY</div>
              <div style="color: #475569;">Currency: <strong style="color: #0f172a;">${currency}</strong></div>
              <div style="color: #475569;">Total Records: <strong style="color: #0f172a;">${statementTransactions.length} transactions</strong></div>
              <div style="color: #475569;">Net Savings: <strong style="color: ${netSavings >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(netSavings, currency)}</strong></div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Total Income (+)</div>
              <div class="card-val" style="color: #059669;">+${formatCurrency(totalIncome, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Expense (-)</div>
              <div class="card-val" style="color: #dc2626;">-${formatCurrency(totalExpense, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Net Balance</div>
              <div class="card-val" style="color: ${netSavings >= 0 ? '#0f172a' : '#dc2626'};">${formatCurrency(netSavings, currency)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 100px;">Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid By</th>
                <th>Method</th>
                <th style="text-align: right; width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions found in this period.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <p>This statement is generated by NuPra Finance for account holder verification. Confidential and personal records.</p>
          </div>
        </body>
      </html>
    `;

    printStatementHtml(html);
    showToast('Print dialog opened', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Financial Statement</h2>
              <p className="text-[11px] text-slate-400">Official bank-style ledger for mobile, PDF & spreadsheets</p>
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
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {availableMonths.map((m) => {
                  const [y, mon] = m.split('-').map(Number);
                  const date = new Date(y, mon - 1, 1);
                  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const count = activeMonthsForScope.get(m) || 0;
                  return (
                    <option key={m} value={m}>
                      {label} {count > 0 ? `(${count} records)` : '(0 records)'}
                    </option>
                  );
                })}
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
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
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
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
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
    </div>
  );
};
