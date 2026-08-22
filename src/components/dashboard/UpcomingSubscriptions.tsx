'use client'

import { Subscription } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'

interface UpcomingSubscriptionsProps {
  subscriptions: Subscription[]
}

export default function UpcomingSubscriptions({ subscriptions }: UpcomingSubscriptionsProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Upcoming Subscriptions</h3>
        <p className="text-gray-400 text-sm text-center py-4">
          No upcoming subscription payments.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Upcoming Subscriptions</h3>
        <Link href="/subscriptions" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {subscriptions.slice(0, 5).map((sub) => {
          const daysUntil = differenceInDays(new Date(sub.next_payment_date), new Date())
          let dueText: string
          if (daysUntil <= 0) {
            dueText = 'Due today'
          } else if (daysUntil === 1) {
            dueText = 'Due tomorrow'
          } else if (daysUntil <= 7) {
            dueText = `Due in ${daysUntil} days`
          } else {
            dueText = `Due in ${daysUntil} days`
          }

          return (
            <div key={sub.id} className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-indigo-50">
                <CreditCard size={14} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{sub.subscription_name}</p>
                <p className="text-xs text-gray-500">{dueText}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(sub.amount)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
