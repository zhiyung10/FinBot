'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, TransactionType } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Trash2, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import TransactionForm from './TransactionForm'

interface TransactionsContentProps {
  userId: string
}

export default function TransactionsContent({ userId }: TransactionsContentProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const supabase = createClient()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)

      if (filterType !== 'all') {
        query = query.eq('transaction_type', filterType)
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }

      if (sortBy === 'date') {
        query = query.order('transaction_date', { ascending: sortOrder === 'asc' })
      } else {
        query = query.order('amount', { ascending: sortOrder === 'asc' })
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data ?? [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, filterType, filterCategory, sortBy, sortOrder, supabase])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingTransaction(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    fetchTransactions()
  }

  const filteredTransactions = transactions.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = [...new Set(transactions.map(t => t.category))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Transaction</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-') as ['date' | 'amount', 'asc' | 'desc']
              setSortBy(by)
              setSortOrder(order)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/60 text-center">
          <p className="text-gray-500">
            {transactions.length === 0
              ? 'No transactions recorded yet. Add your first income or expense to get started.'
              : 'No transactions match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60 flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition"
            >
              <div className={`p-2 rounded-full ${
                transaction.transaction_type === 'income' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {transaction.transaction_type === 'income' ? (
                  <TrendingUp size={20} className="text-green-600" />
                ) : (
                  <TrendingDown size={20} className="text-red-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{transaction.title}</p>
                <p className="text-sm text-gray-500">
                  {transaction.category} &middot; {new Date(transaction.transaction_date).toLocaleDateString('en-MY')}
                </p>
              </div>

              <div className="text-right flex items-center gap-3">
                <p className={`font-semibold ${
                  transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    aria-label="Edit transaction"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    aria-label="Delete transaction"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          userId={userId}
          transaction={editingTransaction}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
