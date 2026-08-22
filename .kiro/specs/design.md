# FinancialApp — Design Specification

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Date Handling | date-fns |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| AI | Amazon Bedrock (Converse API) |
| State Management | React hooks + Context |
| Form Handling | React Hook Form + Zod validation |

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx            # Sidebar + main layout
│   │   ├── page.tsx              # Dashboard
│   │   ├── transactions/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── budget/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── subscriptions/page.tsx
│   │   ├── savings/page.tsx
│   │   ├── advisor/page.tsx
│   │   ├── simulator/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                      # API routes
│   │   ├── ai/
│   │   │   ├── advisor/route.ts
│   │   │   └── simulator/route.ts
│   │   └── health-score/route.ts
│   ├── layout.tsx
│   └── page.tsx                  # Landing/redirect
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── layout/                   # Navigation, sidebar, etc.
│   ├── dashboard/                # Dashboard widgets
│   ├── transactions/             # Transaction components
│   ├── calendar/                 # Financial calendar
│   ├── budget/                   # Budget components
│   ├── assets/                   # Asset components
│   ├── subscriptions/            # Subscription components
│   ├── savings/                  # Savings goal components
│   ├── advisor/                  # AI advisor chat
│   ├── simulator/                # What-If simulator
│   └── reports/                  # Report charts
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Auth middleware
│   ├── bedrock/
│   │   ├── client.ts             # Bedrock client setup
│   │   ├── context.ts            # Financial context builder
│   │   └── prompts.ts            # System prompts
│   ├── calculations/
│   │   ├── budget.ts             # Budget calculations
│   │   ├── financial-health.ts   # Health score calculation
│   │   ├── savings.ts            # Savings projections
│   │   ├── debt.ts               # Debt repayment calculations
│   │   └── summary.ts           # Income/expense summaries
│   └── utils/
│       ├── currency.ts           # Currency formatting
│       ├── dates.ts              # Date utilities
│       └── validation.ts         # Input validation
├── hooks/                        # Custom React hooks
│   ├── useTransactions.ts
│   ├── useAssets.ts
│   ├── useBudget.ts
│   ├── useSubscriptions.ts
│   └── useSavingsGoals.ts
├── types/                        # TypeScript types
│   ├── database.ts
│   ├── transactions.ts
│   ├── assets.ts
│   ├── budget.ts
│   ├── subscriptions.ts
│   ├── savings.ts
│   └── ai.ts
└── styles/
    └── globals.css
```

## Database Schema

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  currency TEXT DEFAULT 'MYR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_category ON transactions(user_id, category);
CREATE INDEX idx_transactions_type ON transactions(user_id, transaction_type);
```

### assets
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  current_value NUMERIC(14,2) NOT NULL CHECK (current_value >= 0),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_user_id ON assets(user_id);
```

### asset_history
```sql
CREATE TABLE asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC(14,2) NOT NULL CHECK (value >= 0),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_history_asset ON asset_history(asset_id);
CREATE INDEX idx_asset_history_date ON asset_history(user_id, recorded_date);
```

### budgets
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('automatic', 'manual')),
  monthly_limit NUMERIC(12,2),
  daily_limit NUMERIC(12,2),
  weekly_limit NUMERIC(12,2),
  allocation_period TEXT CHECK (allocation_period IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### budget_alert_settings
```sql
CREATE TABLE budget_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage > 0 AND threshold_percentage <= 100),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, threshold_percentage)
);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_name TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  next_payment_date DATE NOT NULL,
  payment_method TEXT,
  auto_renewal BOOLEAN DEFAULT TRUE,
  reminder_days INTEGER DEFAULT 3,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_payment ON subscriptions(user_id, next_payment_date);
```

### savings_goals
```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_savings NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_savings >= 0),
  monthly_contribution NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
```

### debts
```sql
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_name TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  remaining_amount NUMERIC(14,2) NOT NULL CHECK (remaining_amount >= 0),
  interest_rate NUMERIC(5,2) DEFAULT 0,
  minimum_payment NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON debts(user_id);
```

### ai_conversations
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('advisor', 'simulator')),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
```

### ai_messages
```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
```

### financial_health_snapshots
```sql
CREATE TABLE financial_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  savings_rate_score INTEGER,
  expense_ratio_score INTEGER,
  budget_score INTEGER,
  emergency_fund_score INTEGER,
  debt_score INTEGER,
  subscription_score INTEGER,
  asset_growth_score INTEGER,
  cash_flow_score INTEGER,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_snapshots_user ON financial_health_snapshots(user_id, snapshot_date);
```

## Row Level Security Policies

All tables with user_id get RLS enabled:

```sql
-- Example for transactions (apply pattern to all user tables)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);
```

## API Architecture

### Client-Side Data (Supabase Direct)
- Transactions CRUD
- Assets CRUD
- Budget CRUD
- Subscriptions CRUD
- Savings Goals CRUD
- Debts CRUD

### Server API Routes (Next.js API)
- POST /api/ai/advisor — AI Financial Advisor chat
- POST /api/ai/simulator — What-If Simulator
- GET /api/health-score — Calculate financial health score

## Amazon Bedrock Integration

### Flow
1. User sends question via frontend
2. API route authenticates user via Supabase session
3. Retrieves relevant financial data from Supabase
4. Builds structured financial context
5. Calls Bedrock Converse API with system prompt + context + user message
6. Streams response back to frontend

### Model
- Primary: anthropic.claude-3-sonnet (or available model)
- Fallback: configurable via environment variable

### Context Builder
- Summarizes financial data into concise structured format
- Only includes data relevant to the user's question
- Never includes passwords, tokens, or secrets

## Financial Health Score Algorithm

Deterministic calculation (0-100):

| Factor | Weight | Scoring |
|--------|--------|---------|
| Savings Rate | 20% | >20%=full, >10%=partial, <5%=low |
| Expense-to-Income Ratio | 15% | <50%=full, <70%=partial, >90%=low |
| Budget Performance | 15% | Under budget=full, near=partial, over=low |
| Emergency Fund | 15% | >6mo expenses=full, >3mo=partial, <1mo=low |
| Debt Burden | 15% | No debt=full, <30% income=partial, >50%=low |
| Subscription Burden | 5% | <5% income=full, <10%=partial, >15%=low |
| Asset Growth | 10% | Growing=full, stable=partial, declining=low |
| Cash Flow Stability | 5% | Consistent positive=full, variable=partial, negative=low |

## UI Design Principles

- Modern fintech aesthetic with clean card-based layout
- Color coding: Green for income/positive, Red for expenses/negative, Blue for assets/neutral
- Strong visual hierarchy for financial data
- Compact number formatting: RM4.5K, RM35K
- Loading skeletons for async data
- Empty states with helpful guidance
- Responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
