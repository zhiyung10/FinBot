/**
 * Deterministic Financial Health Score Calculator (0-100)
 * 
 * Weights:
 * - Savings Rate: 20%
 * - Expense-to-Income Ratio: 15%
 * - Budget Performance: 15%
 * - Emergency Fund: 15%
 * - Debt Burden: 15%
 * - Subscription Burden: 5%
 * - Asset Growth: 10%
 * - Cash Flow Stability: 5%
 */

interface HealthScoreInput {
  monthlyIncome: number
  monthlyExpenses: number
  monthlyBudget: number | null
  emergencyFundTarget: number // typically 6 months expenses
  currentSavings: number
  totalDebtPayments: number // monthly debt payments
  monthlySubscriptionCost: number
  totalAssets: number
  previousMonthAssets: number // for growth calculation
  previousMonthIncome: number // for stability
}

interface HealthScoreResult {
  score: number
  savingsRateScore: number
  expenseRatioScore: number
  budgetScore: number
  emergencyFundScore: number
  debtScore: number
  subscriptionScore: number
  assetGrowthScore: number
  cashFlowScore: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlyBudget,
    currentSavings,
    emergencyFundTarget,
    totalDebtPayments,
    monthlySubscriptionCost,
    totalAssets,
    previousMonthAssets,
    previousMonthIncome,
  } = input

  // 1. Savings Rate (20%) — Target: >20% = 100, >10% = 70, >5% = 40, <5% = 20
  let savingsRateScore = 0
  if (monthlyIncome > 0) {
    const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
    if (savingsRate >= 20) savingsRateScore = 100
    else if (savingsRate >= 10) savingsRateScore = 70
    else if (savingsRate >= 5) savingsRateScore = 40
    else if (savingsRate > 0) savingsRateScore = 20
    else savingsRateScore = 0
  }

  // 2. Expense-to-Income Ratio (15%) — Target: <50% = 100, <70% = 70, <90% = 40
  let expenseRatioScore = 0
  if (monthlyIncome > 0) {
    const ratio = (monthlyExpenses / monthlyIncome) * 100
    if (ratio <= 50) expenseRatioScore = 100
    else if (ratio <= 70) expenseRatioScore = 70
    else if (ratio <= 90) expenseRatioScore = 40
    else expenseRatioScore = 10
  }

  // 3. Budget Performance (15%)
  let budgetScore = 50 // default if no budget set
  if (monthlyBudget !== null && monthlyBudget > 0) {
    const budgetUsage = (monthlyExpenses / monthlyBudget) * 100
    if (budgetUsage <= 80) budgetScore = 100
    else if (budgetUsage <= 100) budgetScore = 70
    else if (budgetUsage <= 120) budgetScore = 30
    else budgetScore = 0
  }

  // 4. Emergency Fund (15%) — Target: 6 months expenses
  let emergencyFundScore = 0
  const target = emergencyFundTarget > 0 ? emergencyFundTarget : monthlyExpenses * 6
  if (target > 0) {
    const fundRatio = (currentSavings / target) * 100
    if (fundRatio >= 100) emergencyFundScore = 100
    else if (fundRatio >= 50) emergencyFundScore = 70
    else if (fundRatio >= 25) emergencyFundScore = 40
    else emergencyFundScore = 10
  }

  // 5. Debt Burden (15%) — Target: <30% of income
  let debtScore = 100 // no debt = perfect
  if (monthlyIncome > 0 && totalDebtPayments > 0) {
    const debtRatio = (totalDebtPayments / monthlyIncome) * 100
    if (debtRatio <= 10) debtScore = 90
    else if (debtRatio <= 30) debtScore = 60
    else if (debtRatio <= 50) debtScore = 30
    else debtScore = 10
  }

  // 6. Subscription Burden (5%) — Target: <5% of income
  let subscriptionScore = 100
  if (monthlyIncome > 0 && monthlySubscriptionCost > 0) {
    const subRatio = (monthlySubscriptionCost / monthlyIncome) * 100
    if (subRatio <= 5) subscriptionScore = 100
    else if (subRatio <= 10) subscriptionScore = 60
    else if (subRatio <= 15) subscriptionScore = 30
    else subscriptionScore = 10
  }

  // 7. Asset Growth (10%)
  let assetGrowthScore = 50 // default
  if (previousMonthAssets > 0) {
    const growth = ((totalAssets - previousMonthAssets) / previousMonthAssets) * 100
    if (growth > 5) assetGrowthScore = 100
    else if (growth > 0) assetGrowthScore = 70
    else if (growth === 0) assetGrowthScore = 50
    else assetGrowthScore = 20
  } else if (totalAssets > 0) {
    assetGrowthScore = 70 // has assets but no history
  }

  // 8. Cash Flow Stability (5%)
  let cashFlowScore = 50
  if (previousMonthIncome > 0 && monthlyIncome > 0) {
    const variance = Math.abs(monthlyIncome - previousMonthIncome) / previousMonthIncome * 100
    if (variance <= 5) cashFlowScore = 100
    else if (variance <= 15) cashFlowScore = 70
    else if (variance <= 30) cashFlowScore = 40
    else cashFlowScore = 20
  } else if (monthlyIncome > 0) {
    cashFlowScore = 60
  }

  // Weighted final score
  const score = Math.round(
    savingsRateScore * 0.20 +
    expenseRatioScore * 0.15 +
    budgetScore * 0.15 +
    emergencyFundScore * 0.15 +
    debtScore * 0.15 +
    subscriptionScore * 0.05 +
    assetGrowthScore * 0.10 +
    cashFlowScore * 0.05
  )

  return {
    score: clamp(score, 0, 100),
    savingsRateScore: Math.round(savingsRateScore),
    expenseRatioScore: Math.round(expenseRatioScore),
    budgetScore: Math.round(budgetScore),
    emergencyFundScore: Math.round(emergencyFundScore),
    debtScore: Math.round(debtScore),
    subscriptionScore: Math.round(subscriptionScore),
    assetGrowthScore: Math.round(assetGrowthScore),
    cashFlowScore: Math.round(cashFlowScore),
  }
}
