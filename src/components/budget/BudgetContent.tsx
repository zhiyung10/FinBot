'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Budget, BudgetType, AllocationPeriod } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'
import { getDaysInMonth } from 'date-fns'
import { PiggyBank, AlertTriangle } from 'lucide-react'

interface BudgetContentProps {
  userId: string
}

export default function BudgetContent({ userId }: BudgetContentProps) {
  const [budget, setBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)

  // Form state
  const [budgetType, setBudgetType] = useState<BudgetType>('automatic')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [dailyLimit, setDailyLimit] = useState('')
  const [weeklyLimit, setWeeklyLimit] = useState('')
  const [allocationPeriod, setAllocationPeriod] = useState<AllocationPeriod>('daily')

  // Alert thresholds
  const [thresholds, setThresholds] = useState<number[]>([50, 70, 80, 90, 100])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (budgetData) {
        setBudget(budgetData)
        setBudgetType(budgetData.budget_type as BudgetType)
        setMonthlyLimit(budgetData.monthly_limit?.toString() ?? '')
        setDailyLimit(budgetData.daily_limit?.toString() ?? '')
        setWeeklyLimit(budgetData.weekly_limit?.toString() ?? '')
        setAllocationPeriod((budgetData.allocation_period as AllocationPeriod) ?? 'daily')
      }

      // Fetch current month expenses
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'expense')
        .gte('transaction_date', startOfMonth)
        .lte('transaction_date', endOfMonth)

      const total = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
      setMonthlyExpenses(total)

      // Fetch alert settings
      const { data: alertSettings } = await supabase
        .from('budget_alert_settings')
        .select('threshold_percentage')
        .eq('user_id', userId)

      if (alertSettings && alertSettings.length > 0) {
        setThresholds(alertSettings.map(a => a.threshold_percentage))
      }
    } catch (error) {
      console.error('Error fetching budget:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()

      const payload: Partial<Budget> & { user_id: string } = {
        user_id: userId,
        budget_type: budgetType,
        monthly_limit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        daily_limit: budgetType === 'manual' && dailyLimit ? parseFloat(dailyLimit) : null,
        weekly_limit: budgetType === 'manual' && weeklyLimit ? parseFloat(weeklyLimit) : null,
        allocation_period: budgetType === 'automatic' ? allocationPeriod : null,
      }

      // Calculate automatic limits
      if (budgetType === 'automatic' && monthlyLimit) {
        const monthly = parseFloat(monthlyLimit)
        const daysInMonth = getDaysInMonth(new Date())
        if (allocationPeriod === 'daily') {
          payload.daily_limit = Math.round((monthly / daysInMonth) * 100) / 100
          payload.weekly_limit = Math.round((monthly / (daysInMonth / 7)) * 100) / 100
        } else if (allocationPeriod === 'weekly') {
          payload.weekly_limit = Math.round((monthly / 4.33) * 100) / 100
          payload.daily_limit = Math.round((payload.weekly_limit / 7) * 100) / 100
        }
      }

      if (budget) {
        await supabase
          .from('budgets')
          .update(payload)
          .eq('id', budget.id)
          .eq('user_id', userId)
      } else {
        await supabase.from('budgets').insert(payload)
      }

      // Save alert thresholds
      await supabase
        .from('budget_alert_settings')
        .delete()
        .eq('user_id', userId)

      if (thresholds.length > 0) {
        await supabase.from('budget_alert_settings').insert(
          thresholds.map(t => ({
            user_id: userId,
            threshold_percentage: t,
            is_enabled: true,
          }))
        )
      }

      await fetchData()
    } catch (error) {
      console.error('Error saving budget:', error)
    } finally {
      setSaving(false)
    }
  }

  // Calculate spending status
  const effectiveMonthlyLimit = monthlyLimit ? parseFloat(monthlyLimit) : 0
  const spendingPercentage = effectiveMonthlyLimit > 0
    ? (monthlyExpenses / effectiveMonthlyLimit) * 100
    : 0

  const daysInMonth = getDaysInMonth(new Date())
  const currentDay = new Date().getDate()
  const dailyBudget = effectiveMonthlyLimit > 0 ? effectiveMonthlyLimit / daysInMonth : 0
  const expectedSpending = dailyBudget * currentDay
  const weeklyBudget = effectiveMonthlyLimit > 0 ? effectiveMonthlyLimit / 4.33 : 0

  let statusLabel: string
  let statusColor: string
  if (spendingPercentage <= 50) { statusLabel = 'Safe'; statusColor = 'text-green-600 bg-green-50' }
  else if (spendingPercentage <= 70) { statusLabel = 'Moderate'; statusColor = 'text-yellow-600 bg-yellow-50' }
  else if (spendingPercentage <= 90) { statusLabel = 'Caution'; statusColor = 'text-orange-600 bg-orange-50' }
  else if (spendingPercentage <= 100) { statusLabel = 'High'; statusColor = 'text-red-600 bg-red-50' }
  else { statusLabel = 'Exceeded'; statusColor = 'text-red-700 bg-red-100' }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Budget</h1>

      {/* Current Status */}
      {effectiveMonthlyLimit > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Budget Status</h2>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor)}>
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(monthlyExpenses)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Remaining</p>
              <p className={cn('text-lg font-bold', monthlyExpenses > effectiveMonthlyLimit ? 'text-red-600' : 'text-green-600')}>
                {formatCurrency(Math.max(0, effectiveMonthlyLimit - monthlyExpenses))}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Budget</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(effectiveMonthlyLimit)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
            <div
              className={cn(
                'h-4 rounded-full transition-all',
                spendingPercentage <= 50 ? 'bg-green-500' :
                spendingPercentage <= 70 ? 'bg-yellow-500' :
                spendingPercentage <= 90 ? 'bg-orange-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 text-center">{spendingPercentage.toFixed(1)}% used</p>

          {/* Daily/Weekly breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Daily Budget</p>
              <p className="font-semibold text-gray-900">{formatCurrency(dailyBudget)}/day</p>
              <p className="text-xs text-gray-400">
                Expected by today: {formatCurrency(expectedSpending)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Weekly Budget</p>
              <p className="font-semibold text-gray-900">{formatCurrency(weeklyBudget)}/week</p>
            </div>
          </div>

          {/* Alert warnings */}
          {thresholds.some(t => spendingPercentage >= t) && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-700">
                {spendingPercentage >= 100
                  ? `You have exceeded your monthly budget by ${formatCurrency(monthlyExpenses - effectiveMonthlyLimit)}.`
                  : `You have used ${spendingPercentage.toFixed(0)}% of your monthly budget. Consider reducing non-essential spending.`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PiggyBank size={20} />
          Budget Configuration
        </h2>

        {/* Budget Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBudgetType('automatic')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition border-2',
                budgetType === 'automatic'
                  ? 'bg-blue-50 text-blue-700 border-blue-500'
                  : 'bg-gray-50 text-gray-600 border-transparent'
              )}
            >
              Automatic Allocation
            </button>
            <button
              type="button"
              onClick={() => setBudgetType('manual')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition border-2',
                budgetType === 'manual'
                  ? 'bg-blue-50 text-blue-700 border-blue-500'
                  : 'bg-gray-50 text-gray-600 border-transparent'
              )}
            >
              Manual Limits
            </button>
          </div>
        </div>

        {budgetType === 'automatic' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="monthlyLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Expense Limit (RM)
              </label>
              <input
                id="monthlyLimit"
                type="number"
                step="0.01"
                min="0"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., 3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Period</label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as AllocationPeriod[]).map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setAllocationPeriod(period)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition border',
                      allocationPeriod === period
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {monthlyLimit && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p>Daily: ~{formatCurrency(parseFloat(monthlyLimit) / daysInMonth)}/day</p>
                <p>Weekly: ~{formatCurrency(parseFloat(monthlyLimit) / 4.33)}/week</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="manualMonthly" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Limit (RM)
              </label>
              <input
                id="manualMonthly"
                type="number"
                step="0.01"
                min="0"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., 3000"
              />
            </div>
            <div>
              <label htmlFor="manualWeekly" className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Limit (RM)
              </label>
              <input
                id="manualWeekly"
                type="number"
                step="0.01"
                min="0"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., 700"
              />
            </div>
            <div>
              <label htmlFor="manualDaily" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Limit (RM)
              </label>
              <input
                id="manualDaily"
                type="number"
                step="0.01"
                min="0"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., 100"
              />
            </div>
          </div>
        )}

        {/* Alert Thresholds */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Thresholds
          </label>
          <div className="flex flex-wrap gap-2">
            {[50, 70, 80, 90, 100].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setThresholds(prev =>
                    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort((a, b) => a - b)
                  )
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition border',
                  thresholds.includes(t)
                    ? 'bg-orange-50 text-orange-700 border-orange-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                )}
              >
                {t}%
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            You will be warned when spending reaches these levels.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Budget Settings'}
        </button>
      </div>
    </div>
  )
}
