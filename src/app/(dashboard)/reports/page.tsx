'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

type Period = 'this-month' | 'last-month' | '3-months' | '6-months' | '1-year'

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('3-months')
  const [incomeVsExpenses, setIncomeVsExpenses] = useState<{ month: string; income: number; expenses: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [cashFlow, setCashFlow] = useState<{ month: string; net: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      let monthsBack: number
      switch (period) {
        case 'this-month': monthsBack = 0; break
        case 'last-month': monthsBack = 1; break
        case '3-months': monthsBack = 2; break
        case '6-months': monthsBack = 5; break
        case '1-year': monthsBack = 11; break
        default: monthsBack = 2
      }

      const monthlyData: { month: string; income: number; expenses: number; net: number }[] = []
      const allCategoryMap = new Map<string, number>()

      for (let i = monthsBack; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const mStart = startOfMonth(monthDate).toISOString().split('T')[0]
        const mEnd = endOfMonth(monthDate).toISOString().split('T')[0]

        const { data: txs } = await supabase
          .from('transactions')
          .select('transaction_type, amount, category')
          .eq('user_id', user.id)
          .gte('transaction_date', mStart)
          .lte('transaction_date', mEnd)

        const income = txs?.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
        const expenses = txs?.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0

        monthlyData.push({
          month: format(monthDate, 'MMM yy'),
          income,
          expenses,
          net: income - expenses,
        })

        // Accumulate categories
        txs?.filter(t => t.transaction_type === 'expense').forEach(t => {
          const current = allCategoryMap.get(t.category) ?? 0
          allCategoryMap.set(t.category, current + Number(t.amount))
        })
      }

      setIncomeVsExpenses(monthlyData.map(m => ({ month: m.month, income: m.income, expenses: m.expenses })))
      setCashFlow(monthlyData.map(m => ({ month: m.month, net: m.net })))
      setCategoryData(
        Array.from(allCategoryMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      )
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchReportData() }, [fetchReportData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="3-months">Last 3 Months</option>
          <option value="6-months">Last 6 Months</option>
          <option value="1-year">Last 12 Months</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60 animate-pulse h-80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Income vs Expenses</h3>
            {incomeVsExpenses.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`RM${Number(v).toLocaleString()}`, '']} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No data for this period.</p>
            )}
          </div>

          {/* Cash Flow Trend */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow</h3>
            {cashFlow.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`RM${Number(v).toLocaleString()}`, 'Net']} />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No data for this period.</p>
            )}
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Category Analysis</h3>
            {categoryData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`RM${Number(v).toLocaleString()}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-gray-700">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No expense data for this period.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
