import { Category } from '../types/finance';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-salary',
    name: 'Salary',
    icon: 'Briefcase',
    color: '#10B981', // Emerald
    isDefault: true,
    type: 'income',
  },
  {
    id: 'cat-rent',
    name: 'Rent',
    icon: 'Home',
    color: '#6366F1', // Indigo
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-food',
    name: 'Food',
    icon: 'Utensils',
    color: '#F59E0B', // Amber
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-leisure',
    name: 'Leisure',
    icon: 'Film',
    color: '#EC4899', // Pink
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-travel',
    name: 'Travel',
    icon: 'Plane',
    color: '#06B6D4', // Cyan
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-health',
    name: 'Health',
    icon: 'HeartPulse',
    color: '#EF4444', // Red
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-hobby',
    name: 'Hobby',
    icon: 'Palette',
    color: '#8B5CF6', // Purple
    isDefault: true,
    type: 'expense',
  },
  // Additional helpful default categories
  {
    id: 'cat-groceries',
    name: 'Groceries',
    icon: 'ShoppingBag',
    color: '#14B8A6', // Teal
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-utilities',
    name: 'Utilities',
    icon: 'Zap',
    color: '#F97316', // Orange
    isDefault: true,
    type: 'expense',
  },
  {
    id: 'cat-investment',
    name: 'Investment',
    icon: 'TrendingUp',
    color: '#3B82F6', // Blue
    isDefault: true,
    type: 'both',
  }
];

export const PRESET_CATEGORY_COLORS = [
  '#E11D48', // Velvet Rose
  '#F43F5E', // Rose 500
  '#EC4899', // Pink 500
  '#8B5CF6', // Purple 500
  '#6366F1', // Indigo 500
  '#3B82F6', // Blue 500
  '#06B6D4', // Cyan 500
  '#10B981', // Emerald 500
  '#84CC16', // Lime 500
  '#F59E0B', // Amber 500
  '#F97316', // Orange 500
  '#EF4444', // Red 500
  '#14B8A6', // Teal 500
  '#64748B', // Slate 500
];
