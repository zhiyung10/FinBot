'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Calendar,
  Bot,
  BarChart3,
} from 'lucide-react'

const bottomNavItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/advisor', label: 'AI Advisor', icon: Bot },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-sidebar)] border-t border-white/10 z-30 lg:hidden">
      <ul className="flex items-center justify-around py-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors',
                  isActive ? 'text-[var(--color-accent-light)]' : 'text-white/50'
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
