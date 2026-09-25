import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
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
import { 
  CloudStore, 
  DEFAULT_USER_NU, 
  DEFAULT_USER_PRA, 
} from '../services/cloudSync';

interface FinanceContextType {
  currentUser: UserProfile;
  vault: CoupleVault;
  partner?: UserProfile;
  transactions: Transaction[];
  categories: Category[];
  goals: FinanceGoal[];
  stocks: StockInvestment[];
  bills: BillItem[];
  currency: CurrencyCode;
  activeTab: string;
  viewMode: 'both' | 'me' | 'partner';
  isSyncing: boolean;
  
  // Navigation & View Actions
  setActiveTab: (tab: string) => void;
  setViewMode: (mode: 'both' | 'me' | 'partner') => void;
  setCurrency: (c: CurrencyCode) => void;
  
  // User & Partner Actions
  switchActiveUser: (user: UserProfile) => void;
  updateCurrentUserProfile: (updated: Partial<UserProfile>) => void;
  joinVaultWithCode: (code: string) => boolean;
  createPersonalVault: (vaultName: string) => void;
  
  // Transaction Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;
  
  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  
  // Goal Actions
  addGoal: (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => void;
  contributeToGoal: (goalId: string, amount: number, note?: string) => void;
  deleteGoal: (id: string) => void;
  
  // Stock Actions
  addStock: (stock: Omit<StockInvestment, 'id'>) => void;
  deleteStock: (id: string) => void;
  
  // Bill Actions
  addBill: (bill: Omit<BillItem, 'id' | 'isPaid'>) => void;
  markBillAsPaid: (billId: string) => void;
  deleteBill: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(CloudStore.getCurrentUser);
  const [vault, setVault] = useState<CoupleVault>(CloudStore.getVault);
  const [transactions, setTransactions] = useState<Transaction[]>(CloudStore.getTransactions);
  const [categories, setCategories] = useState<Category[]>(CloudStore.getCategories);
  const [goals, setGoals] = useState<FinanceGoal[]>(CloudStore.getGoals);
  const [stocks, setStocks] = useState<StockInvestment[]>(CloudStore.getStocks);
  const [bills, setBills] = useState<BillItem[]>(CloudStore.getBills);
  const [currency, setCurrencyState] = useState<CurrencyCode>(CloudStore.getCurrency);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'both' | 'me' | 'partner'>('both');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Determine partner profile
  const partner = useMemo(() => {
    if (vault.partner1.id === currentUser.id) {
      return vault.partner2;
    }
    return vault.partner1;
  }, [vault, currentUser]);

  // Flash syncing indicator
  const triggerSyncFlash = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Listen to cross-window / real-time cloud broadcast sync
  useEffect(() => {
    const unsubscribe = CloudStore.onSync((type, payload) => {
      triggerSyncFlash();
      if (type === 'transactions_updated') setTransactions(payload as Transaction[]);
      if (type === 'goals_updated') setGoals(payload as FinanceGoal[]);
      if (type === 'stocks_updated') setStocks(payload as StockInvestment[]);
      if (type === 'bills_updated') setBills(payload as BillItem[]);
      if (type === 'categories_updated') setCategories(payload as Category[]);
      if (type === 'vault_updated') setVault(payload as CoupleVault);
      if (type === 'currency_updated') setCurrencyState(payload as CurrencyCode);
    });
    return unsubscribe;
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    CloudStore.saveCurrency(c);
    triggerSyncFlash();
  };

  const switchActiveUser = (user: UserProfile) => {
    setCurrentUser(user);
    CloudStore.saveCurrentUser(user);
    triggerSyncFlash();
  };

  const updateCurrentUserProfile = (updated: Partial<UserProfile>) => {
    const newUser = { ...currentUser, ...updated };
    setCurrentUser(newUser);
    CloudStore.saveCurrentUser(newUser);
    
    // Also update partner references in vault
    const updatedVault = { ...vault };
    if (updatedVault.partner1.id === newUser.id) {
      updatedVault.partner1 = newUser;
    } else if (updatedVault.partner2?.id === newUser.id) {
      updatedVault.partner2 = newUser;
    }
    setVault(updatedVault);
    CloudStore.saveVault(updatedVault);
    triggerSyncFlash();
  };

  const joinVaultWithCode = (code: string): boolean => {
    if (code.trim().toUpperCase() === 'NUPRA-2026' || code.trim().length >= 4) {
      // Linked to couple vault
      const updatedVault = {
        ...vault,
        partner2: currentUser,
      };
      setVault(updatedVault);
      CloudStore.saveVault(updatedVault);
      triggerSyncFlash();
      return true;
    }
    return false;
  };

  const createPersonalVault = (vaultName: string) => {
    const newVault: CoupleVault = {
      id: 'vault-' + Date.now(),
      inviteCode: 'VAULT-' + Math.floor(1000 + Math.random() * 9000),
      name: vaultName || `${currentUser.name}'s Vault`,
      partner1: currentUser,
      currency,
      monthlyBudget: 100000,
      createdAt: new Date().toISOString(),
    };
    setVault(newVault);
    CloudStore.saveVault(newVault);
    triggerSyncFlash();
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: 'tx-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    CloudStore.saveTransactions(updated);
    triggerSyncFlash();
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cat,
      id: 'cat-' + Date.now(),
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    CloudStore.saveCategories(updated);
    triggerSyncFlash();
  };

  const addGoal = (goal: Omit<FinanceGoal, 'id' | 'currentAmount' | 'contributions'>) => {
    const newGoal: FinanceGoal = {
      ...goal,
      id: 'goal-' + Date.now(),
      currentAmount: 0,
      contributions: [],
    };
    const updated = [newGoal, ...goals];
    setGoals(updated);
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
  };

  const contributeToGoal = (goalId: string, amount: number, note?: string) => {
    const updated = goals.map(goal => {
      if (goal.id !== goalId) return goal;
      const contribution = {
        id: 'c-' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        amount,
        date: new Date().toISOString().split('T')[0],
        note: note || `Added by ${currentUser.name}`,
      };
      return {
        ...goal,
        currentAmount: goal.currentAmount + amount,
        contributions: [contribution, ...goal.contributions],
      };
    });
    setGoals(updated);
    CloudStore.saveGoals(updated);

    // Also auto-record as a goal savings transaction!
    addTransaction({
      title: `Goal Savings: ${goals.find(g => g.id === goalId)?.title || 'Goal'}`,
      amount,
      type: 'expense',
      categoryId: 'cat-investment',
      categoryName: 'Investment',
      categoryColor: '#3B82F6',
      categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      isShared: true,
      notes: note || 'Contribution towards couple goal',
    });

    triggerSyncFlash();
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    CloudStore.saveGoals(updated);
    triggerSyncFlash();
  };

  const addStock = (stock: Omit<StockInvestment, 'id'>) => {
    const newStock: StockInvestment = {
      ...stock,
      id: 'stk-' + Date.now(),
    };
    const updated = [newStock, ...stocks];
    setStocks(updated);
    CloudStore.saveStocks(updated);

    // Auto-record as an investment transaction
    addTransaction({
      title: `Stock Investment: ${newStock.assetName}${newStock.ticker ? ` (${newStock.ticker})` : ''}`,
      amount: newStock.investedAmount,
      type: 'expense',
      categoryId: 'cat-investment',
      categoryName: 'Investment',
      categoryColor: '#3B82F6',
      categoryIcon: 'TrendingUp',
      paymentMethod: 'Bank Transfer',
      date: newStock.date,
      userId: newStock.userId,
      userName: newStock.userName,
      userAvatar: newStock.userAvatar,
      isShared: true,
      notes: newStock.notes || `Stock investment by ${newStock.userName}`,
    });

    triggerSyncFlash();
  };

  const deleteStock = (id: string) => {
    const updated = stocks.filter(s => s.id !== id);
    setStocks(updated);
    CloudStore.saveStocks(updated);
    triggerSyncFlash();
  };

  const addBill = (bill: Omit<BillItem, 'id' | 'isPaid'>) => {
    const newBill: BillItem = {
      ...bill,
      id: 'bill-' + Date.now(),
      isPaid: false,
    };
    const updated = [newBill, ...bills];
    setBills(updated);
    CloudStore.saveBills(updated);
    triggerSyncFlash();
  };

  const markBillAsPaid = (billId: string) => {
    let paidBill: BillItem | undefined;
    const updated = bills.map(b => {
      if (b.id !== billId) return b;
      paidBill = {
        ...b,
        isPaid: true,
        paidDate: new Date().toISOString().split('T')[0],
        paidByUserId: currentUser.id,
        paidByUserName: currentUser.name,
      };
      return paidBill;
    });
    setBills(updated);
    CloudStore.saveBills(updated);

    if (paidBill) {
      // Auto-log transaction as paid expense
      addTransaction({
        title: `Bill Paid: ${paidBill.title}`,
        amount: paidBill.amount,
        type: 'expense',
        categoryId: 'cat-utilities',
        categoryName: paidBill.categoryName || 'Utilities',
        categoryColor: paidBill.categoryColor || '#F97316',
        categoryIcon: 'Zap',
        paymentMethod: 'UPI / Pix',
        date: new Date().toISOString().split('T')[0],
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatarUrl,
        isShared: true,
        notes: `Paid on ${new Date().toLocaleDateString()}`,
      });
    }

    triggerSyncFlash();
  };

  const deleteBill = (id: string) => {
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    CloudStore.saveBills(updated);
    triggerSyncFlash();
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        vault,
        partner,
        transactions,
        categories,
        goals,
        stocks,
        bills,
        currency,
        activeTab,
        viewMode,
        isSyncing,
        setActiveTab,
        setViewMode,
        setCurrency,
        switchActiveUser,
        updateCurrentUserProfile,
        joinVaultWithCode,
        createPersonalVault,
        addTransaction,
        deleteTransaction,
        addCategory,
        addGoal,
        contributeToGoal,
        deleteGoal,
        addStock,
        deleteStock,
        addBill,
        markBillAsPaid,
        deleteBill,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
