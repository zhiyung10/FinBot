import { createClient } from '@supabase/supabase-js'

interface FinancialContext {
  monthlyIncome: number
  monthlyExpenses: number
  essentialExpenses: number
  nonEssentialExpenses: number
  monthlySubscriptions: number
  totalSavings: number
  totalAssets: number
  monthlyBudget: number | null
  remainingBudget: number | null
  debts: { name: string; remaining: number; minimumPayment: number; interestRate: number }[]
  savingsGoals: { name: string; target: number; current: number; monthly: number }[]
  topExpenseCategories: { category: string; amount: number }[]
  recentTransactions: { title: string; type: string; amount: number; category: string; date: string }[]
}

const ESSENTIAL_CATEGORIES = ['Housing', 'Utilities', 'Food', 'Transportation', 'Healthcare', 'Insurance']

export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Fetch monthly transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth)

  const monthlyIncome = transactions
    ?.filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

  const monthlyExpenses = transactions
    ?.filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

  const essentialExpenses = transactions
    ?.filter(t => t.transaction_type === 'expense' && ESSENTIAL_CATEGORIES.includes(t.category))
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

  const nonEssentialExpenses = monthlyExpenses - essentialExpenses

  // Category breakdown
  const categoryMap = new Map<string, number>()
  transactions
    ?.filter(t => t.transaction_type === 'expense')
    .forEach(t => {
      const current = categoryMap.get(t.category) ?? 0
      categoryMap.set(t.category, current + Number(t.amount))
    })
  const topExpenseCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Recent transactions
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('title, transaction_type, amount, category, transaction_date')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .limit(10)

  const recentTransactions = recentTx?.map(t => ({
    title: t.title,
    type: t.transaction_type,
    amount: Number(t.amount),
    category: t.category,
    date: t.transaction_date,
  })) ?? []

  // Subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('amount, billing_frequency')
    .eq('user_id', userId)
    .eq('is_active', true)

  const monthlySubscriptions = subs?.reduce((sum, s) => {
    switch (s.billing_frequency) {
      case 'daily': return sum + Number(s.amount) * 30
      case 'weekly': return sum + Number(s.amount) * 4.33
      case 'monthly': return sum + Number(s.amount)
      case 'quarterly': return sum + Number(s.amount) / 3
      case 'yearly': return sum + Number(s.amount) / 12
      default: return sum
    }
  }, 0) ?? 0

  // Assets
  const { data: assets } = await supabase
    .from('assets')
    .select('current_value')
    .eq('user_id', userId)

  const totalAssets = assets?.reduce((sum, a) => sum + Number(a.current_value), 0) ?? 0

  // Savings goals
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('goal_name, target_amount, current_savings, monthly_contribution')
    .eq('user_id', userId)

  const savingsGoals = goals?.map(g => ({
    name: g.goal_name,
    target: Number(g.target_amount),
    current: Number(g.current_savings),
    monthly: Number(g.monthly_contribution),
  })) ?? []

  const totalSavings = savingsGoals.reduce((sum, g) => sum + g.current, 0)

  // Budget
  const { data: budget } = await supabase
    .from('budgets')
    .select('monthly_limit')
    .eq('user_id', userId)
    .single()

  const monthlyBudget = budget?.monthly_limit ? Number(budget.monthly_limit) : null
  const remainingBudget = monthlyBudget !== null ? monthlyBudget - monthlyExpenses : null

  // Debts
  const { data: debtData } = await supabase
    .from('debts')
    .select('debt_name, remaining_amount, minimum_payment, interest_rate')
    .eq('user_id', userId)

  const debts = debtData?.map(d => ({
    name: d.debt_name,
    remaining: Number(d.remaining_amount),
    minimumPayment: Number(d.minimum_payment),
    interestRate: Number(d.interest_rate),
  })) ?? []

  return {
    monthlyIncome,
    monthlyExpenses,
    essentialExpenses,
    nonEssentialExpenses,
    monthlySubscriptions,
    totalSavings,
    totalAssets,
    monthlyBudget,
    remainingBudget,
    debts,
    savingsGoals,
    topExpenseCategories,
    recentTransactions,
  }
}

export function formatContextForPrompt(ctx: FinancialContext): string {
  let text = `USER FINANCIAL CONTEXT\n\n`
  text += `Monthly Income: RM${ctx.monthlyIncome.toLocaleString()}\n`
  text += `Monthly Expenses: RM${ctx.monthlyExpenses.toLocaleString()}\n`
  text += `Essential Expenses: RM${ctx.essentialExpenses.toLocaleString()}\n`
  text += `Non-Essential Expenses: RM${ctx.nonEssentialExpenses.toLocaleString()}\n`
  text += `Monthly Subscriptions: RM${ctx.monthlySubscriptions.toLocaleString()}\n`
  text += `Total Savings: RM${ctx.totalSavings.toLocaleString()}\n`
  text += `Total Assets: RM${ctx.totalAssets.toLocaleString()}\n`

  if (ctx.monthlyBudget !== null) {
    text += `Monthly Budget: RM${ctx.monthlyBudget.toLocaleString()}\n`
    text += `Remaining Budget: RM${(ctx.remainingBudget ?? 0).toLocaleString()}\n`
  }

  if (ctx.debts.length > 0) {
    text += `\nDEBTS:\n`
    ctx.debts.forEach(d => {
      text += `- ${d.name}: RM${d.remaining.toLocaleString()} remaining (${d.interestRate}% interest, min RM${d.minimumPayment}/mo)\n`
    })
  }

  if (ctx.savingsGoals.length > 0) {
    text += `\nSAVINGS GOALS:\n`
    ctx.savingsGoals.forEach(g => {
      text += `- ${g.name}: RM${g.current.toLocaleString()} / RM${g.target.toLocaleString()} (RM${g.monthly}/mo contribution)\n`
    })
  }

  if (ctx.topExpenseCategories.length > 0) {
    text += `\nTOP EXPENSE CATEGORIES:\n`
    ctx.topExpenseCategories.forEach(c => {
      text += `- ${c.category}: RM${c.amount.toLocaleString()}\n`
    })
  }

  return text
}
