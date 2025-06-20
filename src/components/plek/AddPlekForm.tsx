'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function AddPlekForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [baseRate, setBaseRate] = useState<number | ''>('')
  const [packageTypes, setPackageTypes] = useState([
    { name: '', description: '', price: '' as number | '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePackageChange = (idx: number, field: string, value: string | number) => {
    setPackageTypes(prev =>
      prev.map((pkg, i) =>
        i === idx ? { ...pkg, [field]: value } : pkg
      )
    )
  }

  const addPackageType = () => {
    setPackageTypes(prev => [...prev, { name: '', description: '', price: '' }])
  }

  const removePackageType = (idx: number) => {
    setPackageTypes(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = {
      title,
      baseRate: baseRate === '' ? undefined : Number(baseRate),
      packageTypes: packageTypes
        .filter(pkg => pkg.name)
        .map(pkg => ({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price === '' ? undefined : Number(pkg.price)
        }))
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      if (onSuccess) onSuccess()
      router.refresh()
      // Optionally redirect or show a message
    } catch (err: any) {
      setError(err.message || 'Failed to create plek')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Add a Plek</h2>
      {error && <div className="text-red-600">{error}</div>}

      <div>
        <label className="block font-medium mb-1">Title</label>
        <Input
          name="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Base Rate (per night)</label>
        <Input
          name="baseRate"
          type="number"
          min={0}
          value={baseRate}
          onChange={e => setBaseRate(e.target.value === '' ? '' : Number(e.target.value))}
          required
        />
      </div>

      <div>
        <label className="block font-medium mb-2">Package Types</label>
        {packageTypes.map((pkg, idx) => (
          <div key={idx} className="mb-4 p-3 border rounded space-y-2 bg-gray-50">
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={pkg.name}
                onChange={e => handlePackageChange(idx, 'name', e.target.value)}
                required
              />
              <Input
                placeholder="Price"
                type="number"
                min={0}
                value={pkg.price}
                onChange={e => handlePackageChange(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
              />
              <Button type="button" variant="destructive" onClick={() => removePackageType(idx)} disabled={packageTypes.length === 1}>
                Remove
              </Button>
            </div>
            <Textarea
              placeholder="Description"
              value={pkg.description}
              onChange={e => handlePackageChange(idx, 'description', e.target.value)}
              rows={2}
            />
          </div>
        ))}
        <Button type="button" onClick={addPackageType} variant="secondary">
          Add Package Type
        </Button>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Plek'}
      </Button>
    </form>
  )
}