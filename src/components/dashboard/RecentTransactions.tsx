'use client'

import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>
      <p className="text-gray-400 text-sm text-center py-4">
        No transactions recorded yet.
      </p>
    </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
        <Link href="/transactions" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.slice(0, 5).map((t) => (
          <div key={t.id} className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${
              t.transaction_type === 'income' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {t.transaction_type === 'income' ? (
                <TrendingUp size={14} className="text-green-600" />
              ) : (
                <TrendingDown size={14} className="text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
              <p className="text-xs text-gray-500">{t.category}</p>
            </div>
            <p className={`text-sm font-semibold ${
              t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
            }`}>
              {t.transaction_type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
