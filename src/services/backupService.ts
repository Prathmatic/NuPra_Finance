import { getSupabase } from './supabaseClient';
import { exportFile } from '../utils/fileDownloader';
import type { FinanceSnapshot } from './supabaseFinance';
import type { 
  Transaction, 
  BillItem, 
  FinanceGoal, 
  StockInvestment,
  BudgetsConfig,
  UserProfile,
  Category,
  CurrencyCode 
} from '../types/finance';

export type BackupType = 'full_snapshot' | 'deleted_items' | 'reset_archive' | 'manual_export';
export type TimeRangePreset = '7d' | '30d' | '3m' | '6m' | 'custom' | 'all';

export interface BackupRecord {
  id: string;
  vaultId: string;
  backupType: BackupType;
  title: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  payload: any;
  createdAt: string;
  createdBy?: string;
}

export interface DeletedItemEntry {
  id: string;
  entityType: 'transaction' | 'bill' | 'goal' | 'stock';
  deletedAt: string;
  deletedByUserId?: string;
  deletedByUserName?: string;
  data: Transaction | BillItem | FinanceGoal | StockInvestment;
}

export interface BackupExportPayload {
  version: string;
  appName: string;
  exportedAt: string;
  vaultId: string;
  vaultName?: string;
  range: {
    preset: TimeRangePreset;
    startDate?: string;
    endDate?: string;
  };
  includesDeleted: boolean;
  summary: {
    transactionsCount: number;
    billsCount: number;
    goalsCount: number;
    stocksCount: number;
    totalIncome: number;
    totalExpense: number;
    currency: CurrencyCode;
  };
  data: {
    transactions: (Transaction & { isDeleted?: boolean; deletedAt?: string })[];
    bills: (BillItem & { isDeleted?: boolean; deletedAt?: string })[];
    goals: (FinanceGoal & { isDeleted?: boolean; deletedAt?: string })[];
    stocks: (StockInvestment & { isDeleted?: boolean; deletedAt?: string })[];
    budgets?: BudgetsConfig;
    categories?: Category[];
    currency?: CurrencyCode;
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  payload?: BackupExportPayload;
  summary?: {
    transactionsCount: number;
    billsCount: number;
    goalsCount: number;
    stocksCount: number;
    exportedAt: string;
    vaultName?: string;
    currency: CurrencyCode;
  };
}

const LOCAL_STORAGE_BACKUP_KEY_PREFIX = 'nupra_vault_backups_';
const LOCAL_STORAGE_DELETED_KEY_PREFIX = 'nupra_deleted_items_';

/**
 * Get local fallback backup list
 */
function getLocalBackups(vaultId: string): BackupRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_BACKUP_KEY_PREFIX}${vaultId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save to local fallback backup list (keeps up to 40 recent records)
 */
function saveLocalBackup(vaultId: string, record: BackupRecord) {
  try {
    const current = getLocalBackups(vaultId);
    const updated = [record, ...current.filter(b => b.id !== record.id)].slice(0, 40);
    localStorage.setItem(`${LOCAL_STORAGE_BACKUP_KEY_PREFIX}${vaultId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save backup to localStorage:', err);
  }
}

/**
 * Get local deleted items list
 */
export function getLocalDeletedItems(vaultId: string): DeletedItemEntry[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_DELETED_KEY_PREFIX}${vaultId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save deleted item to local archive (keeps up to 100 recent deleted items)
 */
function saveLocalDeletedItem(vaultId: string, entry: DeletedItemEntry) {
  try {
    const current = getLocalDeletedItems(vaultId);
    const updated = [entry, ...current.filter(e => e.id !== entry.id)].slice(0, 100);
    localStorage.setItem(`${LOCAL_STORAGE_DELETED_KEY_PREFIX}${vaultId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save deleted item to localStorage:', err);
  }
}

/**
 * 1. Log Deleted Items to Database & Local Storage
 * Ensures that even when items are deleted from active views, they are securely preserved.
 */
export async function recordDeletedItems(
  vaultId: string,
  entityType: 'transaction' | 'bill' | 'goal' | 'stock',
  items: (Transaction | BillItem | FinanceGoal | StockInvestment)[],
  currentUser?: UserProfile | null
): Promise<void> {
  if (!vaultId || !items.length) return;

  const now = new Date().toISOString();
  const entries: DeletedItemEntry[] = items.map(item => ({
    id: `${item.id}_del_${Date.now()}`,
    entityType,
    deletedAt: now,
    deletedByUserId: currentUser?.id,
    deletedByUserName: currentUser?.name || 'User',
    data: item,
  }));

  // Save to local storage for instant offline resilience
  entries.forEach(entry => saveLocalDeletedItem(vaultId, entry));

  // Save to Supabase vault_data_backups table
  try {
    const backupRecord = {
      vault_id: vaultId,
      backup_type: 'deleted_items',
      title: `Deleted ${items.length} ${entityType}(s)`,
      payload: entries,
      created_at: now,
      created_by: currentUser?.id || null,
    };

    const { error } = await getSupabase()
      .from('vault_data_backups')
      .insert(backupRecord);

    if (error) {
      console.warn('Supabase recordDeletedItems notice (table may need migration):', error.message);
    }
  } catch (err) {
    console.warn('Supabase vault_data_backups insert bypassed:', err);
  }
}

/**
 * 2. Log Reset-to-Zero Archive
 * Automatically saves a full snapshot backup before resetting all amounts to 0.
 */
export async function recordResetArchive(
  vaultId: string,
  snapshot: FinanceSnapshot,
  currentUser?: UserProfile | null
): Promise<void> {
  if (!vaultId) return;

  const now = new Date().toISOString();
  const record: BackupRecord = {
    id: `reset_${Date.now()}`,
    vaultId,
    backupType: 'reset_archive',
    title: 'Pre-Reset Snapshot (Amounts to 0)',
    payload: snapshot,
    createdAt: now,
    createdBy: currentUser?.id,
  };

  saveLocalBackup(vaultId, record);

  try {
    const { error } = await getSupabase()
      .from('vault_data_backups')
      .insert({
        vault_id: vaultId,
        backup_type: 'reset_archive',
        title: record.title,
        payload: snapshot,
        created_at: now,
        created_by: currentUser?.id || null,
      });

    if (error) {
      console.warn('Supabase recordResetArchive notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase reset archive insert bypassed:', err);
  }
}

/**
 * 3. Create a Manual Cloud Backup
 */
export async function createManualVaultBackup(
  vaultId: string,
  snapshot: FinanceSnapshot,
  title = 'Manual Vault Backup',
  currentUser?: UserProfile | null
): Promise<boolean> {
  if (!vaultId) return false;

  const now = new Date().toISOString();
  const record: BackupRecord = {
    id: `manual_${Date.now()}`,
    vaultId,
    backupType: 'manual_export',
    title,
    payload: snapshot,
    createdAt: now,
    createdBy: currentUser?.id,
  };

  saveLocalBackup(vaultId, record);

  try {
    const { error } = await getSupabase()
      .from('vault_data_backups')
      .insert({
        vault_id: vaultId,
        backup_type: 'manual_export',
        title,
        payload: snapshot,
        created_at: now,
        created_by: currentUser?.id || null,
      });

    if (error) {
      console.warn('Supabase manual backup notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase manual backup bypassed:', err);
    return false;
  }
}

/**
 * 4. Fetch All Backups for a Vault (Combines Supabase and Local Cache)
 */
export async function fetchVaultBackupsList(vaultId: string): Promise<BackupRecord[]> {
  const localList = getLocalBackups(vaultId);

  try {
    const { data, error } = await getSupabase()
      .from('vault_data_backups')
      .select('id, vault_id, backup_type, title, date_range_start, date_range_end, created_at, created_by, payload')
      .eq('vault_id', vaultId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return localList;
    }

    const remoteRecords: BackupRecord[] = data.map((row: any) => ({
      id: row.id,
      vaultId: row.vault_id,
      backupType: row.backup_type,
      title: row.title,
      dateRangeStart: row.date_range_start,
      dateRangeEnd: row.date_range_end,
      payload: row.payload,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));

    // Merge remote with any unsynced local records
    const map = new Map<string, BackupRecord>();
    remoteRecords.forEach(r => map.set(r.id, r));
    localList.forEach(l => {
      if (!map.has(l.id)) map.set(l.id, l);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return localList;
  }
}

/**
 * 5. Fetch All Deleted Items (from Supabase vault_data_backups + local cache)
 */
export async function fetchDeletedItems(vaultId: string): Promise<DeletedItemEntry[]> {
  const localDeleted = getLocalDeletedItems(vaultId);

  try {
    const { data, error } = await getSupabase()
      .from('vault_data_backups')
      .select('payload')
      .eq('vault_id', vaultId)
      .eq('backup_type', 'deleted_items')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error || !data) {
      return localDeleted;
    }

    const remoteEntries: DeletedItemEntry[] = [];
    data.forEach((row: any) => {
      if (Array.isArray(row.payload)) {
        row.payload.forEach((item: any) => {
          if (item?.id && item?.data) remoteEntries.push(item);
        });
      }
    });

    // Merge with local deleted items
    const map = new Map<string, DeletedItemEntry>();
    remoteEntries.forEach(e => map.set(e.id, e));
    localDeleted.forEach(l => {
      if (!map.has(l.id)) map.set(l.id, l);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  } catch {
    return localDeleted;
  }
}

/**
 * 6. Date Range Filtering Helper
 */
export function calculateRangeDates(preset: TimeRangePreset, customStart?: string, customEnd?: string): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const formatYmd = (d: Date) => d.toISOString().split('T')[0];
  const endDate = formatYmd(now);

  if (preset === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  const d = new Date();
  switch (preset) {
    case '7d':
      d.setDate(d.getDate() - 7);
      return { startDate: formatYmd(d), endDate };
    case '30d':
      d.setDate(d.getDate() - 30);
      return { startDate: formatYmd(d), endDate };
    case '3m':
      d.setMonth(d.getMonth() - 3);
      return { startDate: formatYmd(d), endDate };
    case '6m':
      d.setMonth(d.getMonth() - 6);
      return { startDate: formatYmd(d), endDate };
    case 'all':
    default:
      return { startDate: '1970-01-01', endDate };
  }
}

function isDateInRange(dateStr: string | undefined, start: string, end: string): boolean {
  if (!dateStr) return true;
  const target = dateStr.slice(0, 10);
  return target >= start && target <= end;
}

/**
 * 7. Build Filtered Export Payload
 */
export function buildBackupExportPayload(
  snapshot: FinanceSnapshot,
  vaultId: string,
  vaultName: string,
  options: {
    rangePreset: TimeRangePreset;
    customStart?: string;
    customEnd?: string;
    includeDeleted?: boolean;
    deletedEntries?: DeletedItemEntry[];
    modules?: {
      transactions: boolean;
      bills: boolean;
      goals: boolean;
      stocks: boolean;
      budgets: boolean;
    };
  }
): BackupExportPayload {
  const { startDate, endDate } = calculateRangeDates(
    options.rangePreset,
    options.customStart,
    options.customEnd
  );

  const selectedModules = options.modules || {
    transactions: true,
    bills: true,
    goals: true,
    stocks: true,
    budgets: true,
  };

  // Active items in range
  let txs: (Transaction & { isDeleted?: boolean; deletedAt?: string })[] = selectedModules.transactions
    ? (snapshot.transactions || []).filter((t: Transaction) => isDateInRange(t.date, startDate, endDate))
    : [];

  let bills: (BillItem & { isDeleted?: boolean; deletedAt?: string })[] = selectedModules.bills
    ? (snapshot.bills || []).filter((b: BillItem) => isDateInRange(b.dueDate, startDate, endDate))
    : [];

  let goals: (FinanceGoal & { isDeleted?: boolean; deletedAt?: string })[] = selectedModules.goals
    ? (snapshot.goals || []).filter((g: FinanceGoal) => isDateInRange(g.targetDate, startDate, endDate) || !g.targetDate)
    : [];

  let stocks: (StockInvestment & { isDeleted?: boolean; deletedAt?: string })[] = selectedModules.stocks
    ? (snapshot.stocks || []).filter((s: StockInvestment) => isDateInRange(s.date, startDate, endDate))
    : [];

  // Merge deleted records if requested
  if (options.includeDeleted && options.deletedEntries?.length) {
    const existingTxIds = new Set(txs.map((t: Transaction) => t.id));
    const existingBillIds = new Set(bills.map((b: BillItem) => b.id));
    const existingGoalIds = new Set(goals.map((g: FinanceGoal) => g.id));
    const existingStockIds = new Set(stocks.map((s: StockInvestment) => s.id));

    options.deletedEntries.forEach(entry => {
      const itemDate = (entry.data as any).date || (entry.data as any).dueDate || (entry.data as any).targetDate || entry.deletedAt;
      if (!isDateInRange(itemDate, startDate, endDate)) return;

      if (entry.entityType === 'transaction' && selectedModules.transactions) {
        const item = entry.data as Transaction;
        if (!existingTxIds.has(item.id)) {
          txs.push({ ...item, isDeleted: true, deletedAt: entry.deletedAt });
        }
      } else if (entry.entityType === 'bill' && selectedModules.bills) {
        const item = entry.data as BillItem;
        if (!existingBillIds.has(item.id)) {
          bills.push({ ...item, isDeleted: true, deletedAt: entry.deletedAt });
        }
      } else if (entry.entityType === 'goal' && selectedModules.goals) {
        const item = entry.data as FinanceGoal;
        if (!existingGoalIds.has(item.id)) {
          goals.push({ ...item, isDeleted: true, deletedAt: entry.deletedAt });
        }
      } else if (entry.entityType === 'stock' && selectedModules.stocks) {
        const item = entry.data as StockInvestment;
        if (!existingStockIds.has(item.id)) {
          stocks.push({ ...item, isDeleted: true, deletedAt: entry.deletedAt });
        }
      }
    });
  }

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  txs.forEach((t: Transaction) => {
    if (t.type === 'income') totalIncome += t.amount || 0;
    else totalExpense += t.amount || 0;
  });

  return {
    version: '1.0',
    appName: 'NuPra Finance',
    exportedAt: new Date().toISOString(),
    vaultId,
    vaultName,
    range: {
      preset: options.rangePreset,
      startDate: options.rangePreset === 'all' ? undefined : startDate,
      endDate: options.rangePreset === 'all' ? undefined : endDate,
    },
    includesDeleted: Boolean(options.includeDeleted),
    summary: {
      transactionsCount: txs.length,
      billsCount: bills.length,
      goalsCount: goals.length,
      stocksCount: stocks.length,
      totalIncome,
      totalExpense,
      currency: snapshot.currency || 'INR',
    },
    data: {
      transactions: txs,
      bills,
      goals,
      stocks,
      budgets: selectedModules.budgets ? snapshot.budgets : undefined,
      categories: snapshot.categories,
      currency: snapshot.currency,
    },
  };
}

/**
 * 8. Download JSON Backup
 */
export async function downloadJsonBackup(
  payload: BackupExportPayload,
  fileNamePrefix = 'NuPra_Backup'
): Promise<boolean> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const rangeLabel = payload.range.preset === 'all' ? 'AllTime' : payload.range.preset;
  const fileName = `${fileNamePrefix}_${rangeLabel}_${dateStr}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);

  const res = await exportFile({
    fileName,
    data: jsonContent,
    mimeType: 'application/json',
    title: 'NuPra Finance Data Backup',
    text: `Complete data backup for ${payload.vaultName || 'Couple Vault'} (${rangeLabel})`,
  });

  return res.success;
}

/**
 * 9. Download CSV Spreadsheets (Unified multi-table spreadsheet)
 */
export async function downloadCsvBackup(
  payload: BackupExportPayload,
  fileNamePrefix = 'NuPra_Export'
): Promise<boolean> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const rangeLabel = payload.range.preset === 'all' ? 'AllTime' : payload.range.preset;
  const fileName = `${fileNamePrefix}_${rangeLabel}_${dateStr}.csv`;

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const lines: string[] = [];

  // Metadata block
  lines.push('=== NUPRA FINANCE COUPLE BACKUP & STATEMENT ===');
  lines.push(`Vault,${escapeCsv(payload.vaultName || 'Couple Vault')}`);
  lines.push(`Exported At,${escapeCsv(payload.exportedAt)}`);
  lines.push(`Timeframe,${escapeCsv(payload.range.preset)} (${payload.range.startDate || 'Start'} to ${payload.range.endDate || 'End'})`);
  lines.push(`Currency,${escapeCsv(payload.summary.currency)}`);
  lines.push(`Total Transactions,${payload.summary.transactionsCount}`);
  lines.push(`Total Income,${payload.summary.totalIncome}`);
  lines.push(`Total Expense,${payload.summary.totalExpense}`);
  lines.push('');

  // 1. Transactions
  if (payload.data.transactions && payload.data.transactions.length > 0) {
    lines.push('--- TRANSACTIONS ---');
    lines.push('Date,Title,Type,Category,Amount,Currency,Recorded By,Payment Method,Status,Notes');
    payload.data.transactions.forEach(t => {
      lines.push([
        escapeCsv(t.date),
        escapeCsv(t.title),
        escapeCsv(t.type),
        escapeCsv(t.categoryName || 'General'),
        t.amount,
        escapeCsv(payload.summary.currency),
        escapeCsv(t.userName || 'Partner'),
        escapeCsv(t.paymentMethod || 'None'),
        escapeCsv(t.isDeleted ? 'DELETED' : (t.isFlagged ? 'FLAGGED' : 'ACTIVE')),
        escapeCsv(t.notes || ''),
      ].join(','));
    });
    lines.push('');
  }

  // 2. Bills
  if (payload.data.bills && payload.data.bills.length > 0) {
    lines.push('--- BILLS & REMINDERS ---');
    lines.push('Title,Category,Amount,Due Date,Recurring,Paid Status,Paid By,Split Type,Settled Status');
    payload.data.bills.forEach(b => {
      lines.push([
        escapeCsv(b.title),
        escapeCsv(b.categoryName || 'Utilities'),
        b.amount,
        escapeCsv(b.dueDate),
        escapeCsv(b.recurring || 'none'),
        escapeCsv(b.isPaid ? 'PAID' : 'PENDING'),
        escapeCsv(b.paidByUserName || ''),
        escapeCsv(b.splitType || 'equal'),
        escapeCsv(b.isSettled ? 'SETTLED' : 'UNSETTLED'),
      ].join(','));
    });
    lines.push('');
  }

  // 3. Goals
  if (payload.data.goals && payload.data.goals.length > 0) {
    lines.push('--- FINANCIAL GOALS ---');
    lines.push('Title,Target Amount,Saved Amount,Remaining,Status,Target Date,Contributions Count');
    payload.data.goals.forEach(g => {
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      lines.push([
        escapeCsv(g.title),
        g.targetAmount,
        g.currentAmount,
        remaining,
        escapeCsv(g.isCompleted ? 'COMPLETED' : 'IN_PROGRESS'),
        escapeCsv(g.targetDate || 'No Target Date'),
        g.contributions?.length || 0,
      ].join(','));
    });
    lines.push('');
  }

  // 4. Stocks / Investments
  if (payload.data.stocks && payload.data.stocks.length > 0) {
    lines.push('--- INVESTMENTS & STOCKS ---');
    lines.push('Asset Name,Ticker,Shares,Invested Amount,Owner,Date');
    payload.data.stocks.forEach(s => {
      lines.push([
        escapeCsv(s.assetName),
        escapeCsv(s.ticker || ''),
        s.shares || 0,
        s.investedAmount,
        escapeCsv(s.userName || ''),
        escapeCsv(s.date || ''),
      ].join(','));
    });
  }

  const csvContent = lines.join('\n');

  const res = await exportFile({
    fileName,
    data: csvContent,
    mimeType: 'text/csv',
    title: 'NuPra Finance Spreadsheet Export',
    text: `Financial spreadsheet for ${payload.vaultName || 'Couple Vault'} (${rangeLabel})`,
  });

  return res.success;
}

/**
 * 10. Validate and Parse Backup File for Restore
 */
export function validateBackupFile(fileContent: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(fileContent);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'File is not a valid JSON document.' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { isValid: false, error: 'Invalid backup format: missing "data" container.' };
    }

    const txs = Array.isArray(parsed.data.transactions) ? parsed.data.transactions : [];
    const bills = Array.isArray(parsed.data.bills) ? parsed.data.bills : [];
    const goals = Array.isArray(parsed.data.goals) ? parsed.data.goals : [];
    const stocks = Array.isArray(parsed.data.stocks) ? parsed.data.stocks : [];

    const currency: CurrencyCode = parsed.summary?.currency || parsed.data?.currency || 'INR';

    return {
      isValid: true,
      payload: parsed as BackupExportPayload,
      summary: {
        transactionsCount: txs.length,
        billsCount: bills.length,
        goalsCount: goals.length,
        stocksCount: stocks.length,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        vaultName: parsed.vaultName || 'Couple Vault',
        currency,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON parsing error: ${err.message || 'Corrupted file'}`,
    };
  }
}

/**
 * 11. Restore Backup Data into Snapshot
 */
export function restoreBackupDataToSnapshot(
  backupPayload: BackupExportPayload,
  currentSnapshot: FinanceSnapshot,
  mode: 'merge' | 'replace'
): FinanceSnapshot {
  const bData = backupPayload.data;

  if (mode === 'replace') {
    return {
      transactions: (bData.transactions || []).map(({ isDeleted, deletedAt, ...rest }) => rest as Transaction),
      bills: (bData.bills || []).map(({ isDeleted, deletedAt, ...rest }) => rest as BillItem),
      goals: (bData.goals || []).map(({ isDeleted, deletedAt, ...rest }) => rest as FinanceGoal),
      stocks: (bData.stocks || []).map(({ isDeleted, deletedAt, ...rest }) => rest as StockInvestment),
      budgets: bData.budgets || currentSnapshot.budgets,
      categories: bData.categories || currentSnapshot.categories,
      currency: bData.currency || currentSnapshot.currency,
      updatedAt: Date.now(),
    };
  }

  // Merge mode: Deduplicate by ID
  const txMap = new Map<string, Transaction>();
  (currentSnapshot.transactions || []).forEach((t: Transaction) => txMap.set(t.id, t));
  (bData.transactions || []).forEach(({ isDeleted, deletedAt, ...rest }) => {
    txMap.set(rest.id, rest as Transaction);
  });

  const billMap = new Map<string, BillItem>();
  (currentSnapshot.bills || []).forEach((b: BillItem) => billMap.set(b.id, b));
  (bData.bills || []).forEach(({ isDeleted, deletedAt, ...rest }) => {
    billMap.set(rest.id, rest as BillItem);
  });

  const goalMap = new Map<string, FinanceGoal>();
  (currentSnapshot.goals || []).forEach((g: FinanceGoal) => goalMap.set(g.id, g));
  (bData.goals || []).forEach(({ isDeleted, deletedAt, ...rest }) => {
    goalMap.set(rest.id, rest as FinanceGoal);
  });

  const stockMap = new Map<string, StockInvestment>();
  (currentSnapshot.stocks || []).forEach((s: StockInvestment) => stockMap.set(s.id, s));
  (bData.stocks || []).forEach(({ isDeleted, deletedAt, ...rest }) => {
    stockMap.set(rest.id, rest as StockInvestment);
  });

  return {
    transactions: Array.from(txMap.values()),
    bills: Array.from(billMap.values()),
    goals: Array.from(goalMap.values()),
    stocks: Array.from(stockMap.values()),
    budgets: bData.budgets || currentSnapshot.budgets,
    categories: bData.categories || currentSnapshot.categories,
    currency: currentSnapshot.currency,
    updatedAt: Date.now(),
  };
}
