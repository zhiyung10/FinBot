'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Subscription, SavingsGoal } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  PiggyBank,
  Target,
  Activity,
  Heart,
} from 'lucide-react'
import IncomeExpenseChart from './IncomeExpenseChart'
import CategoryBreakdownChart from './CategoryBreakdownChart'
import RecentTransactions from './RecentTransactions'
import MonthlySpendingProgress from './MonthlySpendingProgress'
import UpcomingSubscriptions from './UpcomingSubscriptions'
import SavingsGoalProgress from './SavingsGoalProgress'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

interface DashboardData {
  totalIncome: number
  totalExpenses: number
  currentBalance: number
  totalAssets: number
  totalSavings: number
  monthlyBudget: number | null
  savingsRate: number
  healthScore: number | null
  recentTransactions: Transaction[]
  upcomingSubscriptions: Subscription[]
  savingsGoals: SavingsGoal[]
  monthlyChartData: { month: string; income: number; expenses: number }[]
  categoryData: { name: string; value: number }[]
}

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function DashboardContent({ userId }: { userId: string }) {
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
    totalAssets: 0,
    totalSavings: 0,
    monthlyBudget: null,
    savingsRate: 0,
    healthScore: null,
    recentTransactions: [],
    upcomingSubscriptions: [],
    savingsGoals: [],
    monthlyChartData: [],
    categoryData: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const supabase = createClient()
      const now = new Date()
      const monthStart = startOfMonth(now).toISOString().split('T')[0]
      const monthEnd = endOfMonth(now).toISOString().split('T')[0]

      // Fetch current month transactions
      const { data: currentMonthTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)

      const totalIncome = currentMonthTx
        ?.filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

      const totalExpenses = currentMonthTx
        ?.filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

      // Category breakdown for expenses
      const categoryMap = new Map<string, number>()
      currentMonthTx
        ?.filter(t => t.transaction_type === 'expense')
        .forEach(t => {
          const current = categoryMap.get(t.category) ?? 0
          categoryMap.set(t.category, current + Number(t.amount))
        })
      const categoryData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // Fetch last 6 months for chart
      const monthlyChartData: { month: string; income: number; expenses: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const mStart = startOfMonth(monthDate).toISOString().split('T')[0]
        const mEnd = endOfMonth(monthDate).toISOString().split('T')[0]

        const { data: monthTx } = await supabase
          .from('transactions')
          .select('transaction_type, amount')
          .eq('user_id', userId)
          .gte('transaction_date', mStart)
          .lte('transaction_date', mEnd)

        const income = monthTx
          ?.filter(t => t.transaction_type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
        const expenses = monthTx
          ?.filter(t => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

        monthlyChartData.push({
          month: format(monthDate, 'MMM'),
          income,
          expenses,
        })
      }

      // Fetch assets
      const { data: assets } = await supabase
        .from('assets')
        .select('current_value')
        .eq('user_id', userId)

      const totalAssets = assets?.reduce((sum, a) => sum + Number(a.current_value), 0) ?? 0

      // Fetch savings goals
      const { data: goals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)

      const totalSavings = goals?.reduce((sum, g) => sum + Number(g.current_savings), 0) ?? 0

      // Fetch budget
      const { data: budget } = await supabase
        .from('budgets')
        .select('monthly_limit')
        .eq('user_id', userId)
        .single()

      const monthlyBudget = budget?.monthly_limit ? Number(budget.monthly_limit) : null

      // Fetch recent transactions
      const { data: recentTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(5)

      // Fetch upcoming subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('next_payment_date', new Date().toISOString().split('T')[0])
        .order('next_payment_date', { ascending: true })
        .limit(5)

      // Calculate savings rate
      const savingsRate = totalIncome > 0
        ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0

      setData({
        totalIncome,
        totalExpenses,
        currentBalance: totalIncome - totalExpenses,
        totalAssets,
        totalSavings,
        monthlyBudget,
        savingsRate,
        healthScore: null,
        recentTransactions: (recentTx as Transaction[]) ?? [],
        upcomingSubscriptions: (subs as Subscription[]) ?? [],
        savingsGoals: (goals as SavingsGoal[]) ?? [],
        monthlyChartData,
        categoryData,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          value={formatCurrency(data.totalIncome)}
          icon={<TrendingUp size={18} className="text-green-600" />}
          color="bg-green-50"
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(data.totalExpenses)}
          icon={<TrendingDown size={18} className="text-red-600" />}
          color="bg-red-50"
        />
        <SummaryCard
          title="Current Balance"
          value={formatCurrency(data.currentBalance)}
          icon={<Wallet size={18} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <SummaryCard
          title="Total Assets"
          value={formatCurrency(data.totalAssets)}
          icon={<Landmark size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <SummaryCard
          title="Total Savings"
          value={formatCurrency(data.totalSavings)}
          icon={<PiggyBank size={18} className="text-emerald-600" />}
          color="bg-emerald-50"
        />
        <SummaryCard
          title="Budget Remaining"
          value={data.monthlyBudget !== null ? formatCurrency(data.monthlyBudget - data.totalExpenses) : 'Not set'}
          icon={<Target size={18} className="text-orange-600" />}
          color="bg-orange-50"
        />
        <SummaryCard
          title="Savings Rate"
          value={`${data.savingsRate.toFixed(1)}%`}
          icon={<Activity size={18} className="text-cyan-600" />}
          color="bg-cyan-50"
        />
        <SummaryCard
          title="Health Score"
          value={data.healthScore !== null ? `${data.healthScore}/100` : 'N/A'}
          icon={<Heart size={18} className="text-pink-600" />}
          color="bg-pink-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseChart data={data.monthlyChartData} />
        <CategoryBreakdownChart data={data.categoryData} />
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MonthlySpendingProgress spent={data.totalExpenses} budget={data.monthlyBudget} />
        <RecentTransactions transactions={data.recentTransactions} />
        <UpcomingSubscriptions subscriptions={data.upcomingSubscriptions} />
      </div>

      {/* Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SavingsGoalProgress goals={data.savingsGoals} />
      </div>

      {/* Empty state notice */}
      {data.totalIncome === 0 && data.totalExpenses === 0 && data.totalAssets === 0 && (
        <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Welcome to FinancialApp!</h3>
          <p className="text-gray-600">
            Start by adding your first transaction to see your financial overview come to life.
          </p>
        </div>
      )}
    </div>
  )
}
