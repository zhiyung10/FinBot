# FinancialApp — Requirements Specification

## Overview
FinancialApp is a personal finance management web application that helps users track income, expenses, assets, budgets, savings, subscriptions, financial goals, and debt repayment. It integrates Amazon Bedrock for AI-powered financial analysis and recommendations.

## Functional Requirements

### FR-1: Authentication
- Users can sign up with email/password
- Users can sign in/sign out
- All financial data is scoped to the authenticated user
- Session management with automatic token refresh

### FR-2: Transaction Management
- CRUD operations for income and expense transactions
- Transaction fields: id, user_id, transaction_type, title, amount, category, transaction_date, description, created_at, updated_at
- Income categories: Salary, Freelance, Business, Bonus, Commission, Rental Income, Investment Income, Passive Income, Other
- Expense categories: Food, Transportation, Housing, Utilities, Shopping, Entertainment, Education, Healthcare, Insurance, Investment, Subscription, Loan, Other
- Search, filter by category/type/date, sort by date/amount

### FR-3: Dashboard
- Summary cards: Total Income, Total Expenses, Current Balance, Total Assets, Total Savings, Monthly Budget Remaining, Savings Rate, Financial Health Score
- Widgets: Income vs Expenses chart, monthly spending progress, expense category breakdown, recent transactions, upcoming subscriptions, savings goal progress, AI financial insight, budget alerts, financial calendar preview
- Current Balance = Total Income - Total Expenses

### FR-4: Asset Management
- CRUD for assets with types: Cash, Savings Account, Fixed Deposit, EPF, Stocks, ETF, Cryptocurrency, Gold, Property, Vehicle, Retirement Fund, Other
- Asset fields: id, user_id, asset_name, asset_type, current_value, recorded_date, notes, created_at, updated_at
- Asset history tracking for value changes over time

### FR-5: Financial Calendar
- Monthly grid calendar displaying daily financial activity per date
- Each date cell shows: daily total income, daily total expenses, asset value/changes, optional net cash flow
- Click date to open detail panel with all transactions and assets for that day
- Add/edit/delete transactions from date detail
- Monthly summary above calendar: Monthly Income, Monthly Expenses, Monthly Net Cash Flow, Current Assets
- Navigation: previous/next month, today button, month/year selector
- Filters: All, Income Only, Expenses Only, Assets Only

### FR-6: Budget System
- Method 1 (Automatic): User sets monthly expense limit, system calculates daily/weekly breakdown
- Method 2 (Manual): User manually sets daily, weekly, monthly limits
- Budget alert thresholds configurable: 50%, 70%, 80%, 90%, 100%
- Smart budget monitoring: spending percentages, remaining budget, status indicators (Safe/Caution/High/Exceeded)

### FR-7: Subscription Manager
- CRUD for subscriptions with fields: name, category, amount, billing_frequency, next_payment_date, payment_method, auto_renewal, reminder_period, notes
- Billing frequencies: Daily, Weekly, Monthly, Quarterly, Yearly
- Upcoming payment display with countdown
- Monthly and annual cost calculations
- Reminders: same day, 1/3/7 days before, custom

### FR-8: Savings Goals
- CRUD for goals with fields: goal_name, target_amount, current_savings, monthly_contribution, target_date
- Progress tracking: completion percentage, remaining amount, required monthly savings, estimated completion date

### FR-9: AI Financial Advisor (Amazon Bedrock)
- Chat interface for financial questions
- System retrieves relevant financial data before calling Bedrock
- Conversation history maintained
- Streaming responses
- Context includes: income, expenses, assets, budgets, savings, subscriptions, goals, debts

### FR-10: What-If Financial Simulator
- AI-powered scenario analysis
- Retrieves user financial context for calculations
- Supports debt repayment scenarios, purchase affordability, income changes, expense reduction analysis
- Displays multiple strategies with risk levels

### FR-11: Financial Health Score
- Deterministic score calculation (0-100)
- Factors: savings rate, expense-to-income ratio, budget performance, emergency fund, debt burden, subscription burden, asset growth, cash flow stability
- AI explains score and provides recommendations

### FR-12: Financial Reports
- Report types: Income vs Expenses, Expense Category Analysis, Monthly Cash Flow, Savings Trend, Asset Growth, Budget Performance, Subscription Costs, Financial Health Score, Calendar Analysis
- Date range filters: This week, This month, Last month, 3/6/12 months, Custom

### FR-13: Settings
- Profile management
- Currency configuration (default MYR/RM)
- Budget preferences
- Notification preferences
- Theme preferences

## Non-Functional Requirements

### NFR-1: Security
- Supabase Row Level Security on all user tables
- Server-side validation
- AWS credentials never exposed to browser
- Supabase service-role key never exposed to browser
- Server-side Bedrock API calls only

### NFR-2: Performance
- Responsive UI with loading states
- Efficient database queries with proper indexes
- Streaming AI responses

### NFR-3: Responsive Design
- Desktop, tablet, mobile support
- Sidebar navigation on desktop
- Bottom/mobile-friendly navigation on small screens
- Calendar adapts to screen size

### NFR-4: Data Integrity
- No hardcoded financial values
- No mock data shown as real data
- Proper empty states
- Validated monetary inputs (no negatives unless designed, no NaN)
- Zero income handled safely

### NFR-5: Error Handling
- Graceful degradation when Bedrock is not configured
- Clear error messages
- Loading and error states for all data fetching
