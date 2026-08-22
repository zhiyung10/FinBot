'use client'

import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MonthlySpendingProgressProps {
  spent: number
  budget: number | null
}

export default function MonthlySpendingProgress({ spent, budget }: MonthlySpendingProgressProps) {
  if (budget === null || budget <= 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spending</h3>
        <p className="text-gray-400 text-sm text-center py-4">
          Set a monthly budget to track spending progress.
        </p>
      </div>
    )
  }

  const percentage = Math.min((spent / budget) * 100, 100)
  const overBudget = spent > budget

  let status: string
  let statusColor: string
  let barColor: string

  if (percentage <= 50) {
    status = 'Safe'
    statusColor = 'text-green-600'
    barColor = 'bg-green-500'
  } else if (percentage <= 70) {
    status = 'Moderate'
    statusColor = 'text-yellow-600'
    barColor = 'bg-yellow-500'
  } else if (percentage <= 90) {
    status = 'Caution'
    statusColor = 'text-orange-600'
    barColor = 'bg-orange-500'
  } else {
    status = overBudget ? 'Exceeded' : 'High'
    statusColor = 'text-red-600'
    barColor = 'bg-red-500'
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Monthly Spending</h3>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusColor,
          percentage <= 50 ? 'bg-green-50' :
          percentage <= 70 ? 'bg-yellow-50' :
          percentage <= 90 ? 'bg-orange-50' : 'bg-red-50'
        )}>
          {status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Spent</span>
          <span className="font-medium text-gray-900">{formatCurrency(spent)}</span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Budget</span>
          <span className="font-medium text-gray-900">{formatCurrency(budget)}</span>
        </div>

        {overBudget && (
          <p className="text-xs text-red-600 font-medium">
            Over budget by {formatCurrency(spent - budget)}
          </p>
        )}
      </div>
    </div>
  )
}
