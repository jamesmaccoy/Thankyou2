'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/cn'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import type { EstimateBlockType } from './types'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'

import { calculateTotal } from '@/lib/calculateTotal'

export type EstimateBlockProps = EstimateBlockType & {
  className?: string
  /** The unique post ID (not the slug) */
  postId: string
  baseRate: number // from Page
  baseRateOverride?: number
  packageTypes: any[] // from Page
}

// Helper to always get a valid tier from packageTypes
function getValidTierFromPackages(diffDays: number, packageTypes: EstimateBlockProps['packageTypes']): any {
  if (!packageTypes || packageTypes.length === 0) {
    return {
      name: 'Default Package',
      minNights: 1,
      maxNights: 365,
      price: undefined,
    }
  }
  // Find the first package with a minNights/maxNights range that matches diffDays
  // If not found, return the first package
  return packageTypes.find((pkg: any) => {
    // If minNights/maxNights are not set, treat as always valid
    return (!pkg.minNights || diffDays >= pkg.minNights) && (!pkg.maxNights || diffDays <= pkg.maxNights)
  }) || packageTypes[0]
}

// Helper to get a valid base rate
function getValidBaseRate(baseRate: unknown, baseRateOverride: unknown): number {
  const override = Number(baseRateOverride);
  const base = Number(baseRate);
  if (!isNaN(override) && override > 0) return override;
  if (!isNaN(base) && base > 0) return base;
  return 150; // fallback default
}

export const EstimateBlock: React.FC<EstimateBlockProps> = ({ className, baseRate = 150, baseRateOverride, blockType, postId, packageTypes }) => {
  const effectiveBaseRate = getValidBaseRate(baseRate, baseRateOverride);
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [currentTier, setCurrentTier] = useState<any>(getValidTierFromPackages(1, packageTypes));
  const { currentUser } = useUserContext()
  const { isSubscribed } = useSubscription()
  const isCustomer = !!currentUser
  const canSeeDiscount = isCustomer && isSubscribed
  const packageTotal = calculateTotal(effectiveBaseRate, selectedDuration, (currentTier?.multiplier ?? 1))
  const baseTotal = calculateTotal(effectiveBaseRate, selectedDuration, 1)

  useEffect(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      // Always get a valid tier from packageTypes
      const tier = getValidTierFromPackages(diffDays, packageTypes)
      setSelectedDuration(diffDays)
      setCurrentTier(tier)
    }
  }, [startDate, endDate, packageTypes])

  if (blockType !== 'stayDuration') {
    return null
  }

  return (
    <div 
      data-stay-duration 
      className={cn('flex flex-col space-y-4 p-6 bg-card rounded-lg border border-border', className)}
    >
      <h3 className="text-lg font-semibold">Book Your Stay</h3>
      
      {/* Date Selection */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Dates</label>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Check-in date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => setStartDate(date || null)}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Check-out date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={(date) => setEndDate(date || null)}
                disabled={(date) => !startDate || date <= startDate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Package Information */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Package:</span>
          <span className="font-medium">{currentTier.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Property Slug:</span>
          <span className="font-mono text-xs">{postId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Base Rate:</span>
          <span className="font-medium">R{effectiveBaseRate}/night</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Duration:</span>
          <span className="font-medium">{selectedDuration} night{selectedDuration !== 1 ? 's' : ''}</span>
        </div>
        {/* Discount preview for non-subscribers */}
        {currentTier?.multiplier !== 1 && (
          <div className="flex justify-between items-center text-green-600">
            <span className="text-sm">Discount:</span>
            <span className="font-medium">{((1 - (currentTier?.multiplier ?? 1)) * 100).toFixed(0)}% off</span>
          </div>
        )}
        {/* Show locked package total for non-subscribers */}
        {currentTier?.multiplier !== 1 && !canSeeDiscount && (
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-sm">With subscription:</span>
            <span className="font-medium">R{packageTotal.toFixed(2)} <span className="ml-2 text-xs">(Login & subscribe to unlock)</span></span>
          </div>
        )}
      </div>

      {/* Total Price */}
      <div className="pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total:</span>
          <span className="text-2xl font-bold">
            {canSeeDiscount ? `R${packageTotal.toFixed(2)}` : `R${baseTotal.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Book Now Button */}
      <Button 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!startDate || !endDate}
        onClick={async () => {
          if (!startDate || !endDate) return;
          if (!currentUser?.id) {
            alert("You must be logged in to create an estimate.");
            return;
          }
          const res = await fetch('/api/estimates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId,
              fromDate: startDate.toISOString(),
              toDate: endDate.toISOString(),
              guests: [], // or your guests data
              total: canSeeDiscount ? packageTotal : baseTotal,
              customer: currentUser.id,
            }),
          });
          if (res.ok) {
            const estimate = await res.json();
            window.location.href = `/estimate/${estimate.id}`;
          } else {
            const errorText = await res.text();
            alert('Failed to create estimate: ' + errorText);
          }
        }}
      >
        {!startDate || !endDate ? 'Select dates to book' : 'Request Availability'}
      </Button>
    </div>
  )
} 