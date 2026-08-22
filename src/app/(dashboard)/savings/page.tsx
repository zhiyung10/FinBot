'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SavingsContent from '@/components/savings/SavingsContent'

export default function SavingsPage() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  if (!userId) return null

  return <SavingsContent userId={userId} />
}
