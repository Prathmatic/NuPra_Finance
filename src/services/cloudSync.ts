import { 
  UserProfile, 
  CoupleVault, 
  Transaction, 
  FinanceGoal, 
  StockInvestment, 
  BillItem, 
  Category,
  CurrencyCode 
} from '../types/finance';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';

// Isolate the Supabase-backed cache from prototype and mock data.
const STORAGE_PREFIX = 'nupra_finance_supabase_v3';
const KEYS = {
  CURRENT_USER:  `${STORAGE_PREFIX}_user`,
  VAULT:         `${STORAGE_PREFIX}_vault`,
  TRANSACTIONS:  `${STORAGE_PREFIX}_transactions`,
  CATEGORIES:    `${STORAGE_PREFIX}_categories`,
  GOALS:         `${STORAGE_PREFIX}_goals`,
  STOCKS:        `${STORAGE_PREFIX}_stocks`,
  BILLS:         `${STORAGE_PREFIX}_bills`,
  CURRENCY:      `${STORAGE_PREFIX}_currency`,
  ONBOARDED:     `${STORAGE_PREFIX}_onboarded`,
};

const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('nupra_live_sync_supabase_v3')
    : null;

export const CloudStore = {
  /* ── Onboarding ─────────────────────────────────────────────────── */
  isOnboarded(): boolean {
    return localStorage.getItem(KEYS.ONBOARDED) === 'true';
  },
  setOnboarded(value: boolean) {
    localStorage.setItem(KEYS.ONBOARDED, value ? 'true' : 'false');
  },

  /* ── User ────────────────────────────────────────────────────────── */
  getCurrentUser(): UserProfile | null {
    try {
      const d = localStorage.getItem(KEYS.CURRENT_USER);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  },
  saveCurrentUser(user: UserProfile) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
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
    localStorage.setItem(KEYS.VAULT, JSON.stringify(vault));
    CloudStore.broadcast('vault_updated', vault);
  },

  /* ── Transactions ────────────────────────────────────────────────── */
  getTransactions(): Transaction[] {
    try {
      const d = localStorage.getItem(KEYS.TRANSACTIONS);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },
  saveTransactions(txs: Transaction[]) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
    CloudStore.broadcast('transactions_updated', txs);
  },

  /* ── Categories ──────────────────────────────────────────────────── */
  getCategories(): Category[] {
    try {
      const d = localStorage.getItem(KEYS.CATEGORIES);
      return d ? JSON.parse(d) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  },
  saveCategories(cats: Category[]) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
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
    localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
    CloudStore.broadcast('goals_updated', goals);
  },

  /* ── Stocks ──────────────────────────────────────────────────────── */
  getStocks(): StockInvestment[] {
    try {
      const d = localStorage.getItem(KEYS.STOCKS);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },
  saveStocks(stocks: StockInvestment[]) {
    localStorage.setItem(KEYS.STOCKS, JSON.stringify(stocks));
    CloudStore.broadcast('stocks_updated', stocks);
  },

  /* ── Bills ───────────────────────────────────────────────────────── */
  getBills(): BillItem[] {
    try {
      const d = localStorage.getItem(KEYS.BILLS);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },
  saveBills(bills: BillItem[]) {
    localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
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
    localStorage.setItem(KEYS.CURRENCY, c);
    CloudStore.broadcast('currency_updated', c);
  },

  /* ── Helpers ─────────────────────────────────────────────────────── */
  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },

  broadcast(type: string, payload: unknown) {
    syncChannel?.postMessage({ type, payload, timestamp: Date.now() });
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
