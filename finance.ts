import { Transaction } from './types';

export const balance = (initial: number, tx: Transaction[]) =>
  tx.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), initial);

export const monthTotal = (tx: Transaction[], type: Transaction['type'], date = new Date()) =>
  tx.filter(item => {
    const value = new Date(item.date);
    return item.type === type && value.getMonth() === date.getMonth() && value.getFullYear() === date.getFullYear() && value <= new Date();
  }).reduce((sum, item) => sum + item.amount, 0);

export const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat('pt-AO', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
};
