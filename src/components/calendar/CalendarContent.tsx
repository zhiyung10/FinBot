'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Asset } from '@/types/database'
import { formatCurrency, formatCompactCurrency, cn } from '@/lib/utils'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react'
import TransactionForm from '@/components/transactions/TransactionForm'

type FilterType = 'all' | 'income' | 'expenses' | 'assets'

interface DayData {
  income: number
  expenses: number
  assets: number
  transactions: Transaction[]
}

interface CalendarContentProps {
  userId: string
}

export default function CalendarContent({ userId }: CalendarContentProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dayDataMap, setDayDataMap] = useState<Record<string, DayData>>({})
  const [totalAssets, setTotalAssets] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showTransactionForm, setShowTransactionForm] = useState(false)

  // Monthly totals
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)

  const fetchCalendarData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const monthStart = startOfMonth(currentMonth).toISOString().split('T')[0]
      const monthEnd = endOfMonth(currentMonth).toISOString().split('T')[0]

      // Fetch transactions for the month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)
        .order('transaction_date', { ascending: true })

      // Fetch assets
      const { data: assets } = await supabase
        .from('assets')
        .select('current_value')
        .eq('user_id', userId)

      const assetsTotal = assets?.reduce((sum, a) => sum + Number(a.current_value), 0) ?? 0
      setTotalAssets(assetsTotal)

      // Build day data map
      const map: Record<string, DayData> = {}
      let mIncome = 0
      let mExpenses = 0

      transactions?.forEach(t => {
        const dateKey = t.transaction_date
        if (!map[dateKey]) {
          map[dateKey] = { income: 0, expenses: 0, assets: assetsTotal, transactions: [] }
        }
        if (t.transaction_type === 'income') {
          map[dateKey].income += Number(t.amount)
          mIncome += Number(t.amount)
        } else {
          map[dateKey].expenses += Number(t.amount)
          mExpenses += Number(t.amount)
        }
        map[dateKey].transactions.push(t as Transaction)
      })

      setDayDataMap(map)
      setMonthlyIncome(mIncome)
      setMonthlyExpenses(mExpenses)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, userId])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const selectedDayData = selectedDate ? dayDataMap[selectedDate] : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Calendar</h1>

      {/* Monthly Summary */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(monthlyExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Cash Flow</p>
            <p className={cn('text-lg font-bold', monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600')}>
              {monthlyIncome - monthlyExpenses >= 0 ? '+' : ''}{formatCurrency(monthlyIncome - monthlyExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Assets</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalAssets)}</p>
          </div>
        </div>
      </div>

      {/* Navigation & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight size={20} />
          </button>
          <button onClick={handleToday} className="ml-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
            Today
          </button>
        </div>

        <div className="flex gap-1">
          {(['all', 'income', 'expenses', 'assets'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                filter === f ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 overflow-hidden">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayData = dayDataMap[dateKey]
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isTodayDate = isToday(day)

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    'min-h-[80px] sm:min-h-[100px] p-1.5 border-b border-r border-gray-50 text-left transition hover:bg-blue-50/50 relative',
                    !isCurrentMonth && 'opacity-40',
                    isTodayDate && 'bg-blue-50/30',
                    selectedDate === dateKey && 'ring-2 ring-blue-500 ring-inset'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    isTodayDate ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-700'
                  )}>
                    {format(day, 'd')}
                  </span>

                  {dayData && (
                    <div className="mt-1 space-y-0.5">
                      {(filter === 'all' || filter === 'income') && dayData.income > 0 && (
                        <p className="text-[10px] font-medium text-green-600 truncate">
                          +{formatCompactCurrency(dayData.income)}
                        </p>
                      )}
                      {(filter === 'all' || filter === 'expenses') && dayData.expenses > 0 && (
                        <p className="text-[10px] font-medium text-red-600 truncate">
                          -{formatCompactCurrency(dayData.expenses)}
                        </p>
                      )}
                      {(filter === 'all' || filter === 'assets') && totalAssets > 0 && dayData.income === 0 && dayData.expenses === 0 && (
                        <p className="text-[10px] font-medium text-blue-500 truncate hidden sm:block">
                          A{formatCompactCurrency(totalAssets)}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Date Detail Panel */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:items-start sm:pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(new Date(selectedDate), 'dd MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  aria-label="Add transaction"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Daily Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Income</p>
                  <p className="text-sm font-bold text-green-700">
                    {formatCurrency(selectedDayData?.income ?? 0)}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Expenses</p>
                  <p className="text-sm font-bold text-red-700">
                    {formatCurrency(selectedDayData?.expenses ?? 0)}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Net</p>
                  <p className={cn('text-sm font-bold',
                    (selectedDayData?.income ?? 0) - (selectedDayData?.expenses ?? 0) >= 0
                      ? 'text-green-700' : 'text-red-700'
                  )}>
                    {formatCurrency((selectedDayData?.income ?? 0) - (selectedDayData?.expenses ?? 0))}
                  </p>
                </div>
              </div>

              {/* Transactions */}
              {selectedDayData && selectedDayData.transactions.length > 0 ? (
                <div className="space-y-3">
                  {/* Income */}
                  {selectedDayData.transactions.filter(t => t.transaction_type === 'income').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Income</h4>
                      {selectedDayData.transactions
                        .filter(t => t.transaction_type === 'income')
                        .map(t => (
                          <div key={t.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{t.title}</p>
                              <p className="text-xs text-gray-500">{t.category}</p>
                            </div>
                            <p className="text-sm font-semibold text-green-600">
                              +{formatCurrency(t.amount)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Expenses */}
                  {selectedDayData.transactions.filter(t => t.transaction_type === 'expense').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expenses</h4>
                      {selectedDayData.transactions
                        .filter(t => t.transaction_type === 'expense')
                        .map(t => (
                          <div key={t.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{t.title}</p>
                              <p className="text-xs text-gray-500">{t.category}</p>
                            </div>
                            <p className="text-sm font-semibold text-red-600">
                              -{formatCurrency(t.amount)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400 py-4">
                  No financial activity on this date.
                </p>
              )}

              {/* Assets */}
              {totalAssets > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assets</h4>
                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(totalAssets)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Form */}
      {showTransactionForm && selectedDate && (
        <TransactionForm
          userId={userId}
          defaultDate={selectedDate}
          onClose={() => setShowTransactionForm(false)}
          onSuccess={() => {
            setShowTransactionForm(false)
            fetchCalendarData()
          }}
        />
      )}
    </div>
  )
}
