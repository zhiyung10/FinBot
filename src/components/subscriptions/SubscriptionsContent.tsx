'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subscription, BillingFrequency } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { Plus, Trash2, Pencil, CreditCard, X } from 'lucide-react'

interface SubscriptionsContentProps {
  userId: string
}

const billingFrequencies: BillingFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

function getAnnualCost(amount: number, frequency: BillingFrequency): number {
  switch (frequency) {
    case 'daily': return amount * 365
    case 'weekly': return amount * 52
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'yearly': return amount
  }
}

function getMonthlyCost(amount: number, frequency: BillingFrequency): number {
  return getAnnualCost(amount, frequency) / 12
}

export default function SubscriptionsContent({ userId }: SubscriptionsContentProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formFrequency, setFormFrequency] = useState<BillingFrequency>('monthly')
  const [formNextPayment, setFormNextPayment] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('')
  const [formAutoRenewal, setFormAutoRenewal] = useState(true)
  const [formReminderDays, setFormReminderDays] = useState('3')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('next_payment_date', { ascending: true })

      if (error) throw error
      setSubscriptions(data ?? [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const resetForm = () => {
    setFormName('')
    setFormCategory('')
    setFormAmount('')
    setFormFrequency('monthly')
    setFormNextPayment('')
    setFormPaymentMethod('')
    setFormAutoRenewal(true)
    setFormReminderDays('3')
    setFormNotes('')
    setFormError(null)
    setEditingSub(null)
  }

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub)
    setFormName(sub.subscription_name)
    setFormCategory(sub.category ?? '')
    setFormAmount(sub.amount.toString())
    setFormFrequency(sub.billing_frequency)
    setFormNextPayment(sub.next_payment_date)
    setFormPaymentMethod(sub.payment_method ?? '')
    setFormAutoRenewal(sub.auto_renewal)
    setFormReminderDays(sub.reminder_days.toString())
    setFormNotes(sub.notes ?? '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription?')) return
    const supabase = createClient()
    await supabase.from('subscriptions').delete().eq('id', id).eq('user_id', userId)
    setSubscriptions(prev => prev.filter(s => s.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseFloat(formAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a positive number')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      user_id: userId,
      subscription_name: formName.trim(),
      category: formCategory.trim() || null,
      amount: parsedAmount,
      billing_frequency: formFrequency,
      next_payment_date: formNextPayment,
      payment_method: formPaymentMethod.trim() || null,
      auto_renewal: formAutoRenewal,
      reminder_days: parseInt(formReminderDays) || 3,
      notes: formNotes.trim() || null,
      is_active: true,
    }

    if (editingSub) {
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', editingSub.id)
        .eq('user_id', userId)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('subscriptions').insert(payload)
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    resetForm()
    setShowForm(false)
    setSaving(false)
    fetchSubscriptions()
  }

  const totalMonthlyCost = subscriptions.reduce((sum, s) => sum + getMonthlyCost(s.amount, s.billing_frequency), 0)
  const totalAnnualCost = subscriptions.reduce((sum, s) => sum + getAnnualCost(s.amount, s.billing_frequency), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Subscription</span>
        </button>
      </div>

      {/* Cost Summary */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500">Monthly Cost</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalMonthlyCost)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500">Annual Cost</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAnnualCost)}</p>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <CreditCard size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No subscriptions added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => {
            const daysUntil = differenceInDays(new Date(sub.next_payment_date), new Date())
            let dueText: string
            let dueColor: string
            if (daysUntil < 0) { dueText = 'Overdue'; dueColor = 'text-red-600' }
            else if (daysUntil === 0) { dueText = 'Due today'; dueColor = 'text-orange-600' }
            else if (daysUntil === 1) { dueText = 'Due tomorrow'; dueColor = 'text-orange-600' }
            else if (daysUntil <= 7) { dueText = `Due in ${daysUntil} days`; dueColor = 'text-yellow-600' }
            else { dueText = `Due in ${daysUntil} days`; dueColor = 'text-gray-500' }

            return (
              <div key={sub.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-2 rounded-full bg-indigo-50">
                  <CreditCard size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{sub.subscription_name}</p>
                  <p className={cn('text-xs', dueColor)}>{dueText}</p>
                  <p className="text-xs text-gray-400">{sub.billing_frequency}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-semibold text-gray-900">{formatCurrency(sub.amount)}</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(sub)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" aria-label="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSub ? 'Edit Subscription' : 'Add Subscription'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g., Netflix" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g., Entertainment" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RM)</label>
                <input type="number" step="0.01" min="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
                <select value={formFrequency} onChange={e => setFormFrequency(e.target.value as BillingFrequency)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {billingFrequencies.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Payment Date</label>
                <input type="date" value={formNextPayment} onChange={e => setFormNextPayment(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <input type="text" value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g., Credit Card" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="autoRenewal" checked={formAutoRenewal} onChange={e => setFormAutoRenewal(e.target.checked)} className="rounded" />
                <label htmlFor="autoRenewal" className="text-sm text-gray-700">Auto renewal</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (days before)</label>
                <select value={formReminderDays} onChange={e => setFormReminderDays(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="0">Same day</option>
                  <option value="1">1 day before</option>
                  <option value="3">3 days before</option>
                  <option value="7">7 days before</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {saving ? 'Saving...' : editingSub ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
