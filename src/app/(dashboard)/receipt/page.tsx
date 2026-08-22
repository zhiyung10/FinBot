'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReceiptScanner from '@/components/receipt/ReceiptScanner'

export default function ReceiptPage() {
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

  return <ReceiptScanner userId={userId} />
}
