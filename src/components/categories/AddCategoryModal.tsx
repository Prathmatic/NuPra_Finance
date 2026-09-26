import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Tag, Plus, Check } from 'lucide-react';
import { PRESET_CATEGORY_COLORS } from '../../constants/defaultCategories';
import { CategoryIcon } from '../common/CategoryIcon';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (catId: string) => void;
}

const AVAILABLE_ICONS = [
  'Tag', 'Coffee', 'ShoppingBag', 'Tv', 'Book', 'Car', 'Smartphone', 
  'Music', 'Sparkles', 'Dumbbell', 'Gamepad2', 'Shirt', 'Smile', 'Gift', 
  'Globe', 'Shield', 'Percent', 'Briefcase', 'Heart'
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { addCategory } = useFinance();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState('Tag');
  const [type, setType] = useState<'expense' | 'income' | 'both'>('expense');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = addCategory({
      name: name.trim(),
      icon,
      color,
      type,
      isDefault: false,
    });

    setName('');
    if (onCreated) {
      onCreated(newId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: color }}>
              <CategoryIcon name={icon} className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">Create Custom Label / Category</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pet Care, Cinema, Subscription"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pick Label Color</label>
            <div className="grid grid-cols-7 gap-2">
              {PRESET_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    color === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105 opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Choose Icon</label>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-white/5">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                    icon === ic ? 'bg-white/20 text-white border border-white/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CategoryIcon name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Applies To</label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                  type === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                  type === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType('both')}
                className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                  type === 'both' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Label</span>
          </button>
        </form>
      </div>
    </div>
  );
};
