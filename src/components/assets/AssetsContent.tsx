'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Asset } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil, Landmark, TrendingUp } from 'lucide-react'
import AssetForm from './AssetForm'

interface AssetsContentProps {
  userId: string
}

export default function AssetsContent({ userId }: AssetsContentProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('current_value', { ascending: false })

      if (error) throw error
      setAssets(data ?? [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (!error) {
      setAssets(prev => prev.filter(a => a.id !== id))
    }
  }

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingAsset(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    fetchAssets()
  }

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.current_value), 0)

  // Group assets by type
  const assetsByType = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) {
      acc[asset.asset_type] = []
    }
    acc[asset.asset_type].push(asset)
    return acc
  }, {} as Record<string, Asset[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          {assets.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Total: {formatCurrency(totalAssets)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[#5b54e6] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Asset</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/60 text-center">
          <Landmark size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No assets recorded yet. Add your first asset to start tracking your net worth.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(assetsByType).map(([type, typeAssets]) => (
            <div key={type}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TrendingUp size={14} />
                {type}
                <span className="text-gray-400 font-normal normal-case">
                  ({formatCurrency(typeAssets.reduce((sum, a) => sum + Number(a.current_value), 0))})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 hover:border-[var(--color-accent)]/30 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{asset.asset_name}</h3>
                        <p className="text-xs text-gray-500">{asset.asset_type}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(asset)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          aria-label="Edit asset"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          aria-label="Delete asset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(asset.current_value)}
                    </p>
                    {asset.notes && (
                      <p className="text-xs text-gray-500 mt-2 truncate">{asset.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(asset.recorded_date).toLocaleDateString('en-MY')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AssetForm
          userId={userId}
          asset={editingAsset}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
