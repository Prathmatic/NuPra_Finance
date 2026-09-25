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

// Storage keys - isolated from build/git artifacts
const STORAGE_PREFIX = 'nupra_finance_cloud_v1';
const KEYS = {
  CURRENT_USER: `${STORAGE_PREFIX}_user`,
  VAULT: `${STORAGE_PREFIX}_vault`,
  TRANSACTIONS: `${STORAGE_PREFIX}_transactions`,
  CATEGORIES: `${STORAGE_PREFIX}_categories`,
  GOALS: `${STORAGE_PREFIX}_goals`,
  STOCKS: `${STORAGE_PREFIX}_stocks`,
  BILLS: `${STORAGE_PREFIX}_bills`,
  CURRENCY: `${STORAGE_PREFIX}_currency`,
  CONFIG: `${STORAGE_PREFIX}_config`,
};

// Real-time broadcast channel for live synchronized updates across tabs/windows
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('nupra_live_sync_channel')
  : null;

// Initial sample users if new install
export const DEFAULT_USER_NU: UserProfile = {
  id: 'user-nu-01',
  name: 'Nu',
  email: 'nu@finance.love',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  partnerCode: 'NUPRA-901',
  vaultId: 'vault-nupra-main',
  createdAt: '2026-09-01T10:00:00Z',
};

export const DEFAULT_USER_PRA: UserProfile = {
  id: 'user-pra-02',
  name: 'Pra',
  email: 'pra@finance.love',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  partnerCode: 'NUPRA-902',
  vaultId: 'vault-nupra-main',
  createdAt: '2026-09-01T10:00:00Z',
};

export const DEFAULT_VAULT: CoupleVault = {
  id: 'vault-nupra-main',
  inviteCode: 'NUPRA-2026',
  name: 'Nu & Pra Love Vault',
  partner1: DEFAULT_USER_NU,
  partner2: DEFAULT_USER_PRA,
  currency: 'INR',
  monthlyBudget: 120000,
  createdAt: '2026-09-01T10:00:00Z',
};

// Seed initial realistic couple financial records
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Monthly Apartment Rent',
    amount: 32000,
    type: 'expense',
    categoryId: 'cat-rent',
    categoryName: 'Rent',
    categoryColor: '#6366F1',
    categoryIcon: 'Home',
    paymentMethod: 'Bank Transfer',
    date: '2026-09-05',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    isShared: true,
    notes: 'Split 50/50 for September',
    createdAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'tx-2',
    title: 'Tech Consulting Salary',
    amount: 95000,
    type: 'income',
    categoryId: 'cat-salary',
    categoryName: 'Salary',
    categoryColor: '#10B981',
    categoryIcon: 'Briefcase',
    paymentMethod: 'Bank Transfer',
    date: '2026-09-01',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    isShared: false,
    notes: 'September primary paycheck',
    createdAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'tx-3',
    title: 'Design Director Salary',
    amount: 110000,
    type: 'income',
    categoryId: 'cat-salary',
    categoryName: 'Salary',
    categoryColor: '#10B981',
    categoryIcon: 'Briefcase',
    paymentMethod: 'Bank Transfer',
    date: '2026-09-01',
    userId: 'user-pra-02',
    userName: 'Pra',
    userAvatar: DEFAULT_USER_PRA.avatarUrl,
    isShared: false,
    notes: 'September income credited',
    createdAt: '2026-09-01T12:30:00Z',
  },
  {
    id: 'tx-4',
    title: 'Organic Groceries & Gourmet Market',
    amount: 6450,
    type: 'expense',
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryColor: '#F59E0B',
    categoryIcon: 'Utensils',
    paymentMethod: 'Credit Card',
    date: '2026-09-12',
    userId: 'user-pra-02',
    userName: 'Pra',
    userAvatar: DEFAULT_USER_PRA.avatarUrl,
    isShared: true,
    notes: 'Weekly staples & artisan sourdough',
    createdAt: '2026-09-12T17:15:00Z',
  },
  {
    id: 'tx-5',
    title: 'Romantic Candlelight Dinner',
    amount: 4800,
    type: 'expense',
    categoryId: 'cat-leisure',
    categoryName: 'Leisure',
    categoryColor: '#EC4899',
    categoryIcon: 'Film',
    paymentMethod: 'UPI / Pix',
    date: '2026-09-18',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    isShared: true,
    notes: 'Date night celebration ❤️',
    createdAt: '2026-09-18T21:00:00Z',
  },
  {
    id: 'tx-6',
    title: 'Weekend Hillstation Getaway Booking',
    amount: 14500,
    type: 'expense',
    categoryId: 'cat-travel',
    categoryName: 'Travel',
    categoryColor: '#06B6D4',
    categoryIcon: 'Plane',
    paymentMethod: 'Credit Card',
    date: '2026-09-22',
    userId: 'user-pra-02',
    userName: 'Pra',
    userAvatar: DEFAULT_USER_PRA.avatarUrl,
    isShared: true,
    notes: 'Mountain resort reservation',
    createdAt: '2026-09-22T14:20:00Z',
  },
  {
    id: 'tx-7',
    title: 'Gym & Pilates Couple Membership',
    amount: 5500,
    type: 'expense',
    categoryId: 'cat-health',
    categoryName: 'Health',
    categoryColor: '#EF4444',
    categoryIcon: 'HeartPulse',
    paymentMethod: 'UPI / Pix',
    date: '2026-09-08',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    isShared: true,
    notes: 'Joint quarterly pass',
    createdAt: '2026-09-08T11:00:00Z',
  },
  {
    id: 'tx-8',
    title: 'Pottery & Canvas Workshop',
    amount: 3200,
    type: 'expense',
    categoryId: 'cat-hobby',
    categoryName: 'Hobby',
    categoryColor: '#8B5CF6',
    categoryIcon: 'Palette',
    paymentMethod: 'Debit Card',
    date: '2026-09-15',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    isShared: false,
    notes: 'Art supplies & studio pass',
    createdAt: '2026-09-15T16:00:00Z',
  }
];

export const INITIAL_GOALS: FinanceGoal[] = [
  {
    id: 'goal-1',
    title: 'Switzerland Dream Vacation',
    targetAmount: 350000,
    currentAmount: 215000,
    targetDate: '2027-04-15',
    color: '#06B6D4',
    icon: 'Plane',
    createdByUserId: 'user-nu-01',
    createdByUserName: 'Nu',
    isShared: true,
    notes: 'Flights, alpine chalet & train passes across the Swiss Alps',
    contributions: [
      { id: 'c-1', userId: 'user-nu-01', userName: 'Nu', amount: 110000, date: '2026-08-20', note: 'Q3 bonus deposit' },
      { id: 'c-2', userId: 'user-pra-02', userName: 'Pra', amount: 105000, date: '2026-09-02', note: 'Project incentive' },
    ]
  },
  {
    id: 'goal-2',
    title: 'Apartment Down Payment & Renovation',
    targetAmount: 1500000,
    currentAmount: 890000,
    targetDate: '2027-12-31',
    color: '#E11D48',
    icon: 'Home',
    createdByUserId: 'user-pra-02',
    createdByUserName: 'Pra',
    isShared: true,
    notes: 'Our future dream home fund',
    contributions: [
      { id: 'c-3', userId: 'user-nu-01', userName: 'Nu', amount: 440000, date: '2026-07-15' },
      { id: 'c-4', userId: 'user-pra-02', userName: 'Pra', amount: 450000, date: '2026-08-10' },
    ]
  },
  {
    id: 'goal-3',
    title: 'Couple Rainy Day Emergency Cushion',
    targetAmount: 400000,
    currentAmount: 320000,
    targetDate: '2026-12-31',
    color: '#10B981',
    icon: 'ShieldCheck',
    createdByUserId: 'user-nu-01',
    createdByUserName: 'Nu',
    isShared: true,
    notes: '6 months of living expenses safely stored',
    contributions: [
      { id: 'c-5', userId: 'user-nu-01', userName: 'Nu', amount: 160000, date: '2026-06-01' },
      { id: 'c-6', userId: 'user-pra-02', userName: 'Pra', amount: 160000, date: '2026-06-01' },
    ]
  }
];

export const INITIAL_STOCKS: StockInvestment[] = [
  {
    id: 'stk-1',
    assetName: 'NIFTY 50 Index Fund ETF',
    ticker: 'NIFTYBEES',
    shares: 120,
    investedAmount: 35000,
    monthYear: '2026-09',
    date: '2026-09-04',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    notes: 'Monthly SIP in top 50 index',
  },
  {
    id: 'stk-2',
    assetName: 'Tata Consultancy Services',
    ticker: 'TCS',
    shares: 10,
    investedAmount: 42000,
    monthYear: '2026-09',
    date: '2026-09-06',
    userId: 'user-pra-02',
    userName: 'Pra',
    userAvatar: DEFAULT_USER_PRA.avatarUrl,
    notes: 'Long term blue chip dividend holding',
  },
  {
    id: 'stk-3',
    assetName: 'Vanguard All-World ETF',
    ticker: 'VWCE',
    shares: 25,
    investedAmount: 28000,
    monthYear: '2026-09',
    date: '2026-09-14',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    notes: 'Global diversification',
  },
  {
    id: 'stk-4',
    assetName: 'HDFC Bank Ltd',
    ticker: 'HDFCBANK',
    shares: 30,
    investedAmount: 48000,
    monthYear: '2026-08',
    date: '2026-08-10',
    userId: 'user-pra-02',
    userName: 'Pra',
    userAvatar: DEFAULT_USER_PRA.avatarUrl,
    notes: 'August portfolio addition',
  },
  {
    id: 'stk-5',
    assetName: 'Apple Inc. (AAPL)',
    ticker: 'AAPL',
    shares: 8,
    investedAmount: 32000,
    monthYear: '2026-08',
    date: '2026-08-18',
    userId: 'user-nu-01',
    userName: 'Nu',
    userAvatar: DEFAULT_USER_NU.avatarUrl,
    notes: 'Tech allocation',
  }
];

export const INITIAL_BILLS: BillItem[] = [
  {
    id: 'bill-1',
    title: 'High-speed Fiber Internet & Streaming',
    amount: 1899,
    dueDate: '2026-09-28',
    categoryName: 'Utilities',
    categoryColor: '#F97316',
    isPaid: false,
    recurring: 'monthly',
  },
  {
    id: 'bill-2',
    title: 'Apartment Electricity & AC',
    amount: 4200,
    dueDate: '2026-10-02',
    categoryName: 'Utilities',
    categoryColor: '#F97316',
    isPaid: false,
    recurring: 'monthly',
  },
  {
    id: 'bill-3',
    title: 'Comprehensive Health Insurance Premium',
    amount: 8500,
    dueDate: '2026-09-10',
    categoryName: 'Health',
    categoryColor: '#EF4444',
    isPaid: true,
    paidDate: '2026-09-09',
    paidByUserId: 'user-pra-02',
    paidByUserName: 'Pra',
    recurring: 'monthly',
  }
];

// Cloud storage persistence helper
export const CloudStore = {
  getVault(): CoupleVault {
    try {
      const data = localStorage.getItem(KEYS.VAULT);
      return data ? JSON.parse(data) : DEFAULT_VAULT;
    } catch {
      return DEFAULT_VAULT;
    }
  },
  saveVault(vault: CoupleVault) {
    localStorage.setItem(KEYS.VAULT, JSON.stringify(vault));
    CloudStore.broadcast('vault_updated', vault);
  },

  getCurrentUser(): UserProfile {
    try {
      const data = localStorage.getItem(KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : DEFAULT_USER_NU;
    } catch {
      return DEFAULT_USER_NU;
    }
  },
  saveCurrentUser(user: UserProfile) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    CloudStore.broadcast('user_updated', user);
  },

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  },
  saveTransactions(txs: Transaction[]) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
    CloudStore.broadcast('transactions_updated', txs);
  },

  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },
  saveCategories(cats: Category[]) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
    CloudStore.broadcast('categories_updated', cats);
  },

  getGoals(): FinanceGoal[] {
    try {
      const data = localStorage.getItem(KEYS.GOALS);
      return data ? JSON.parse(data) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  },
  saveGoals(goals: FinanceGoal[]) {
    localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
    CloudStore.broadcast('goals_updated', goals);
  },

  getStocks(): StockInvestment[] {
    try {
      const data = localStorage.getItem(KEYS.STOCKS);
      return data ? JSON.parse(data) : INITIAL_STOCKS;
    } catch {
      return INITIAL_STOCKS;
    }
  },
  saveStocks(stocks: StockInvestment[]) {
    localStorage.setItem(KEYS.STOCKS, JSON.stringify(stocks));
    CloudStore.broadcast('stocks_updated', stocks);
  },

  getBills(): BillItem[] {
    try {
      const data = localStorage.getItem(KEYS.BILLS);
      return data ? JSON.parse(data) : INITIAL_BILLS;
    } catch {
      return INITIAL_BILLS;
    }
  },
  saveBills(bills: BillItem[]) {
    localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
    CloudStore.broadcast('bills_updated', bills);
  },

  getCurrency(): CurrencyCode {
    try {
      const data = localStorage.getItem(KEYS.CURRENCY);
      return (data as CurrencyCode) || 'INR';
    } catch {
      return 'INR';
    }
  },
  saveCurrency(currency: CurrencyCode) {
    localStorage.setItem(KEYS.CURRENCY, currency);
    CloudStore.broadcast('currency_updated', currency);
  },

  broadcast(type: string, payload: unknown) {
    if (syncChannel) {
      syncChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  },

  onSync(callback: (type: string, payload: unknown) => void) {
    if (!syncChannel) return () => {};
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        callback(event.data.type, event.data.payload);
      }
    };
    syncChannel.addEventListener('message', handler);
    return () => syncChannel.removeEventListener('message', handler);
  }
};
