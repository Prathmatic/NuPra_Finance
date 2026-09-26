import { 
  UserProfile, 
  CoupleVault, 
  Transaction, 
  FinanceGoal, 
  StockInvestment, 
  BillItem, 
  Category,
  CurrencyCode,
  BudgetsConfig 
} from '../types/finance';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';

// Isolate the Supabase-backed cache from prototype and mock data.
const STORAGE_PREFIX = 'nupra_finance_supabase_v3';
export const KEYS = {
  CURRENT_USER:  `${STORAGE_PREFIX}_user`,
  VAULT:         `${STORAGE_PREFIX}_vault`,
  TRANSACTIONS:  `${STORAGE_PREFIX}_transactions`,
  CATEGORIES:    `${STORAGE_PREFIX}_categories`,
  GOALS:         `${STORAGE_PREFIX}_goals`,
  STOCKS:        `${STORAGE_PREFIX}_stocks`,
  BILLS:         `${STORAGE_PREFIX}_bills`,
  CURRENCY:      `${STORAGE_PREFIX}_currency`,
  ONBOARDED:     `${STORAGE_PREFIX}_onboarded`,
  BUDGETS:       `${STORAGE_PREFIX}_budgets`,
};

const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('nupra_live_sync_supabase_v3')
    : null;

/**
 * Removes deprecated prototype keys and stale caches from previous app versions
 * to free up browser / WebView localStorage quota (which is strictly capped at 5MB).
 */
export function clearStaleStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const activeKeys = new Set(Object.values(KEYS));
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !activeKeys.has(key)) {
        if (key.startsWith('nupra_') || key.startsWith('couple_')) {
          toRemove.push(key);
        }
      }
    }
    toRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch (err) {
    console.warn('[CloudStore] Could not clear stale storage:', err);
  }
}

// Automatically prune stale keys on load
clearStaleStorage();

/**
 * Strips huge base64 data URLs from individual transaction records.
 * Avatars are dynamically resolved from the user / partner profile,
 * so duplicating multi-megabyte base64 strings across dozens of transactions
 * exhausts the 5MB browser quota almost immediately.
 */
function sanitizeTransaction(tx: Transaction): Transaction {
  if (!tx) return tx;
  if (tx.userAvatar && (tx.userAvatar.startsWith('data:') || tx.userAvatar.length > 500)) {
    const { userAvatar, ...rest } = tx;
    return rest as Transaction;
  }
  return tx;
}

function sanitizeStock(stock: StockInvestment): StockInvestment {
  if (!stock) return stock;
  if (stock.userAvatar && (stock.userAvatar.startsWith('data:') || stock.userAvatar.length > 500)) {
    const { userAvatar, ...rest } = stock;
    return rest as StockInvestment;
  }
  return stock;
}

/**
 * Safe wrapper around localStorage.setItem that protects against QuotaExceededError.
 * In case of quota errors, it runs an emergency prune of stale keys and trims transaction
 * cache length to keep the application responsive and crash-free.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[CloudStore] LocalStorage setItem failed on "${key}":`, err);
    clearStaleStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // If transactions caused the quota limit, trim to the latest 100 items for local cache
      if (key === KEYS.TRANSACTIONS) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const trimmed = parsed.slice(0, 80).map(sanitizeTransaction);
            localStorage.setItem(key, JSON.stringify(trimmed));
            return true;
          }
        } catch {
          // If still failing, trim to latest 25 items
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              localStorage.setItem(key, JSON.stringify(parsed.slice(0, 25).map(sanitizeTransaction)));
              return true;
            }
          } catch {
            console.error(`[CloudStore] Critical: Quota completely filled. Memory state preserved.`);
          }
        }
      }
      return false;
    }
  }
}

export const CloudStore = {
  /* ── Onboarding ─────────────────────────────────────────────────── */
  isOnboarded(): boolean {
    try {
      return localStorage.getItem(KEYS.ONBOARDED) === 'true';
    } catch { return false; }
  },
  setOnboarded(value: boolean) {
    safeSetItem(KEYS.ONBOARDED, value ? 'true' : 'false');
  },

  /* ── User ────────────────────────────────────────────────────────── */
  getCurrentUser(): UserProfile | null {
    try {
      const d = localStorage.getItem(KEYS.CURRENT_USER);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  },
  saveCurrentUser(user: UserProfile) {
    safeSetItem(KEYS.CURRENT_USER, JSON.stringify(user));
    CloudStore.broadcast('user_updated', user);
  },

  /* ── Vault ───────────────────────────────────────────────────────── */
  getVault(): CoupleVault | null {
    try {
      const d = localStorage.getItem(KEYS.VAULT);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  },
  saveVault(vault: CoupleVault) {
    safeSetItem(KEYS.VAULT, JSON.stringify(vault));
    CloudStore.broadcast('vault_updated', vault);
  },

  /* ── Transactions ────────────────────────────────────────────────── */
  getTransactions(): Transaction[] {
    try {
      const d = localStorage.getItem(KEYS.TRANSACTIONS);
      if (!d) return [];
      const parsed = JSON.parse(d);
      if (!Array.isArray(parsed)) return [];

      // Check if existing stored transactions have bloated base64 data URLs from prior runs
      let hadBloat = false;
      const sanitized = parsed.map(tx => {
        if (tx?.userAvatar && (tx.userAvatar.startsWith('data:') || tx.userAvatar.length > 500)) {
          hadBloat = true;
          const { userAvatar, ...rest } = tx;
          return rest as Transaction;
        }
        return tx;
      });

      if (hadBloat) {
        safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(sanitized));
      }

      return sanitized;
    } catch { return []; }
  },
  saveTransactions(txs: Transaction[]) {
    const sanitized = (txs || []).map(sanitizeTransaction);
    safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(sanitized));
    CloudStore.broadcast('transactions_updated', sanitized);
  },

  /* ── Categories ──────────────────────────────────────────────────── */
  getCategories(): Category[] {
    try {
      const d = localStorage.getItem(KEYS.CATEGORIES);
      return d ? JSON.parse(d) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  },
  saveCategories(cats: Category[]) {
    safeSetItem(KEYS.CATEGORIES, JSON.stringify(cats));
    CloudStore.broadcast('categories_updated', cats);
  },

  /* ── Goals ───────────────────────────────────────────────────────── */
  getGoals(): FinanceGoal[] {
    try {
      const d = localStorage.getItem(KEYS.GOALS);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },
  saveGoals(goals: FinanceGoal[]) {
    safeSetItem(KEYS.GOALS, JSON.stringify(goals));
    CloudStore.broadcast('goals_updated', goals);
  },

  /* ── Stocks ──────────────────────────────────────────────────────── */
  getStocks(): StockInvestment[] {
    try {
      const d = localStorage.getItem(KEYS.STOCKS);
      if (!d) return [];
      const parsed = JSON.parse(d);
      return Array.isArray(parsed) ? parsed.map(sanitizeStock) : [];
    } catch { return []; }
  },
  saveStocks(stocks: StockInvestment[]) {
    const sanitized = (stocks || []).map(sanitizeStock);
    safeSetItem(KEYS.STOCKS, JSON.stringify(sanitized));
    CloudStore.broadcast('stocks_updated', sanitized);
  },

  /* ── Bills ───────────────────────────────────────────────────────── */
  getBills(): BillItem[] {
    try {
      const d = localStorage.getItem(KEYS.BILLS);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },
  saveBills(bills: BillItem[]) {
    safeSetItem(KEYS.BILLS, JSON.stringify(bills));
    CloudStore.broadcast('bills_updated', bills);
  },

  /* ── Currency ────────────────────────────────────────────────────── */
  getCurrency(): CurrencyCode {
    try {
      const d = localStorage.getItem(KEYS.CURRENCY);
      return (d as CurrencyCode) || 'INR';
    } catch { return 'INR'; }
  },
  saveCurrency(c: CurrencyCode) {
    safeSetItem(KEYS.CURRENCY, c);
    CloudStore.broadcast('currency_updated', c);
  },

  /* ── Budgets (Defaults to 0 for all) ──────────────────────────────── */
  getBudgets(): BudgetsConfig {
    try {
      const d = localStorage.getItem(KEYS.BUDGETS);
      return d ? JSON.parse(d) : { couple: 0, me: 0, partner: 0 };
    } catch {
      return { couple: 0, me: 0, partner: 0 };
    }
  },
  saveBudgets(budgets: BudgetsConfig) {
    safeSetItem(KEYS.BUDGETS, JSON.stringify(budgets));
    CloudStore.broadcast('budgets_updated', budgets);
  },

  /* ── Helpers ─────────────────────────────────────────────────────── */
  clearAll() {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  broadcast(type: string, payload: unknown) {
    try {
      syncChannel?.postMessage({ type, payload, timestamp: Date.now() });
    } catch {}
  },

  onSync(callback: (type: string, payload: unknown) => void) {
    if (!syncChannel) return () => {};
    const handler = (e: MessageEvent) => {
      if (e.data?.type) callback(e.data.type, e.data.payload);
    };
    syncChannel.addEventListener('message', handler);
    return () => syncChannel.removeEventListener('message', handler);
  },
};
