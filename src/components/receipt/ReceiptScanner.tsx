'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createWorker } from 'tesseract.js'
import { formatCurrency } from '@/lib/utils'
import { Upload, Camera, Loader2, Check, Receipt, X } from 'lucide-react'

interface ExtractedData {
  amounts: number[]
  totalAmount: number | null
  rawText: string
}

interface ReceiptScannerProps {
  userId: string
}

export default function ReceiptScanner({ userId }: ReceiptScannerProps) {
  const [image, setImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form for saving
  const [title, setTitle] = useState('')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const expenseCategories = [
    'Food', 'Transportation', 'Housing', 'Utilities', 'Shopping',
    'Entertainment', 'Education', 'Healthcare', 'Insurance',
    'Investment', 'Subscription', 'Loan', 'Other'
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      return
    }

    setError(null)
    setExtracted(null)
    setSaved(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!image) return

    setScanning(true)
    setProgress(0)
    setError(null)
    setExtracted(null)

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const { data: { text } } = await worker.recognize(image)
      await worker.terminate()

      // Extract amounts from the OCR text
      const amountPattern = /(?:RM|MYR|rm|\$)?\s*(\d{1,3}(?:[,. ]\d{3})*(?:\.\d{2})?)/g
      const matches: number[] = []
      let match

      while ((match = amountPattern.exec(text)) !== null) {
        const cleaned = match[1].replace(/[, ]/g, '')
        const num = parseFloat(cleaned)
        if (!isNaN(num) && num > 0 && num < 1000000) {
          matches.push(num)
        }
      }

      // Also try to find "TOTAL" line
      let totalAmount: number | null = null
      const totalPattern = /(?:total|grand total|amount due|jumlah|bayar)\s*[:\s]*(?:RM|MYR|rm|\$)?\s*(\d{1,3}(?:[,. ]\d{3})*(?:\.\d{2})?)/gi
      const totalMatch = totalPattern.exec(text)
      if (totalMatch) {
        const cleaned = totalMatch[1].replace(/[, ]/g, '')
        totalAmount = parseFloat(cleaned)
      }

      // If no total found, pick the largest amount
      if (!totalAmount && matches.length > 0) {
        totalAmount = Math.max(...matches)
      }

      setExtracted({
        amounts: [...new Set(matches)].sort((a, b) => b - a),
        totalAmount,
        rawText: text,
      })

      if (totalAmount) {
        setSelectedAmount(totalAmount)
      }
    } catch (err) {
      console.error('OCR Error:', err)
      setError('Failed to scan receipt. Please try a clearer image.')
    } finally {
      setScanning(false)
      setProgress(0)
    }
  }

  const handleSave = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      setError('Please select a valid amount')
      return
    }
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: 'expense',
        title: title.trim(),
        amount: selectedAmount,
        category,
        transaction_date: date,
        description: 'Scanned from receipt',
      })

      if (insertError) throw insertError

      setSaved(true)
      setTimeout(() => {
        // Reset for next scan
        setImage(null)
        setExtracted(null)
        setSaved(false)
        setTitle('')
        setSelectedAmount(null)
      }, 2000)
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save transaction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setImage(null)
    setExtracted(null)
    setError(null)
    setSaved(false)
    setTitle('')
    setSelectedAmount(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receipt Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a receipt photo to extract the amount and save it as an expense.
        </p>
      </div>

      {/* Upload Area */}
      {!image && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border-2 border-dashed border-gray-300 hover:border-[var(--color-accent)] cursor-pointer transition text-center"
        >
          <Upload size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Upload Receipt</p>
          <p className="text-sm text-gray-500 mt-1">
            Click here or drag and drop an image of your receipt
          </p>
          <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG, WEBP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Image Preview */}
      {image && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Receipt Image</h3>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-gray-100 max-h-64 flex items-center justify-center">
            <img
              src={image}
              alt="Receipt"
              className="max-h-64 object-contain"
            />
          </div>

          {!extracted && !scanning && (
            <button
              onClick={handleScan}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white py-3 rounded-xl font-medium transition"
            >
              <Camera size={18} />
              Scan Receipt
            </button>
          )}

          {scanning && (
            <div className="mt-4 text-center">
              <Loader2 size={24} className="animate-spin text-[var(--color-accent)] mx-auto mb-2" />
              <p className="text-sm text-gray-600">Scanning receipt... {progress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted Results */}
      {extracted && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Receipt size={16} />
            Extracted Amounts
          </h3>

          {extracted.totalAmount && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium">Detected Total</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(extracted.totalAmount)}
              </p>
            </div>
          )}

          {extracted.amounts.length > 1 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">All detected amounts (click to select):</p>
              <div className="flex flex-wrap gap-2">
                {extracted.amounts.map((amt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                      selectedAmount === amt
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {extracted.amounts.length === 0 && (
            <p className="text-sm text-gray-500">
              No amounts detected. You can enter the amount manually below.
            </p>
          )}

          {/* Save Form */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Save as Expense</h4>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grocery shopping, Lunch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={selectedAmount ?? ''}
                onChange={(e) => setSelectedAmount(parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
              >
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            {saved ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600">
                <Check size={18} />
                <span className="text-sm font-medium">Saved successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !selectedAmount || !title.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Check size={16} /> Save Expense</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
