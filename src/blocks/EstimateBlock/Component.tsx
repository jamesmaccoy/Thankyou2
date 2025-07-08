'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/cn'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import type { EstimateBlockType } from './types'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import { isHost } from '@/access/isAdmin'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ChevronLeftIcon, UserIcon } from 'lucide-react'

import { calculateTotal } from '@/lib/calculateTotal'
import { hasUnavailableDateBetween } from '@/utilities/hasUnavailableDateBetween'
// Import entitlement-based package filtering functions
import { 
  getAvailablePackagesForUser, 
  getUserTierFromEntitlements, 
  getPackageForUserTier,
  PACKAGE_TYPES,
  getPackageIconComponent,
  type BaseTemplate,
  type UserTier,
  type PackageTypeTemplate
} from '@/lib/package-types'

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
  baseTemplate: 'per_hour' | 'per_night' | 'three_nights' | 'weekly' | 'monthly';
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

export const EstimateBlock: React.FC<EstimateBlockProps> = ({ className, baseRate = 150, baseRateOverride, blockType, postId }) => {
  const effectiveBaseRate = getValidBaseRate(baseRate, baseRateOverride);
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [packageTiers, setPackageTiers] = useState<PackageTier[]>([])
  const [currentTier, setCurrentTier] = useState<PackageTier | null>(null)
  const [postData, setPostData] = useState<any>(null)
  const [loadingPackages, setLoadingPackages] = useState(true)
  
  // Time selection state for per-hour packages
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('17:00')
  
  const { currentUser } = useUserContext()
  const { isSubscribed, entitlements } = useSubscription()
  const isCustomer = !!currentUser
  const canSeeDiscount = isCustomer && isSubscribed

  // Get user tier and available packages based on entitlements
  const userTier = getUserTierFromEntitlements(entitlements)
  const availablePackages = getAvailablePackagesForUser(entitlements)

  // Helper function to filter packages based on user entitlements
  const filterPackagesByEntitlements = (packages: PackageTier[]): PackageTier[] => {
    return packages.filter(pkg => {
      // Get what packages the user is entitled to based on their tier
      const userAvailablePackages = getAvailablePackagesForUser(entitlements)
      
      // Check if this is a package from post data with a specific name
      const isNamedPackage = pkg.title && pkg.title !== pkg.baseTemplate
      
      if (isNamedPackage) {
        // For named packages (like "Per Hour (Pro)"), check if the name indicates a tier requirement
        const packageName = pkg.title.toLowerCase()
        
        // Check if package name indicates it requires Pro or higher tier
        if (packageName.includes('pro') || packageName.includes('premium') || packageName.includes('customer')) {
          return userTier === 'pro' || userTier === 'luxury'
        }
        
        // Check if package name indicates it requires Luxury tier
        if (packageName.includes('luxury') || packageName.includes('hosted') || packageName.includes('vip')) {
          return userTier === 'luxury'
        }
        
        // For standard named packages, check if user has access to the base template
        const appropriatePackageId = getPackageForUserTier(pkg.baseTemplate, userTier)
        return appropriatePackageId && userAvailablePackages[appropriatePackageId]
      } else {
        // For base template packages, check if user has access
        const appropriatePackageId = getPackageForUserTier(pkg.baseTemplate, userTier)
        return appropriatePackageId && userAvailablePackages[appropriatePackageId]
      }
    })
  }

  // Fetch post data and build package tiers
  useEffect(() => {
    const fetchPostData = async () => {
      setLoadingPackages(true)
      try {
        const response = await fetch(`/api/posts/${postId}`)
        if (response.ok) {
          const result = await response.json()
          const post = result
          setPostData(post)
          
          // Build package tiers from post data
          let tiers: PackageTier[] = []
          
          // If post has packageTypes, use those
          if (post?.packageTypes && Array.isArray(post.packageTypes) && post.packageTypes.length > 0) {
            post.packageTypes.forEach((pkg: any) => {
              const tier: PackageTier = {
                id: pkg.templateId || pkg.name.toLowerCase().replace(/\s+/g, '_'),
                title: pkg.name,
                minNights: pkg.minNights || (pkg.templateId === 'per_hour' ? 0 : 1),
                maxNights: pkg.maxNights || (pkg.templateId === 'per_hour' ? 0 : 365),
                multiplier: pkg.multiplier || 1,
                baseTemplate: getBaseTemplate(pkg.templateId || pkg.name)
              }
              tiers.push(tier)
            })
          } else {
            // Fallback to default packages including per_hour
            const defaultTiers: PackageTier[] = [
              {
                id: "per_hour",
                title: "Per Hour",
                minNights: 0,
                maxNights: 0,
                multiplier: 1.0,
                baseTemplate: 'per_hour' as const,
              },
              {
                id: "per_night",
                title: "Per Night",
                minNights: 1,
                maxNights: 1,
                multiplier: 1.0,
                baseTemplate: 'per_night' as const,
              },
              {
                id: "three_nights",
                title: "3 Night Package",
                minNights: 2,
                maxNights: 3,
                multiplier: 0.9,
                baseTemplate: 'three_nights' as const,
              },
              {
                id: "weekly",
                title: "Weekly Package",
                minNights: 4,
                maxNights: 7,
                multiplier: 0.8,
                baseTemplate: 'weekly' as const,
              },
              {
                id: "monthly",
                title: "Monthly Package",
                minNights: 29,
                maxNights: 365,
                multiplier: 0.7,
                baseTemplate: 'monthly' as const,
              }
            ]
            tiers.push(...defaultTiers)
          }
          
          // Apply entitlement-based filtering
          tiers = filterPackagesByEntitlements(tiers)
          
          setPackageTiers(tiers)
          
          // Set initial tier
          if (tiers.length > 0 && tiers[0]) {
            setCurrentTier(tiers[0])
          }
        }
      } catch (error) {
        console.error('Error fetching post data:', error)
        // Fallback to basic packages including per_hour
        let fallbackTiers: PackageTier[] = [
          {
            id: "per_hour",
            title: "Per Hour",
            minNights: 0,
            maxNights: 0,
            multiplier: 1.0,
            baseTemplate: 'per_hour' as const,
          },
          {
            id: "per_night",
            title: "Per Night",
            minNights: 1,
            maxNights: 1,
            multiplier: 1.0,
            baseTemplate: 'per_night' as const,
          }
        ]
        
        // Apply entitlement-based filtering to fallback tiers too
        fallbackTiers = filterPackagesByEntitlements(fallbackTiers)
        
        setPackageTiers(fallbackTiers)
        if (fallbackTiers.length > 0 && fallbackTiers[0]) {
          setCurrentTier(fallbackTiers[0])
        }
      } finally {
        setLoadingPackages(false)
      }
    }

    fetchPostData()
  }, [postId, currentUser, userTier, entitlements]) // Include entitlement dependencies

  // Helper function to map template IDs to base templates
  const getBaseTemplate = (templateIdOrName: string): PackageTier['baseTemplate'] => {
    const template = templateIdOrName.toLowerCase()
    // Be more specific about hourly detection to avoid false positives
    if (template.includes('per_hour') || template.includes('per hour') || template.includes('hourly') || template === 'hour') return 'per_hour'
    if (template.includes('night') || template === 'per_night') return 'per_night'
    if (template.includes('three') || template === 'three_nights') return 'three_nights'
    if (template.includes('week') || template === 'weekly') return 'weekly'
    if (template.includes('month') || template === 'monthly') return 'monthly'
    return 'per_night' // default
  }

  // Helper to get a valid tier for duration
  function getValidTier(diffDays: number): PackageTier | null {
    if (packageTiers.length === 0) return null
    
    // For hourly packages, always return per_hour if available
    if (diffDays === 0) {
      const hourlyTier = packageTiers.find(tier => tier.baseTemplate === 'per_hour')
      if (hourlyTier) return hourlyTier
    }
    
    // Find tier that matches the duration and is not per_hour
    const matchingTier = packageTiers.find(tier => 
      tier.baseTemplate !== 'per_hour' && 
      diffDays >= tier.minNights && 
      diffDays <= tier.maxNights
    );
    
    if (matchingTier) return matchingTier;
    
    // Fallback to any non-hourly tier
    const fallbackTier = packageTiers.find(tier => tier.baseTemplate !== 'per_hour');
    if (fallbackTier) return fallbackTier;
    
    // Final fallback to first tier
    return packageTiers[0] || null;
  }

  // Helper to calculate hours from time selection
  const getSelectedHours = (): number => {
    if (!startTime || !endTime) return 1;
    
    const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
    const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) diffMinutes += 24 * 60; // Next day
    
    return Math.max(1, Math.round(diffMinutes / 60));
  };
  
  // Check if current tier is hourly
  const isHourlySelected = currentTier?.baseTemplate === 'per_hour'
  
  // Calculate quantity based on package type
  const quantity = isHourlySelected ? getSelectedHours() : selectedDuration
  
  // Calculate totals using the new logic
  const packageTotal = currentTier ? (
    isHourlySelected 
      ? Math.round(effectiveBaseRate * currentTier.multiplier * getSelectedHours())
      : Math.round(effectiveBaseRate * currentTier.multiplier * selectedDuration)
  ) : 0;
  
  const baseTotal = currentTier ? (
    isHourlySelected 
      ? Math.round(effectiveBaseRate * getSelectedHours())
      : Math.round(effectiveBaseRate * selectedDuration)
  ) : 0;

  // Update the tier when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const validTier = getValidTier(diffDays);
      if (validTier) {
        setCurrentTier(validTier);
      }
    }
  }, [startDate, endDate, packageTiers]);

  // Update selectedDuration when currentTier changes
  useEffect(() => {
    if (currentTier && startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setSelectedDuration(diffDays);
    }
  }, [currentTier, startDate, endDate]);

  // Calculate the current user details
  const { id: customerId, email: emailAddress, name: customerName } = currentUser || {};

  useEffect(() => {
    fetchUnavailableDates(postId).then((dates) => setUnavailableDates(dates))
  }, [postId])

  if (blockType !== 'stayDuration') {
    return null
  }

  const handleBookingClick = async () => {
    // Check validation based on package type
    if (isHourlySelected) {
      if (!startDate || !startTime || !endTime) return;
    } else {
      if (!startDate || !endDate) return;
    }
    
    if (!currentUser?.id) {
      alert("You must be logged in to create an estimate.");
      return;
    }
    
    // Prepare the request data
    const requestData = {
      postId,
      fromDate: startDate.toISOString(),
      toDate: (isHourlySelected ? startDate : endDate)?.toISOString(),
      guests: [], // or your guests data
      total: canSeeDiscount ? packageTotal : baseTotal,
      customer: currentUser.id,
      packageType: currentTier?.id || 'per_night',
      duration: quantity,
      units: isHourlySelected ? 'hours' : 'nights',
      ...(isHourlySelected && {
        startTime,
        endTime,
        hours: getSelectedHours()
      })
    };
    
    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });
    
    if (res.ok) {
      const estimate = await res.json();
      window.location.href = `/estimate/${estimate.id}`;
    } else {
      const errorText = await res.text();
      alert('Failed to create estimate: ' + errorText);
    }
  }

  // Loading state
  if (loadingPackages) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // No packages available
  if (packageTiers.length === 0 || !currentTier) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-500">No booking packages available for this post.</p>
      </div>
    );
  }

  return (
    <>
      {/* Main Content Area - Scrollable */}
      <div 
        data-stay-duration 
        className={cn('flex flex-col space-y-6 p-6 bg-card rounded-lg border border-border mb-24 md:mb-8', className)}
      >
        <h3 className="text-xl font-semibold">Estimate</h3>
        
        {/* User Tier Indicator - Only show for authenticated users */}
        {currentUser && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Your tier: <span className="capitalize">{userTier}</span>
                </span>
              </div>
              {userTier === 'guest' && entitlements.length === 0 && (
                <Button variant="outline" size="sm" className="text-xs">
                  Upgrade for discounts
                </Button>
              )}
            </div>
            {userTier === 'guest' && entitlements.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Subscribe to unlock premium packages and get discounts on all bookings
              </p>
            )}
          </div>
        )}
        
        {/* Date/Time Selection - Conditional based on package type */}
        <div className="flex flex-col space-y-3">
          {isHourlySelected ? (
            <>
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Select Date & Times</label>
              
              {/* Date selection for hourly */}
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
                      <span className="text-xs text-muted-foreground">Date</span>
                      <span className="text-sm">{startDate ? format(startDate, "MMM d, yyyy") : "Select date"}</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => {
                      setStartDate(date || null)
                      setEndDate(date || null) // Same day for hourly
                    }}
                    disabled={(date) =>
                      date < new Date() || unavailableDates.includes(date.toISOString())
                    }
                  />
                </PopoverContent>
              </Popover>
              
              {/* Time selection for hourly */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              
              {startDate && startTime && endTime && (
                <div className="text-sm text-muted-foreground text-center">
                  {getSelectedHours()} hour{getSelectedHours() !== 1 ? 's' : ''} on {format(startDate, "MMM d, yyyy")}
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Package Selection - Now positioned after Select Dates */}
        <div className="flex flex-col space-y-3">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Select Package Type</label>
          <div className="flex flex-wrap gap-2">
            {packageTiers.map((tier) => {
              // Get the icon component for this package type
              const IconComponent = getPackageIconComponent(tier.id)
              
              return (
                <Button
                  key={tier.id}
                  variant={currentTier?.id === tier.id ? "default" : "outline"}
                  className="h-auto p-3 flex items-center gap-2 text-left"
                  onClick={() => {
                    setCurrentTier(tier);
                  }}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{tier.title}</span>
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Package Information - Only show when dates are selected */}
        {((startDate && endDate && !isHourlySelected) || (startDate && startTime && endTime && isHourlySelected)) && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide text-sm">Booking Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Package:</span>
                <span className="font-medium">{currentTier.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Rate:</span>
                <span className="font-medium">R{effectiveBaseRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {isHourlySelected ? 'Duration:' : 'Duration:'}
                </span>
                <span className="font-medium">
                  {isHourlySelected 
                    ? `${getSelectedHours()} hour${getSelectedHours() !== 1 ? 's' : ''}`
                    : `${selectedDuration} night${selectedDuration !== 1 ? 's' : ''}`
                  }
                </span>
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
                  {((startDate && endDate && !isHourlySelected) || (startDate && startTime && endTime && isHourlySelected)) ? (
                    `R${(canSeeDiscount ? packageTotal : baseTotal).toFixed(2)}`
                  ) : (
                    `R${effectiveBaseRate}`
                  )}
                </span>
                {((startDate && endDate && !isHourlySelected) || (startDate && startTime && endTime && isHourlySelected)) ? (
                  <span className="text-sm text-muted-foreground">total</span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {isHourlySelected ? 'per hour' : 'per night'}
                  </span>
                )}
              </div>
              {((startDate && endDate && !isHourlySelected && selectedDuration > 1) || 
                (startDate && startTime && endTime && isHourlySelected && getSelectedHours() > 1)) && (
                <span className="text-xs text-muted-foreground">
                  {isHourlySelected 
                    ? `R${Math.round((canSeeDiscount ? packageTotal : baseTotal) / getSelectedHours())} avg/hour`
                    : `R${Math.round((canSeeDiscount ? packageTotal : baseTotal) / selectedDuration)} avg/night`
                  }
                </span>
              )}
            </div>

            {/* CTA Button */}
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold px-8 py-3 h-auto min-w-[140px]"
              disabled={
                !currentUser?.id || 
                (!isHourlySelected && (!startDate || !endDate)) ||
                (isHourlySelected && (!startDate || !startTime || !endTime))
              }
              onClick={handleBookingClick}
            >
              {!currentUser?.id ? (
                'Log in to book'
              ) : (!isHourlySelected && (!startDate || !endDate)) || (isHourlySelected && (!startDate || !startTime || !endTime)) ? (
                'Check availability'
              ) : (
                'Request booking'
              )}
            </Button>
          </div>

          {/* Additional info for mobile */}
          {((startDate && endDate && !isHourlySelected) || (startDate && startTime && endTime && isHourlySelected)) && (
            <div className="block md:hidden mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{currentTier.title}</span>
                <span>
                  {isHourlySelected 
                    ? `${getSelectedHours()} hour${getSelectedHours() !== 1 ? 's' : ''}`
                    : `${selectedDuration} night${selectedDuration !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 