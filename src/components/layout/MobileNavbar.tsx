import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Home, 
  ReceiptText, 
  Target, 
  TrendingUp, 
  CalendarCheck, 
  BarChart3, 
  Plus 
} from 'lucide-react';

interface MobileNavbarProps {
  onOpenAddModal: () => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ onOpenAddModal }) => {
  const { activeTab, setActiveTab } = useFinance();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'transactions', label: 'History', icon: ReceiptText },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'stocks', label: 'Stocks', icon: TrendingUp },
    { id: 'bills', label: 'Bills', icon: CalendarCheck },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Floating Center Action Button */}
      <div className="max-w-md mx-auto relative px-4">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={onOpenAddModal}
            className="flex items-center justify-center w-13 h-13 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 text-white shadow-lg shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all p-3 border-4 border-[#0b0f19]"
            title="Add Transaction"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Bottom Nav Bar Bar */}
      <nav className="glass-panel border-t border-white/10 px-2 py-1.5 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-rose-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-rose-500/15' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-rose-400 stroke-[2.2]' : ''}`} />
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}

          {/* Spacer for center floating button */}
          <div className="w-12 h-8" />

          {navItems.slice(3).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-500/15' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400 stroke-[2.2]' : ''}`} />
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
