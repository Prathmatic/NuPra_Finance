import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { AddCategoryModal } from './AddCategoryModal';
import { PRESET_CATEGORY_COLORS } from '../../constants/defaultCategories';
import { ChevronDown, Search, Plus, Check, X, Sparkles } from 'lucide-react';

interface CategoryDropdownProps {
  selectedCatId: string;
  onChange: (catId: string) => void;
  type: 'expense' | 'income';
  label?: string;
}

const SMART_ICON_MAP: Record<string, string> = {
  coffee: 'Coffee',
  cafe: 'Coffee',
  tea: 'Coffee',
  starbucks: 'Coffee',
  drink: 'Coffee',
  shop: 'ShoppingBag',
  shopping: 'ShoppingBag',
  cloth: 'Shirt',
  clothes: 'Shirt',
  fashion: 'Shirt',
  zara: 'Shirt',
  amazon: 'ShoppingBag',
  market: 'ShoppingBag',
  grocery: 'ShoppingBag',
  groceries: 'ShoppingBag',
  food: 'Utensils',
  restaurant: 'Utensils',
  dinner: 'Utensils',
  lunch: 'Utensils',
  breakfast: 'Utensils',
  snack: 'Utensils',
  movie: 'Tv',
  cinema: 'Tv',
  theatre: 'Tv',
  theater: 'Tv',
  netflix: 'Tv',
  film: 'Film',
  book: 'Book',
  course: 'Book',
  study: 'Book',
  school: 'Book',
  tuition: 'Book',
  car: 'Car',
  uber: 'Car',
  taxi: 'Car',
  fuel: 'Car',
  gas: 'Car',
  petrol: 'Car',
  parking: 'Car',
  flight: 'Plane',
  plane: 'Plane',
  travel: 'Plane',
  trip: 'Plane',
  vacation: 'Globe',
  holiday: 'Globe',
  hotel: 'Home',
  gym: 'Dumbbell',
  fitness: 'Dumbbell',
  workout: 'Dumbbell',
  sport: 'Dumbbell',
  game: 'Gamepad2',
  gaming: 'Gamepad2',
  steam: 'Gamepad2',
  playstation: 'Gamepad2',
  xbox: 'Gamepad2',
  pet: 'Heart',
  dog: 'Heart',
  cat: 'Heart',
  vet: 'Heart',
  gift: 'Gift',
  present: 'Gift',
  birthday: 'Gift',
  phone: 'Smartphone',
  recharge: 'Smartphone',
  mobile: 'Smartphone',
  wifi: 'Smartphone',
  internet: 'Globe',
  music: 'Music',
  spotify: 'Music',
  doctor: 'HeartPulse',
  health: 'HeartPulse',
  medicine: 'HeartPulse',
  medicines: 'HeartPulse',
  pharmacy: 'HeartPulse',
  dentist: 'HeartPulse',
  hospital: 'HeartPulse',
  salary: 'Briefcase',
  freelance: 'Briefcase',
  job: 'Briefcase',
  work: 'Briefcase',
  rent: 'Home',
  house: 'Home',
  bill: 'Zap',
  electricity: 'Zap',
  power: 'Zap',
  invest: 'TrendingUp',
  stock: 'TrendingUp',
  crypto: 'TrendingUp',
  tax: 'Percent',
  insurance: 'Shield',
};

const getSmartIcon = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [kw, icon] of Object.entries(SMART_ICON_MAP)) {
    if (lower.includes(kw)) return icon;
  }
  return 'Tag';
};

const getSmartColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_CATEGORY_COLORS.length;
  return PRESET_CATEGORY_COLORS[index];
};

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  selectedCatId,
  onChange,
  type,
  label = 'Category',
}) => {
  const { categories, addCategory } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Categories matching current type
  const typeCategories = useMemo(() => {
    return categories.filter(c => c.type === 'both' || c.type === type);
  }, [categories, type]);

  // Selected category object
  const selectedCategory = useMemo(() => {
    return typeCategories.find(c => c.id === selectedCatId) 
      || categories.find(c => c.id === selectedCatId) 
      || typeCategories[0] 
      || categories[0];
  }, [typeCategories, selectedCatId, categories]);

  // Filtered by search query
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return typeCategories;
    const q = search.toLowerCase();
    return typeCategories.filter(c => c.name.toLowerCase().includes(q));
  }, [typeCategories, search]);

  // Check if an exact match exists
  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return typeCategories.find(c => c.name.toLowerCase() === q);
  }, [typeCategories, search]);

  const handleSelect = (catId: string) => {
    onChange(catId);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreated = (newId: string) => {
    onChange(newId);
    setIsAddModalOpen(false);
    setIsOpen(false);
    setSearch('');
  };

  // Instant 1-tap creation on the fly
  const handleQuickCreate = (rawName: string) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;

    // Check if category already exists in overall categories list
    const existing = categories.find(
      c => c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      handleSelect(existing.id);
      return;
    }

    const icon = getSmartIcon(cleanName);
    const color = getSmartColor(cleanName);

    const newId = addCategory({
      name: cleanName,
      icon,
      color,
      type: type === 'income' ? 'income' : 'expense',
      isDefault: false,
    });

    handleSelect(newId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!exactMatch && search.trim().length > 0) {
        handleQuickCreate(search.trim());
      } else if (filteredCategories.length > 0) {
        handleSelect(filteredCategories[0].id);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Main trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-white/10 hover:border-white/20 text-left transition-all active:scale-[0.99] focus:outline-none focus:border-indigo-500"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCategory && (
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${selectedCategory.color}25`, color: selectedCategory.color }}
            >
              <CategoryIcon name={selectedCategory.icon} size={16} />
            </div>
          )}
          <span className="text-sm font-semibold text-white truncate">
            {selectedCategory ? selectedCategory.name : 'Select category...'}
          </span>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col">
          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type new category..."
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-800/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Instant 1-Tap Create Label Button (shown when search doesn't match an existing item) */}
          {!exactMatch && search.trim().length > 0 && (
            <button
              type="button"
              onClick={() => handleQuickCreate(search.trim())}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/50 hover:from-emerald-500/25 text-left transition-all active:scale-[0.99] group shadow-sm shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-300 truncate">
                      Create "{search.trim()}"
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider">
                      New
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/80 truncate">
                    1-tap create & assign to this {type === 'expense' ? 'expense' : 'income'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                <span>↵ Enter</span>
              </div>
            </button>
          )}

          {/* Category List with full names visible */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 max-h-48 pr-0.5">
            {filteredCategories.length === 0 && exactMatch ? null : filteredCategories.length === 0 && !search.trim() ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No categories available
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-slate-400">
                No category named "{search}". Tap above to create it!
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm'
                        : 'hover:bg-slate-800/80 text-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={15} />
                      </div>
                      <span className="text-xs break-words whitespace-normal text-white">
                        {cat.name}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action: Customize Icon & Color */}
          <div className="pt-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{search.trim() ? `Customize "${search.trim()}"...` : 'Custom Icon & Color...'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded AddCategoryModal with initialName prefilled */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleCreated}
        initialName={search.trim()}
        initialType={type}
      />
    </div>
  );
};
