'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch {
        router.replace('/login')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-content-bg)]">
      <div className="animate-pulse text-gray-500">Loading...</div>
    </div>
  )
}
