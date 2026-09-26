import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { AddCategoryModal } from './AddCategoryModal';
import { ChevronDown, Search, Plus, Check, X } from 'lucide-react';

interface CategoryDropdownProps {
  selectedCatId: string;
  onChange: (catId: string) => void;
  type: 'expense' | 'income';
  label?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  selectedCatId,
  onChange,
  type,
  label = 'Category',
}) => {
  const { categories } = useFinance();
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
    return typeCategories.find(c => c.id === selectedCatId) || typeCategories[0] || categories[0];
  }, [typeCategories, selectedCatId, categories]);

  // Filtered by search query
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return typeCategories;
    const q = search.toLowerCase();
    return typeCategories.filter(c => c.name.toLowerCase().includes(q));
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
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category label..."
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

          {/* Category List with full names visible */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 max-h-44 pr-0.5">
            {filteredCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No category found matching "{search}"
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

          {/* Single Clean + Button to Add Custom Label */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Category</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded AddCategoryModal */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};
