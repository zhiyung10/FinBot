'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavingsGoal, Debt } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'
import { differenceInMonths } from 'date-fns'
import { Plus, Trash2, Pencil, Target, X, AlertCircle } from 'lucide-react'

interface SavingsContentProps {
  userId: string
}

export default function SavingsContent({ userId }: SavingsContentProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  // Goal form
  const [gName, setGName] = useState('')
  const [gTarget, setGTarget] = useState('')
  const [gCurrent, setGCurrent] = useState('')
  const [gMonthly, setGMonthly] = useState('')
  const [gDate, setGDate] = useState('')
  const [gError, setGError] = useState<string | null>(null)

  // Debt form
  const [dName, setDName] = useState('')
  const [dTotal, setDTotal] = useState('')
  const [dRemaining, setDRemaining] = useState('')
  const [dRate, setDRate] = useState('')
  const [dMinPayment, setDMinPayment] = useState('')
  const [dDue, setDDue] = useState('')
  const [dNotes, setDNotes] = useState('')
  const [dError, setDError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [goalsRes, debtsRes] = await Promise.all([
        supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('debts').select('*').eq('user_id', userId).order('remaining_amount', { ascending: false }),
      ])
      setGoals(goalsRes.data ?? [])
      setDebts(debtsRes.data ?? [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  // Goal CRUD
  const resetGoalForm = () => { setGName(''); setGTarget(''); setGCurrent(''); setGMonthly(''); setGDate(''); setGError(null); setEditingGoal(null) }

  const handleEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g); setGName(g.goal_name); setGTarget(g.target_amount.toString())
    setGCurrent(g.current_savings.toString()); setGMonthly(g.monthly_contribution.toString())
    setGDate(g.target_date ?? ''); setShowGoalForm(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault(); setGError(null); setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: userId, goal_name: gName.trim(),
      target_amount: parseFloat(gTarget), current_savings: parseFloat(gCurrent) || 0,
      monthly_contribution: parseFloat(gMonthly) || 0, target_date: gDate || null,
    }
    const { error } = editingGoal
      ? await supabase.from('savings_goals').update(payload).eq('id', editingGoal.id).eq('user_id', userId)
      : await supabase.from('savings_goals').insert(payload)
    if (error) { setGError(error.message); setSaving(false); return }
    resetGoalForm(); setShowGoalForm(false); setSaving(false); fetchData()
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    const supabase = createClient()
    await supabase.from('savings_goals').delete().eq('id', id).eq('user_id', userId)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  // Debt CRUD
  const resetDebtForm = () => { setDName(''); setDTotal(''); setDRemaining(''); setDRate(''); setDMinPayment(''); setDDue(''); setDNotes(''); setDError(null); setEditingDebt(null) }

  const handleEditDebt = (d: Debt) => {
    setEditingDebt(d); setDName(d.debt_name); setDTotal(d.total_amount.toString())
    setDRemaining(d.remaining_amount.toString()); setDRate(d.interest_rate.toString())
    setDMinPayment(d.minimum_payment.toString()); setDDue(d.due_date ?? ''); setDNotes(d.notes ?? '')
    setShowDebtForm(true)
  }

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault(); setDError(null); setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: userId, debt_name: dName.trim(),
      total_amount: parseFloat(dTotal), remaining_amount: parseFloat(dRemaining),
      interest_rate: parseFloat(dRate) || 0, minimum_payment: parseFloat(dMinPayment) || 0,
      due_date: dDue || null, notes: dNotes.trim() || null,
    }
    const { error } = editingDebt
      ? await supabase.from('debts').update(payload).eq('id', editingDebt.id).eq('user_id', userId)
      : await supabase.from('debts').insert(payload)
    if (error) { setDError(error.message); setSaving(false); return }
    resetDebtForm(); setShowDebtForm(false); setSaving(false); fetchData()
  }

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Delete this debt?')) return
    const supabase = createClient()
    await supabase.from('debts').delete().eq('id', id).eq('user_id', userId)
    setDebts(prev => prev.filter(d => d.id !== id))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Savings & Debt</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Savings Goals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <button onClick={() => { resetGoalForm(); setShowGoalForm(true) }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={18} /><span className="hidden sm:inline">Add Goal</span>
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <Target size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No savings goals yet. Set your first financial target.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_savings / goal.target_amount) * 100, 100) : 0
              const remaining = goal.target_amount - goal.current_savings
              const monthsToGoal = goal.monthly_contribution > 0 ? Math.ceil(remaining / goal.monthly_contribution) : null
              const etaText = monthsToGoal !== null ? (monthsToGoal <= 1 ? 'Less than 1 month' : `~${monthsToGoal} months`) : null

              return (
                <div key={goal.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.goal_name}</h3>
                      {goal.target_date && <p className="text-xs text-gray-500">Target: {new Date(goal.target_date).toLocaleDateString('en-MY')}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditGoal(goal)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">{pct.toFixed(0)}%</span>
                      <span className="text-gray-700 font-medium">{formatCurrency(goal.current_savings)} / {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Remaining: {formatCurrency(remaining)}</span>
                    {etaText && <span>ETA: {etaText}</span>}
                  </div>
                  {goal.monthly_contribution > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Contributing {formatCurrency(goal.monthly_contribution)}/month</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Debts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Debt Management</h2>
          <button onClick={() => { resetDebtForm(); setShowDebtForm(true) }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={18} /><span className="hidden sm:inline">Add Debt</span>
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <AlertCircle size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No debts recorded. Great financial health!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map(debt => {
              const paidPct = debt.total_amount > 0 ? ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100 : 0
              const monthsToRepay = debt.minimum_payment > 0 ? Math.ceil(debt.remaining_amount / debt.minimum_payment) : null

              return (
                <div key={debt.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{debt.debt_name}</h3>
                      <p className="text-xs text-gray-500">
                        {debt.interest_rate > 0 ? `${debt.interest_rate}% interest` : 'No interest'}
                        {debt.due_date && ` · Due: ${new Date(debt.due_date).toLocaleDateString('en-MY')}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditDebt(debt)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteDebt(debt.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">{paidPct.toFixed(0)}% paid</span>
                      <span className="font-medium text-red-600">{formatCurrency(debt.remaining_amount)} remaining</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total: {formatCurrency(debt.total_amount)}</span>
                    {debt.minimum_payment > 0 && <span>Min payment: {formatCurrency(debt.minimum_payment)}/mo</span>}
                  </div>
                  {monthsToRepay && <p className="text-xs text-gray-400 mt-1">~{monthsToRepay} months to repay at minimum</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editingGoal ? 'Edit Goal' : 'Add Savings Goal'}</h2>
              <button onClick={() => { setShowGoalForm(false); resetGoalForm() }}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveGoal} className="p-5 space-y-4">
              {gError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{gError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
                <input type="text" value={gName} onChange={e => setGName(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Emergency Fund" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (RM)</label>
                <input type="number" step="0.01" min="1" value={gTarget} onChange={e => setGTarget(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Savings (RM)</label>
                <input type="number" step="0.01" min="0" value={gCurrent} onChange={e => setGCurrent(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution (RM)</label>
                <input type="number" step="0.01" min="0" value={gMonthly} onChange={e => setGMonthly(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                <input type="date" value={gDate} onChange={e => setGDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowGoalForm(false); resetGoalForm() }} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editingGoal ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Form Modal */}
      {showDebtForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editingDebt ? 'Edit Debt' : 'Add Debt'}</h2>
              <button onClick={() => { setShowDebtForm(false); resetDebtForm() }}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveDebt} className="p-5 space-y-4">
              {dError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{dError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Debt Name</label>
                <input type="text" value={dName} onChange={e => setDName(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., PTPTN" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (RM)</label>
                <input type="number" step="0.01" min="1" value={dTotal} onChange={e => setDTotal(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount (RM)</label>
                <input type="number" step="0.01" min="0" value={dRemaining} onChange={e => setDRemaining(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                <input type="number" step="0.01" min="0" value={dRate} onChange={e => setDRate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimum Monthly Payment (RM)</label>
                <input type="number" step="0.01" min="0" value={dMinPayment} onChange={e => setDMinPayment(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={dDue} onChange={e => setDDue(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={dNotes} onChange={e => setDNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowDebtForm(false); resetDebtForm() }} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editingDebt ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
