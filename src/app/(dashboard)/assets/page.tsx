'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AssetsContent from '@/components/assets/AssetsContent'

export default function AssetsPage() {
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

  return <AssetsContent userId={userId} />
}
