import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AppHeader } from './components/layout/AppHeader';
import { MobileNavbar } from './components/layout/MobileNavbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { GoalsView } from './components/goals/GoalsView';
import { StockInvestmentView } from './components/stocks/StockInvestmentView';
import { BillsView } from './components/bills/BillsView';
import { StatisticsView } from './components/statistics/StatisticsView';
import { AuthModal } from './components/auth/AuthModal';
import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { AddGoalModal } from './components/goals/AddGoalModal';
import { AddStockModal } from './components/stocks/AddStockModal';
import { Smartphone, Monitor } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab } = useFinance();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isMobileFrameMode, setIsMobileFrameMode] = useState(false);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenAddModal={() => setIsAddTxOpen(true)}
            onOpenGoalModal={() => setIsAddGoalOpen(true)}
            onOpenStockModal={() => setIsAddStockOpen(true)}
          />
        );
      case 'transactions':
        return <TransactionsView onOpenAddModal={() => setIsAddTxOpen(true)} />;
      case 'goals':
        return <GoalsView onOpenAddGoalModal={() => setIsAddGoalOpen(true)} />;
      case 'stocks':
        return <StockInvestmentView onOpenAddStockModal={() => setIsAddStockOpen(true)} />;
      case 'bills':
        return <BillsView />;
      case 'stats':
        return <StatisticsView />;
      default:
        return (
          <DashboardView
            onOpenAddModal={() => setIsAddTxOpen(true)}
            onOpenGoalModal={() => setIsAddGoalOpen(true)}
            onOpenStockModal={() => setIsAddStockOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col items-center justify-start">
      {/* Top Mobile / Desktop Frame Mode Switcher for Demo */}
      <div className="w-full bg-slate-950/90 border-b border-white/5 py-1.5 px-4 hidden md:flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>NuPra Finance • Mobile App (NuPra Finance.apk)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>View Container:</span>
          <button
            onClick={() => setIsMobileFrameMode(!isMobileFrameMode)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all font-semibold"
          >
            {isMobileFrameMode ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isMobileFrameMode ? 'Full Width' : 'Mobile Frame Preview'}</span>
          </button>
        </div>
      </div>

      {/* Main Container: Mobile phone frame or responsive full width */}
      <div
        className={`w-full min-h-screen transition-all duration-300 flex flex-col relative ${
          isMobileFrameMode
            ? 'max-w-[420px] my-6 rounded-[44px] border-4 border-slate-700/80 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden bg-[#0b0f19]'
            : 'max-w-2xl bg-[#0b0f19]'
        }`}
      >
        {/* App Sticky Header */}
        <AppHeader
          onOpenProfile={() => setIsAuthOpen(true)}
          onOpenAddModal={() => setIsAddTxOpen(true)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 overflow-y-auto no-scrollbar">
          {renderActiveTab()}
        </main>

        {/* Bottom Mobile Navigation Bar */}
        <MobileNavbar onOpenAddModal={() => setIsAddTxOpen(true)} />

        {/* Modals */}
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <AddTransactionModal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} />
        <AddGoalModal isOpen={isAddGoalOpen} onClose={() => setIsAddGoalOpen(false)} />
        <AddStockModal isOpen={isAddStockOpen} onClose={() => setIsAddStockOpen(false)} />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainContent />
    </FinanceProvider>
  );
}
