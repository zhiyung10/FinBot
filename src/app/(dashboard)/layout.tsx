'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
        } else {
          setAuthenticated(true)
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-content-bg)]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!authenticated) return null

  return <AppShell>{children}</AppShell>
}
