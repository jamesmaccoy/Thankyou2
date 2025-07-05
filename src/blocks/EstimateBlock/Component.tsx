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
import { isHost } from '@/access/isAdmin'

import { calculateTotal } from '@/lib/calculateTotal'
import { hasUnavailableDateBetween } from '@/utilities/hasUnavailableDateBetween'

export type EstimateBlockProps = EstimateBlockType & {
  className?: string
  /** The unique post ID (not the slug) */
  postId: string
  baseRate: number
  baseRateOverride?: number
}

// Define package tiers with their thresholds and multipliers
const packageTiers = [
  {
    id: "per_night",
    title: "24 hours",
    minNights: 1,
    maxNights: 1,
    multiplier: 1.0,
  },
  {
    id: "three_nights",
    title: "3 Night Package",
    minNights: 2,
    maxNights: 3,
    multiplier: 0.9, // 10% discount
  },
  {
    id: "Weekly",
    title: "Weekly Package",
    minNights: 4,
    maxNights: 7,
    multiplier: 0.8, // 20% discount
  },
  {
    id: "2Xweekly",
    title: "2X Weekly Package",
    minNights: 8,
    maxNights: 13,
    multiplier: 0.7, // 30% discount
  },
  {
    id: "weekX3",
    title: "3 Week Package",
    minNights: 14,
    maxNights: 28,
    multiplier: 0.5, // 50% discount
  },
  {
    id: "monthly",
    title: "Monthly Package",
    minNights: 29,
    maxNights: 365,
    multiplier: 0.7, // 30% discount
  }
]

if (packageTiers.length === 0) {
  throw new Error('packageTiers array must not be empty');
}

// Define a type for a package tier
type PackageTier = {
  id: string;
  title: string;
  minNights: number;
  maxNights: number;
  multiplier: number;
};

// Helper to always get a valid tier
function getValidTier(diffDays: number): PackageTier {
  if (packageTiers.length === 0) {
    // Fallback tier if none are defined
    return {
      id: 'default',
      title: 'Default Package',
      minNights: 1,
      maxNights: 365,
      multiplier: 1,
    };
  }
  return packageTiers.find(tier => diffDays >= tier.minNights && diffDays <= tier.maxNights) || packageTiers[0]!;
}

// Helper to get a valid base rate
function getValidBaseRate(baseRate: unknown, baseRateOverride: unknown): number {
  const override = Number(baseRateOverride);
  const base = Number(baseRate);
  
  // Check override first - use it if it's a valid number and greater than 0
  if (!isNaN(override) && override >= 0) return override;
  
  // Then check baseRate - use it if it's a valid number (including 0)
  if (!isNaN(base) && base >= 0) return base;
  
  // Only fall back to 150 if neither is valid
  return 150; // fallback default
}

function fetchUnavailableDates(postId: string): Promise<string[]> {
  return fetch(`/api/unavailable-dates?postId=${postId}`)
    .then((res) => res.json())
    .then((data) => data.unavailableDates || [])
}

export const EstimateBlock: React.FC<EstimateBlockProps> = ({ className, baseRate = 150, baseRateOverride, blockType, postId }) => {
  const effectiveBaseRate = getValidBaseRate(baseRate, baseRateOverride);
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [currentTier, setCurrentTier] = useState<PackageTier>(getValidTier(1));
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
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
      
      // Always get a valid tier
      const tier = getValidTier(diffDays)

      if (diffDays < 1 || startDate >= endDate) {
        setEndDate(null)
      }

      setSelectedDuration(diffDays)
      setCurrentTier(tier)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchUnavailableDates(postId).then((dates) => setUnavailableDates(dates))
  }, [postId])

  if (blockType !== 'stayDuration') {
    return null
  }

  const handleBookingClick = async () => {
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
  }

  return (
    <>
      {/* Main Content Area - Scrollable */}
      <div 
        data-stay-duration 
        className={cn('flex flex-col space-y-6 p-6 bg-card rounded-lg border border-border mb-24 md:mb-8', className)}
      >
        <h3 className="text-xl font-semibold">Estimate</h3>
        
        {/* Date Selection */}
        <div className="flex flex-col space-y-3">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Select Dates</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-14 text-base",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Start</span>
                    <span className="text-sm">{startDate ? format(startDate, "MMM d, yyyy") : "Add date"}</span>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => setStartDate(date || null)}
                  disabled={(date) =>
                    date < new Date() || unavailableDates.includes(date.toISOString())
                  }
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-14 text-base",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Finish</span>
                    <span className="text-sm">{endDate ? format(endDate, "MMM d, yyyy") : "Add date"}</span>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => setEndDate(date || null)}
                  disabled={(date) =>
                    !startDate ||
                    date <= startDate ||
                    unavailableDates.includes(date.toISOString()) ||
                    hasUnavailableDateBetween(unavailableDates, startDate, date)
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Package Information - Only show when dates are selected */}
        {startDate && endDate && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide text-sm">Booking Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Package:</span>
                <span className="font-medium">{currentTier.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Rate:</span>
                <span className="font-medium">R{effectiveBaseRate}/package</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Duration/Reoccur</span>
                <span className="font-medium">{selectedDuration}∞ 24h{selectedDuration !== 1 ? 's' : ''}</span>
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
                <div className="flex justify-between items-center text-gray-500 border-t pt-3">
                  <span className="text-sm">With subscription:</span>
                  <div className="text-right">
                    <div className="font-medium">R{packageTotal.toFixed(2)}</div>
                    <div className="text-xs">(Login & subscribe to unlock)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional content spacer for mobile to prevent content being hidden behind sticky footer */}
        <div className="block md:hidden h-4"></div>
      </div>

      {/* Sticky Footer - Mobile First Design */}
      <div className="sticky-footer">
        <div className="sticky-footer-container">
          <div className="flex items-center justify-between gap-4">
            {/* Price Display */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-bold">
                  {startDate && endDate ? (
                    `R${(canSeeDiscount ? packageTotal : baseTotal).toFixed(2)}`
                  ) : (
                    `R${effectiveBaseRate}`
                  )}
                </span>
                {startDate && endDate ? (
                  <span className="text-sm text-muted-foreground">total</span>
                ) : (
                  <span className="text-sm text-muted-foreground">per night</span>
                )}
              </div>
              {startDate && endDate && selectedDuration > 1 && (
                <span className="text-xs text-muted-foreground">
                  R{Math.round((canSeeDiscount ? packageTotal : baseTotal) / selectedDuration)} avg/night
                </span>
              )}
            </div>

            {/* CTA Button */}
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold px-8 py-3 h-auto min-w-[140px]"
              disabled={!startDate || !endDate || !currentUser?.id}
              onClick={handleBookingClick}
            >
              {!currentUser?.id ? (
                'Log in to book'
              ) : !startDate || !endDate ? (
                'Check availability'
              ) : (
                'Request booking'
              )}
            </Button>
          </div>

          {/* Additional info for mobile */}
          {startDate && endDate && (
            <div className="block md:hidden mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{currentTier.title}</span>
                <span>{selectedDuration} ∞{selectedDuration !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 