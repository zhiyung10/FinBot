import { createClient } from '@/lib/supabase/server'
import SavingsContent from '@/components/savings/SavingsContent'

export default async function SavingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <SavingsContent userId={user.id} />
}
