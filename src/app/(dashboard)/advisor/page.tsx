'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    // Simulated response — in production, this calls the Bedrock API via a backend
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'AI Financial Advisor requires a server-side backend (e.g., Vercel, AWS Lambda) to securely call Amazon Bedrock. GitHub Pages only serves static files. To enable this feature, deploy with a server-capable platform or add an external API endpoint.'
      }])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Financial Advisor</h1>

      {/* Info banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-700">
          AI features require a server backend for secure API calls. This is a static deployment preview.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <Bot size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">How can I help with your finances?</p>
            <p className="text-sm mt-2">Try asking:</p>
            <div className="mt-3 space-y-2">
              {[
                'Why am I spending so much this month?',
                'How much should I save every month?',
                'Can I afford a car?',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block mx-auto text-sm text-[var(--color-accent)] hover:underline"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="p-2 rounded-full bg-[var(--color-accent)]/10 h-fit">
                <Bot size={16} className="text-[var(--color-accent)]" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-gray-100 text-gray-900'
            )}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="p-2 rounded-full bg-gray-100 h-fit">
                <User size={16} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full bg-[var(--color-accent)]/10 h-fit">
              <Bot size={16} className="text-[var(--color-accent)]" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={loading}
          className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
