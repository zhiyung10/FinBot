'use client'

import { SavingsGoal } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Target } from 'lucide-react'
import Link from 'next/link'

interface SavingsGoalProgressProps {
  goals: SavingsGoal[]
}

export default function SavingsGoalProgress({ goals }: SavingsGoalProgressProps) {
  if (goals.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Savings Goals</h3>
        <p className="text-gray-400 text-sm text-center py-4">
          No savings goals set yet.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Savings Goals</h3>
        <Link href="/savings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {goals.slice(0, 3).map((goal) => {
          const percentage = goal.target_amount > 0
            ? Math.min((goal.current_savings / goal.target_amount) * 100, 100)
            : 0

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-emerald-600" />
                  <span className="text-sm font-medium text-gray-900">{goal.goal_name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(goal.current_savings)}</span>
                <span>{formatCurrency(goal.target_amount)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
