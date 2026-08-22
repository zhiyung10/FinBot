export type TransactionType = 'income' | 'expense'

export type IncomeCategory =
  | 'Salary'
  | 'Freelance'
  | 'Business'
  | 'Bonus'
  | 'Commission'
  | 'Rental Income'
  | 'Investment Income'
  | 'Passive Income'
  | 'Other'

export type ExpenseCategory =
  | 'Food'
  | 'Transportation'
  | 'Housing'
  | 'Utilities'
  | 'Shopping'
  | 'Entertainment'
  | 'Education'
  | 'Healthcare'
  | 'Insurance'
  | 'Investment'
  | 'Subscription'
  | 'Loan'
  | 'Other'

export type AssetType =
  | 'Cash'
  | 'Savings Account'
  | 'Fixed Deposit'
  | 'EPF'
  | 'Stocks'
  | 'ETF'
  | 'Cryptocurrency'
  | 'Gold'
  | 'Property'
  | 'Vehicle'
  | 'Retirement Fund'
  | 'Other'

export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type BudgetType = 'automatic' | 'manual'

export type AllocationPeriod = 'daily' | 'weekly' | 'monthly'

export type ConversationType = 'advisor' | 'simulator'

export type MessageRole = 'user' | 'assistant'

export interface Profile {
  id: string
  full_name: string | null
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  transaction_type: TransactionType
  title: string
  amount: number
  category: string
  transaction_date: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  user_id: string
  asset_name: string
  asset_type: AssetType
  current_value: number
  recorded_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AssetHistory {
  id: string
  asset_id: string
  user_id: string
  value: number
  recorded_date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  budget_type: BudgetType
  monthly_limit: number | null
  daily_limit: number | null
  weekly_limit: number | null
  allocation_period: AllocationPeriod | null
  created_at: string
  updated_at: string
}

export interface BudgetAlertSetting {
  id: string
  user_id: string
  threshold_percentage: number
  is_enabled: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  subscription_name: string
  category: string | null
  amount: number
  billing_frequency: BillingFrequency
  next_payment_date: string
  payment_method: string | null
  auto_renewal: boolean
  reminder_days: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  goal_name: string
  target_amount: number
  current_savings: number
  monthly_contribution: number
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  debt_name: string
  total_amount: number
  remaining_amount: number
  interest_rate: number
  minimum_payment: number
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AIConversation {
  id: string
  user_id: string
  conversation_type: ConversationType
  title: string | null
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  user_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface FinancialHealthSnapshot {
  id: string
  user_id: string
  score: number
  savings_rate_score: number | null
  expense_ratio_score: number | null
  budget_score: number | null
  emergency_fund_score: number | null
  debt_score: number | null
  subscription_score: number | null
  asset_growth_score: number | null
  cash_flow_score: number | null
  snapshot_date: string
  created_at: string
}
