'use client'

import { useState } from 'react'
import { FlaskConical, AlertCircle } from 'lucide-react'

export default function SimulatorPage() {
  const [scenario, setScenario] = useState('')

  const exampleScenarios = [
    'My PTPTN balance is RM40,000. Based on my income and expenses, what is the maximum I can repay monthly?',
    'If I buy a RM3,000 laptop, how will it affect my savings?',
    'Can I afford a RM500 monthly car payment?',
    'If my salary increases by RM800, how should I allocate it?',
    'What happens if my income drops by 20%?',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What-If Simulator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore financial scenarios using your real data.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-700">
          AI simulation requires a server backend for secure Amazon Bedrock API calls. This feature will be available when deployed with a server-capable platform.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe your financial scenario
        </label>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={4}
          placeholder="e.g., If I want to save RM20,000 for a house deposit in 3 years, how much should I save monthly?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none resize-none"
        />
        <button
          disabled
          className="mt-3 flex items-center gap-2 bg-purple-600/50 text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed"
        >
          <FlaskConical size={16} /> Simulate (requires server)
        </button>
      </div>

      {/* Example Scenarios */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Example Scenarios</h3>
        <div className="space-y-2">
          {exampleScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => setScenario(s)}
              className="block w-full text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 px-3 py-2 rounded-lg transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
