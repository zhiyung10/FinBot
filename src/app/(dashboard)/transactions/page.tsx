import { createClient } from '@/lib/supabase/server'
import TransactionsContent from '@/components/transactions/TransactionsContent'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <TransactionsContent userId={user.id} />
}
