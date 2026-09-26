import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Users, 
  User, 
  Check, 
  ArrowDownRight, 
  ArrowUpRight,
  Building
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Transaction } from '../../types/finance';

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

  // Filtered transactions for the statement
  const statementTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Scope filter
      if (scope === 'me' && t.userId !== currentUser?.id) return false;
      if (scope === 'partner' && partner && t.userId !== partner.id) return false;

      // Period filter
      if (periodType === 'monthly' && !t.date.startsWith(targetMonth)) return false;
      if (periodType === 'yearly' && !t.date.startsWith(targetYear)) return false;

      return true;
    }).sort((a, b) => a.date.localeCompare(b.date)); // chronological for bank statement
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
    ? new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : periodType === 'yearly'
    ? `Full Year ${targetYear}`
    : 'All Time Financial History';

  // Export CSV
  const handleExportCSV = () => {
    if (statementTransactions.length === 0) {
      showToast('No transactions found for this period to export', 'info');
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanScope = scope === 'couple' ? 'Couple' : scope === 'me' ? currentUser.name : partner?.name || 'Partner';
    const cleanPeriod = periodType === 'monthly' ? targetMonth : periodType === 'yearly' ? targetYear : 'AllTime';
    
    link.href = url;
    link.setAttribute('download', `NuPra_Statement_${cleanScope}_${cleanPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('CSV statement downloaded successfully', 'success');
    onClose();
  };

  // Printable Statement / Save as PDF
  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to generate statement print view', 'error');
      return;
    }

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
              <p style="margin: 5px 0 0; color: #64748b; font-size: 13px;">Couple & Personal Wealth Management</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <p style="margin: 0; font-weight: 700; color: #0f172a;">Statement Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p style="margin: 3px 0 0;">Vault ID: ${vault?.id || 'NP-VAULT'}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <p style="margin: 0 0 5px; font-weight: 700; color: #0f172a;">Account Information</p>
              <p style="margin: 2px 0;"><strong>Vault Name:</strong> ${vault?.name || 'Couple Vault'}</p>
              <p style="margin: 2px 0;"><strong>Account Scope:</strong> ${scopeLabel}</p>
              <p style="margin: 2px 0;"><strong>Account Holders:</strong> ${currentUser.name}${partner ? ` & ${partner.name}` : ''}</p>
            </div>
            <div class="info-box">
              <p style="margin: 0 0 5px; font-weight: 700; color: #0f172a;">Statement Period Details</p>
              <p style="margin: 2px 0;"><strong>Period:</strong> ${periodLabel}</p>
              <p style="margin: 2px 0;"><strong>Currency:</strong> ${currency}</p>
              <p style="margin: 2px 0;"><strong>Total Records:</strong> ${statementTransactions.length} entries</p>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Total Credits (Income)</div>
              <div class="card-val" style="color: #059669;">+${formatCurrency(totalIncome, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Debits (Expenses)</div>
              <div class="card-val" style="color: #dc2626;">-${formatCurrency(totalExpense, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Net Financial Savings</div>
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

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    showToast('Statement view generated. Tap Print to save as PDF.', 'success');
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
              <p className="text-[11px] text-slate-400">Official bank-style ledger for spreadsheets & PDF</p>
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
                onClick={() => setScope('couple')}
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
                onClick={() => setScope('me')}
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
                  onClick={() => setScope('partner')}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Month
              </label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {availableMonths.map((m) => {
                  const [y, mon] = m.split('-').map(Number);
                  const date = new Date(y, mon - 1, 1);
                  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {label}
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
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={statementTransactions.length === 0}
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
              disabled={statementTransactions.length === 0}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-500/25"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
