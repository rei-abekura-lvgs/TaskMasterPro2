import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '年').replace(/\//g, '月') + '日';
};

export const priorityColors: Record<string, string> = {
  'low': 'bg-green-500',
  'medium': 'bg-yellow-500',
  'high': 'bg-red-500'
};

export const priorityLabels: Record<string, string> = {
  'low': '低',
  'medium': '中',
  'high': '高'
};

export const categoryIcons: Record<string, string> = {
  'all': 'list',
  'work': 'work',
  'personal': 'home',
  'shopping': 'shopping_cart',
  'health': 'favorite',
  'finance': 'attach_money'
};


