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

// Define a type for a package tier
type PackageTier = {
  id: string;
  title: string;
  minNights: number;
  maxNights: number;
  multiplier: number;
};

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

async function fetchPost(postId: string) {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch post data');
  }
  return res.json();
}


export const EstimateBlock: React.FC<EstimateBlockProps> = ({ className, baseRate = 150, baseRateOverride, blockType, postId }) => {
  const effectiveBaseRate = getValidBaseRate(baseRate, baseRateOverride);
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [packageTiers, setPackageTiers] = useState<PackageTier[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<PackageTier | undefined>(undefined);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const { currentUser } = useUserContext()
  const { isSubscribed } = useSubscription()
  const isCustomer = !!currentUser
  const canSeeDiscount = isCustomer && isSubscribed
  const packageTotal = calculateTotal(effectiveBaseRate, selectedDuration, (currentTier?.multiplier ?? 1))
  const baseTotal = calculateTotal(effectiveBaseRate, selectedDuration, 1)

  useEffect(() => {
    async function loadPostData() {
      try {
        const post = await fetchPost(postId);
        if (post && post.packageTypes) {
          const generatedTiers = post.packageTypes.map((pkg: any) => ({
            id: pkg.templateId || pkg.name.toLowerCase().replace(/ /g, '_'),
            title: pkg.name,
            minNights: pkg.minNights || 1,
            maxNights: pkg.maxNights || 1,
            multiplier: pkg.multiplier || 1.0,
          }));
          setPackageTiers(generatedTiers);
          // Set initial selected package to the first one, or 'per_night' if available
          const initialPackage = generatedTiers.find(tier => tier.id === 'per_night') || generatedTiers[0];
          if (initialPackage) {
            setSelectedPackageId(initialPackage.id);
            setCurrentTier(initialPackage);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadPostData();
  }, [postId]);

  // Helper to get a valid tier by ID
  function getValidTierById(packageId: string): PackageTier | undefined {
    return packageTiers.find(tier => tier.id === packageId);
  }

  useEffect(() => {
    if (selectedPackageId) {
      const tier = getValidTierById(selectedPackageId);
      setCurrentTier(tier);

      // Reset dates and duration if package type changes significantly
      if (tier?.id === 'per_hour') {
        setEndDate(startDate); // Ensure endDate is same as startDate for hourly
      } else if (startDate && endDate && tier && (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) < tier.minNights) {
        // If current duration is less than new minNights, reset endDate
        setEndDate(null);
      }
    }
  }, [selectedPackageId, packageTiers, startDate, endDate]);

  useEffect(() => {
    if (startDate && currentTier) {
      let duration = 1;

      if (currentTier.id === 'per_hour') {
        duration = selectedDuration; // Use the manually set hours
        setEndDate(startDate); // For hourly, end date is same as start date
      } else if (endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (duration < 1 || startDate >= endDate) {
          setEndDate(null);
        }
      } else { // If no endDate and not per_hour, default to 1 day
        duration = 1;
      }

      setSelectedDuration(duration);
    }
  }, [startDate, endDate, selectedDuration, currentTier]);

  useEffect(() => {
    fetchUnavailableDates(postId).then((dates) => setUnavailableDates(dates))
  }, [postId])

  if (blockType !== 'stayDuration') {
    return null
  }

  const handleBookingClick = async () => {
    if (!startDate || !currentUser?.id || !currentTier || (currentTier.id !== 'per_hour' && !endDate) || (currentTier.id === 'per_hour' && selectedDuration < 1)) return;

    const fromDate = startDate.toISOString();
    const toDate = currentTier.id === 'per_hour' ? startDate.toISOString() : (endDate?.toISOString() || fromDate);

    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        fromDate,
        toDate,
        guests: [], // or your guests data
        total: canSeeDiscount ? packageTotal : baseTotal,
        customer: currentUser.id,
        packageType: currentTier.id,
        duration: selectedDuration, // Send duration for hourly packages
      }),
    });
    if (res.ok) {
      const estimate = await res.json();
      window.location.href = `/estimate/${estimate.id}`;
    } else {
      const errorText = await res.text();
      alert('Failed to create estimate: ' + errorText);
    }
  };

  return (
    <>
      {/* Main Content Area - Scrollable */}
      <div 
        data-stay-duration 
        className={cn('flex flex-col space-y-6 p-6 bg-card rounded-lg border border-border mb-24 md:mb-8', className)}
      >
        <h3 className="text-xl font-semibold">Estimate</h3>
        
        {/* Package Selection */}
        <div className="flex flex-col space-y-3">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Select Package</label>
          <select
            value={selectedPackageId || ''}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-full p-3 border border-border rounded-md bg-background text-foreground"
          >
            {packageTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.title}
              </option>
            ))}
          </select>
        </div>

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

            {currentTier?.id !== 'per_hour' ? (
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
                      currentTier?.id === 'per_hour' ||
                      date <= startDate ||
                      unavailableDates.includes(date.toISOString()) ||
                      hasUnavailableDateBetween(unavailableDates, startDate, date)
                    }
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                type="number"
                placeholder="Enter hours"
                min={1}
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="w-full h-14 text-base"
              />
            )}
          </div>
        </div>

        {/* Package Information - Only show when dates are selected */}
        {startDate && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide text-sm">Booking Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Package:</span>
                <span className="font-medium">{currentTier?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Rate:</span>
                <span className="font-medium">R{effectiveBaseRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{selectedDuration}{currentTier?.id === 'per_hour' ? ' hour' : ' night'}{selectedDuration !== 1 ? 's' : ''}</span>
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
                  {currentTier ? (
                    `R${(canSeeDiscount ? packageTotal : baseTotal).toFixed(2)}`
                  ) : (
                    `R${effectiveBaseRate}`
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{currentTier?.id === 'per_hour' ? 'per hour' : 'per night'}</span>
              </div>
              {currentTier && selectedDuration > 1 && (
                <span className="text-xs text-muted-foreground">
                  R{Math.round((canSeeDiscount ? packageTotal : baseTotal) / selectedDuration)} avg/{currentTier.id === 'per_hour' ? 'hour' : 'night'}
                </span>
              )}
            </div>

            {/* CTA Button */}
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold px-8 py-3 h-auto min-w-[140px]"
              disabled={!startDate || !currentUser?.id || !currentTier || (currentTier.id !== 'per_hour' && !endDate) || (currentTier.id === 'per_hour' && selectedDuration < 1)}
              onClick={handleBookingClick}
            >
              {!currentUser?.id ? (
                'Log in to book'
              ) : !startDate || !currentTier || (currentTier.id === 'per_hour' && selectedDuration < 1) || (currentTier.id !== 'per_hour' && !endDate) ? (
                'Check availability'
              ) : (
                'Request booking'
              )}
            </Button>
          </div>

          {/* Additional info for mobile */}
          {startDate && (
            <div className="block md:hidden mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{currentTier?.title || 'N/A'}</span>
                <span>{selectedDuration}{currentTier?.id === 'per_hour' ? ' hour' : ' night'}{selectedDuration !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 