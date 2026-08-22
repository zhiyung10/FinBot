import { createClient } from '@/lib/supabase/server'
import AssetsContent from '@/components/assets/AssetsContent'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <AssetsContent userId={user.id} />
}
