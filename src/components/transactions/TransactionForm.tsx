'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, TransactionType, IncomeCategory, ExpenseCategory } from '@/types/database'
import { X } from 'lucide-react'

const incomeCategories: IncomeCategory[] = [
  'Salary', 'Freelance', 'Business', 'Bonus', 'Commission',
  'Rental Income', 'Investment Income', 'Passive Income', 'Other'
]

const expenseCategories: ExpenseCategory[] = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Shopping',
  'Entertainment', 'Education', 'Healthcare', 'Insurance',
  'Investment', 'Subscription', 'Loan', 'Other'
]

interface TransactionFormProps {
  userId: string
  transaction?: Transaction | null
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
}

export default function TransactionForm({
  userId,
  transaction,
  onClose,
  onSuccess,
  defaultDate,
}: TransactionFormProps) {
  const isEditing = !!transaction
  const [type, setType] = useState<TransactionType>(transaction?.transaction_type ?? 'expense')
  const [title, setTitle] = useState(transaction?.title ?? '')
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [date, setDate] = useState(
    transaction?.transaction_date ?? defaultDate ?? new Date().toISOString().split('T')[0]
  )
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const categories = type === 'income' ? incomeCategories : expenseCategories

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    if (!category) {
      setError('Please select a category')
      return
    }

    setLoading(true)

    const payload = {
      user_id: userId,
      transaction_type: type,
      title: title.trim(),
      amount: parsedAmount,
      category,
      transaction_date: date,
      description: description.trim() || null,
    }

    let result
    if (isEditing) {
      result = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', transaction.id)
        .eq('user_id', userId)
    } else {
      result = await supabase
        .from('transactions')
        .insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Transaction Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setType('income'); setCategory('') }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  type === 'income'
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => { setType('expense'); setCategory('') }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  type === 'expense'
                    ? 'bg-red-100 text-red-700 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., Salary, Lunch, Groceries"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (RM)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Add a note..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
