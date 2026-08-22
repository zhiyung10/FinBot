import { createClient } from '@/lib/supabase/server'
import SubscriptionsContent from '@/components/subscriptions/SubscriptionsContent'

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <SubscriptionsContent userId={user.id} />
}
