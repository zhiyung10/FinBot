'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Menu } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-content-bg)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--color-sidebar)] border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/70 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-white">FinancialApp</h1>
          <div className="w-6" />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
