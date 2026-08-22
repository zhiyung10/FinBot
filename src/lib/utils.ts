import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'MYR'): string {
  if (currency === 'MYR') {
    return `RM${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatCompactCurrency(amount: number, currency: string = 'MYR'): string {
  const prefix = currency === 'MYR' ? 'RM' : '$'
  if (Math.abs(amount) >= 1_000_000) {
    return `${prefix}${(amount / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${prefix}${(amount / 1_000).toFixed(1)}K`
  }
  return `${prefix}${amount.toFixed(0)}`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
