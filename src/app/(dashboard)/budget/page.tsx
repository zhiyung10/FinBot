import { createClient } from '@/lib/supabase/server'
import BudgetContent from '@/components/budget/BudgetContent'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <BudgetContent userId={user.id} />
}
