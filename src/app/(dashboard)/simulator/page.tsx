'use client'

import { useState } from 'react'
import { FlaskConical, Send, AlertCircle } from 'lucide-react'

export default function SimulatorPage() {
  const [scenario, setScenario] = useState('')
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scenario.trim() || loading) return

    setError(null)
    setAnalysis(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.notConfigured) setNotConfigured(true)
        throw new Error(data.error || 'Failed to simulate')
      }

      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const exampleScenarios = [
    'My PTPTN balance is RM40,000. Based on my income and expenses, what is the maximum I can repay monthly?',
    'If I buy a RM3,000 laptop, how will it affect my savings?',
    'Can I afford a RM500 monthly car payment?',
    'If my salary increases by RM800, how should I allocate it?',
    'If I reduce food expenses by RM200, how much will I save in one year?',
    'What happens if my income drops by 20%?',
  ]

  if (notConfigured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">What-If Simulator</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle size={48} className="text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Not Configured</h3>
          <p className="text-yellow-700 text-sm">
            Amazon Bedrock credentials are not configured. Please set AWS_ACCESS_KEY_ID and
            AWS_SECRET_ACCESS_KEY in your environment variables to enable the What-If Simulator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What-If Simulator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore financial scenarios using your real data.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSimulate} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe your financial scenario
        </label>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={4}
          placeholder="e.g., If I want to save RM20,000 for a house deposit in 3 years, how much should I save monthly?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
        <button
          type="submit"
          disabled={loading || !scenario.trim()}
          className="mt-3 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? (
            <>Analyzing...</>
          ) : (
            <><FlaskConical size={16} /> Simulate</>
          )}
        </button>
      </form>

      {/* Example Scenarios */}
      {!analysis && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Example Scenarios</h3>
          <div className="space-y-2">
            {exampleScenarios.map((s, i) => (
              <button
                key={i}
                onClick={() => setScenario(s)}
                className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={20} className="text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Simulation Result</h3>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {analysis}
          </div>
        </div>
      )}
    </div>
  )
}
