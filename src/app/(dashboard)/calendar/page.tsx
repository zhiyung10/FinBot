import { createClient } from '@/lib/supabase/server'
import CalendarContent from '@/components/calendar/CalendarContent'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <CalendarContent userId={user.id} />
}
