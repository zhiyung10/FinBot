'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Asset, AssetType } from '@/types/database'
import { X } from 'lucide-react'

const assetTypes: AssetType[] = [
  'Cash', 'Savings Account', 'Fixed Deposit', 'EPF', 'Stocks',
  'ETF', 'Cryptocurrency', 'Gold', 'Property', 'Vehicle',
  'Retirement Fund', 'Other'
]

interface AssetFormProps {
  userId: string
  asset?: Asset | null
  onClose: () => void
  onSuccess: () => void
}

export default function AssetForm({ userId, asset, onClose, onSuccess }: AssetFormProps) {
  const isEditing = !!asset
  const [assetName, setAssetName] = useState(asset?.asset_name ?? '')
  const [assetType, setAssetType] = useState<AssetType | ''>(asset?.asset_type ?? '')
  const [currentValue, setCurrentValue] = useState(asset?.current_value?.toString() ?? '')
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedValue = parseFloat(currentValue)
    if (isNaN(parsedValue) || parsedValue < 0) {
      setError('Value must be a non-negative number')
      return
    }

    if (!assetType) {
      setError('Please select an asset type')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const payload = {
      user_id: userId,
      asset_name: assetName.trim(),
      asset_type: assetType,
      current_value: parsedValue,
      recorded_date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || null,
    }

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('assets')
        .update(payload)
        .eq('id', asset.id)
        .eq('user_id', userId)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Record history if value changed
      if (Number(asset.current_value) !== parsedValue) {
        await supabase.from('asset_history').insert({
          asset_id: asset.id,
          user_id: userId,
          value: parsedValue,
          recorded_date: new Date().toISOString().split('T')[0],
        })
      }
    } else {
      const { data: newAsset, error: insertError } = await supabase
        .from('assets')
        .insert(payload)
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Record initial history
      if (newAsset) {
        await supabase.from('asset_history').insert({
          asset_id: newAsset.id,
          user_id: userId,
          value: parsedValue,
          recorded_date: new Date().toISOString().split('T')[0],
        })
      }
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Asset' : 'Add Asset'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="assetName" className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name
            </label>
            <input
              id="assetName"
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., My Savings, EPF Account"
            />
          </div>

          <div>
            <label htmlFor="assetType" className="block text-sm font-medium text-gray-700 mb-1">
              Asset Type
            </label>
            <select
              id="assetType"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select type</option>
              {assetTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="currentValue" className="block text-sm font-medium text-gray-700 mb-1">
              Current Value (RM)
            </label>
            <input
              id="currentValue"
              type="number"
              step="0.01"
              min="0"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Additional notes about this asset..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
