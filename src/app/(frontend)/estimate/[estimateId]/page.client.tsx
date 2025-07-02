'use client'

import { useState, useEffect } from "react"
import { Estimate, User } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRevenueCat } from '@/providers/RevenueCat'
import { Purchases, type Package, ErrorCode, type Product } from '@revenuecat/purchases-js'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import InviteUrlDialog from './_components/invite-url-dialog'
import { Media } from '@/components/Media'
import { formatDateTime } from '@/utilities/formatDateTime'
import { UserIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import React from 'react'
import { getPackageById, getAllPackageTypes } from '@/lib/package-types'
import { Badge } from '@/components/ui/badge'

// Enhanced interface for package details with filtering capabilities
interface EnhancedPackageDetails {
  id: string
  title: string
  description: string
  multiplier: number
  features: string[]
  revenueCatId: string
  price: number
  minNights: number
  maxNights: number
  availableSeasons: string[]
}

interface RevenueCatError extends Error {
  code?: ErrorCode;
}

interface RevenueCatProduct extends Product {
  price?: number;
  priceString?: string;
  currencyCode?: string;
}

type Props = {
  data: Estimate
  user: User
}

export default function EstimateDetailsClientPage({ data, user }: Props) {
  const router = useRouter()
  const { isInitialized } = useRevenueCat()

  // Use estimate data for totals and duration
  const _bookingDuration = data?.fromDate && data?.toDate
    ? Math.max(1, Math.round((new Date(data.toDate).getTime() - new Date(data.fromDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const _bookingTotal = data?.total ?? 0;
  const _postId = typeof data?.post === 'object' && data?.post?.id ? data.post.id : (typeof data?.post === 'string' ? data.post : '')
  const _post = typeof data?.post === 'object' ? data.post : null

  // State for post data if we need to fetch it
  const [postData, setPostData] = useState<any>(null)
  const [loadingPost, setLoadingPost] = useState(false)

  // Fetch post data if it's not populated in the estimate
  useEffect(() => {
    const fetchPostData = async () => {
      // Always fetch the post data if we have a postId, even if _post exists
      // This ensures we get the latest baseRate and other data
      if (_postId) {
        setLoadingPost(true)
        try {
          const response = await fetch(`/api/posts/${_postId}`)
          if (response.ok) {
            const result = await response.json()
            const post = result.doc // API returns { doc: post }
            setPostData(post)
            console.log('Fetched post data:', post)
            console.log('Post baseRate from API:', post?.baseRate, typeof post?.baseRate)
            console.log('Post packageTypes from API:', post?.packageTypes)
          } else {
            console.error('Failed to fetch post data:', response.status)
          }
        } catch (error) {
          console.error('Error fetching post data:', error)
        } finally {
          setLoadingPost(false)
        }
      }
    }

    fetchPostData()
  }, [_postId]) // Remove _post dependency to always fetch fresh data

  // Use the fetched post data (which has fresh baseRate) over the populated post
  const effectivePost = postData || _post

  const [guests, setGuests] = useState<User[]>(Array.isArray(data.guests) ? data.guests.filter(g => typeof g !== 'string') as User[] : [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [offerings, setOfferings] = useState<Package[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(typeof _bookingDuration === 'number' ? _bookingDuration : 1)
  const [isWineSelected, setIsWineSelected] = useState(false)
  const [packagePrice, setPackagePrice] = useState<number | null>(null)
  const [hasUserSelectedPackage, setHasUserSelectedPackage] = useState(false) // Track manual selection

  // Add state for date range selection
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: data?.fromDate ? new Date(data.fromDate) : undefined,
    to: data?.toDate ? new Date(data.toDate) : undefined,
  })

  // Filter packages based on duration and season
  const getFilteredPackages = (): Record<string, EnhancedPackageDetails> => {
    const allPackages = getPackageDetails()
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1 // 1-12
    
    // Determine current season (simple logic - can be enhanced)
    const getCurrentSeason = () => {
      if (currentMonth >= 12 || currentMonth <= 2) return 'winter'
      if (currentMonth >= 3 && currentMonth <= 5) return 'spring'
      if (currentMonth >= 6 && currentMonth <= 8) return 'summer'
      return 'autumn'
    }
    
    const currentSeason = getCurrentSeason()
    
    return Object.fromEntries(
      Object.entries(allPackages).filter(([key, pkg]) => {
        // Type assertion for pkg
        const packageInfo = pkg as EnhancedPackageDetails
        
        // Exclude add-on packages (like wine_package) from main package selection
        if (key === 'wine_package' || packageInfo.id === 'wine_package') {
          return false
        }
        
        // Filter by duration - use fallback values if minNights/maxNights not defined
        const minNights = packageInfo.minNights || 1
        const maxNights = packageInfo.maxNights || 365
        const withinDuration = selectedDuration >= minNights && selectedDuration <= maxNights
        
        // Filter by season (if package has season restrictions)
        const seasonMatch = packageInfo.availableSeasons.includes('all') || 
                           packageInfo.availableSeasons.includes(currentSeason)
        
        console.log(`Package ${key}: duration ${selectedDuration} vs ${minNights}-${maxNights}, within: ${withinDuration}, season: ${seasonMatch}`)
        
        return withinDuration && seasonMatch
      })
    )
  }

  // Get packages from the centralized system with proper post integration
  const getPackageDetails = (): Record<string, EnhancedPackageDetails> => {
    console.log('=== PACKAGE DETAILS DEBUG ===')
    console.log('effectivePost:', effectivePost)
    console.log('effectivePost?.baseRate:', effectivePost?.baseRate)
    console.log('effectivePost?.packageTypes:', effectivePost?.packageTypes)
    console.log('_post (from estimate):', _post)
    console.log('postData (from API fetch):', postData)
    
    // Get the post's base rate with proper fallback logic
    // Use 150 only if baseRate is null, undefined, or NaN - NOT if it's 0
    const postBaseRate = (typeof effectivePost?.baseRate === 'number' && !isNaN(effectivePost.baseRate)) 
      ? effectivePost.baseRate 
      : 150
    console.log('Using postBaseRate:', postBaseRate, '(source:', effectivePost?.baseRate !== undefined ? 'effectivePost' : 'fallback', ')')
    
    // FIRST PRIORITY: Use post-specific packageTypes if they exist
    if (effectivePost?.packageTypes && Array.isArray(effectivePost.packageTypes) && effectivePost.packageTypes.length > 0) {
      const postPackages: Record<string, EnhancedPackageDetails> = {}
      effectivePost.packageTypes.forEach((pkg: any) => {
        const packageKey = pkg.templateId || pkg.name.toLowerCase().replace(/\s+/g, '_')
        // Use package price if it's a valid number, otherwise use post baseRate
        const packagePrice = (typeof pkg.price === 'number' && !isNaN(pkg.price)) ? pkg.price : postBaseRate
        console.log(`Package "${pkg.name}": price=${pkg.price}, using=${packagePrice}, baseRate=${postBaseRate}`)
        
        postPackages[packageKey] = {
          id: packageKey,
          title: pkg.name,
          description: pkg.description || '',
          multiplier: pkg.multiplier || 1,
          features: Array.isArray(pkg.features) 
            ? pkg.features.map((f: any) => typeof f === 'string' ? f : f.feature || '').filter((f: string) => f.trim())
            : [],
          revenueCatId: pkg.revenueCatId || packageKey,
          price: packagePrice, // Use package price if available, otherwise post baseRate
          minNights: pkg.minNights || 1,
          maxNights: pkg.maxNights || 365,
          availableSeasons: ['all'], // Default to all seasons
        }
      })
      console.log('Final post-specific packages:', postPackages)
      console.log('=== END PACKAGE DEBUG ===')
      return postPackages
    }
    
    // SECOND PRIORITY: Fallback to centralized packages if no post-specific packages
    const centralizedPackages = getAllPackageTypes()
    if (centralizedPackages && Object.keys(centralizedPackages).length > 0) {
      const packageDetails: Record<string, EnhancedPackageDetails> = {}
      Object.entries(centralizedPackages).forEach(([key, pkg]) => {
        packageDetails[key] = {
          id: key,
          title: pkg.name,
          description: pkg.description,
          multiplier: pkg.multiplier,
          features: pkg.features,
          revenueCatId: pkg.revenueCatId,
          price: postBaseRate, // Use the post's base rate for centralized packages
          minNights: pkg.minNights || 1,
          maxNights: pkg.maxNights || 365,
          availableSeasons: ['all'], // Default to all seasons for now
        }
      })
      console.log('Using centralized packages with baseRate fallback:', packageDetails)
      console.log('=== END PACKAGE DEBUG ===')
      return packageDetails
    }
    
    // FINAL FALLBACK: Default packages if nothing else is available
    const defaultPackages: Record<string, EnhancedPackageDetails> = {
      per_night: {
        id: "per_night",
        title: "Per Night",
        description: "Standard nightly rate",
        multiplier: 1.0,
        features: [
          "Standard accommodation",
          "Basic amenities",
          "Self-service"
        ],
        revenueCatId: "per_night",
        price: postBaseRate,
        minNights: 1,
        maxNights: 365,
        availableSeasons: ['all'],
      }
    }
    console.log('Using default packages with baseRate fallback:', defaultPackages)
    console.log('=== END PACKAGE DEBUG ===')
    return defaultPackages
  }

  const packageDetails = getFilteredPackages()

  // Add helper text for filtered packages
  const getPackageFilterInfo = () => {
    const allPackages = getPackageDetails()
    const filteredPackages = getFilteredPackages()
    const totalPackages = Object.keys(allPackages).length
    const availablePackages = Object.keys(filteredPackages).length
    
    if (totalPackages === availablePackages) {
      return null // No filtering applied
    }
    
    return `Showing ${availablePackages} of ${totalPackages} packages available for ${selectedDuration} night${selectedDuration !== 1 ? 's' : ''}`
  }

  // Add helper function to select the best package for a duration
  const getBestPackageForDuration = (duration: number, packages: Record<string, EnhancedPackageDetails>): string | null => {
    // Package priority for different durations
    const packagePreferences = [
      { min: 1, max: 1, preferred: ['per_night', 'luxury_night'] },
      { min: 2, max: 3, preferred: ['three_nights', 'per_night', 'luxury_night'] },
      { min: 4, max: 6, preferred: ['three_nights', 'per_night', 'luxury_night'] },
      { min: 7, max: 7, preferred: ['weekly', 'three_nights', 'per_night'] },
      { min: 8, max: 29, preferred: ['weekly', 'three_nights', 'per_night'] },
      { min: 30, max: 365, preferred: ['monthly', 'weekly', 'per_night'] }
    ]
    
    // Find the preference group for this duration
    const preferenceGroup = packagePreferences.find(p => duration >= p.min && duration <= p.max)
    if (!preferenceGroup) {
      // Fallback to first available package
      return Object.keys(packages)[0] || null
    }
    
    // Try to find packages in order of preference
    for (const preferredId of preferenceGroup.preferred) {
      if (packages[preferredId]) {
        console.log(`Selected ${preferredId} as best package for ${duration} nights`)
        return preferredId
      }
    }
    
    // Fallback to first available package
    const firstAvailable = Object.keys(packages)[0] || null
    console.log(`Fallback to ${firstAvailable} for ${duration} nights`)
    return firstAvailable
  }

  // Set initial selected package to the best match for duration
  React.useEffect(() => {
    const availablePackages = getFilteredPackages()
    const bestPackage = getBestPackageForDuration(selectedDuration, availablePackages)
    
    // Only auto-select if user hasn't made a manual selection
    if (!hasUserSelectedPackage) {
      if (bestPackage && bestPackage !== selectedPackage) {
        console.log(`Auto-selecting package ${bestPackage} for duration ${selectedDuration}`)
        setSelectedPackage(bestPackage)
      } else if (!selectedPackage && Object.keys(availablePackages).length > 0) {
        // Fallback to first available if no best match
        const firstPackageKey = Object.keys(availablePackages)[0]
        console.log(`Fallback selecting first available package: ${firstPackageKey}`)
        setSelectedPackage(firstPackageKey || null)
      }
    } else {
      // If user has selected a package, check if it's still available
      if (selectedPackage && !availablePackages[selectedPackage]) {
        console.log(`User-selected package ${selectedPackage} no longer available, auto-selecting best alternative`)
        setSelectedPackage(bestPackage)
        setHasUserSelectedPackage(false) // Reset manual selection flag
      }
    }
  }, [selectedDuration, packageDetails, hasUserSelectedPackage, selectedPackage]) // Include hasUserSelectedPackage in dependencies

  // Load RevenueCat offerings when initialized
  useEffect(() => {
    if (isInitialized) {
      loadOfferings()
    }
  }, [isInitialized])

  const loadOfferings = async () => {
    try {
      setLoadingOfferings(true)
      
      // Add better error handling for RevenueCat
      if (!isInitialized) {
        console.warn('RevenueCat not initialized, skipping offerings load')
        setOfferings([])
        return
      }

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))

      const offerings = await Purchases.getSharedInstance().getOfferings()
      
      if (!offerings || !offerings.all) {
        console.warn('No offerings available from RevenueCat')
        setOfferings([])
        return
      }
      
      const packages = Object.values(offerings.all).flatMap(offering => 
        offering.availablePackages || []
      )
      
      setOfferings(packages)
      console.log('Loaded RevenueCat packages:', packages.length)
    } catch (error: any) {
      console.error('Error loading offerings:', error)
      
      // Handle specific RevenueCat errors
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        console.warn('RevenueCat rate limit reached, using fallback pricing')
        setPaymentError('Loading packages... Please wait a moment and refresh if needed.')
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        console.warn('Network error loading RevenueCat offerings')
        setPaymentError('Network issue loading payment options. Pricing will use defaults.')
      }
      
      // Always continue with empty offerings to allow fallback pricing
      setOfferings([])
    } finally {
      setLoadingOfferings(false)
    }
  }

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId)
    setHasUserSelectedPackage(true) // Mark that user has made a manual selection
    const selectedPkg = packageDetails[packageId]
    if (selectedPkg) {
      // Use the package's price (which is either the package's custom price or post's baseRate)
      const calculatedPrice = selectedPkg.price * selectedPkg.multiplier * selectedDuration
      setPackagePrice(calculatedPrice)
      console.log('Package selection pricing:', { 
        packagePrice: selectedPkg.price, 
        multiplier: selectedPkg.multiplier, 
        duration: selectedDuration, 
        total: calculatedPrice 
      })
    }
  }

  const handleFeatureClick = (feature: string, index: number) => {
    console.log(`Feature clicked: ${feature} at index ${index}`)
  }

  // Update package price when package or duration changes
  useEffect(() => {
    if (!selectedPackage) return

    const selectedPackageDetails = packageDetails[selectedPackage as keyof typeof packageDetails]
    if (!selectedPackageDetails) return

    // If we have RevenueCat offerings, try to use them for pricing
    let estimatePackage = null
    if (offerings.length > 0) {
      estimatePackage = offerings.find(pkg => {
        const identifier = pkg.webBillingProduct?.identifier;
        return identifier === selectedPackageDetails.revenueCatId;
      });
    }

    if (estimatePackage && estimatePackage.webBillingProduct) {
      const product = estimatePackage.webBillingProduct as RevenueCatProduct
      if (product.price) {
        const revenueCatPrice = Number(product.price)
        
        // RevenueCat packages have FIXED TOTAL PRICES (not per-night rates)
        // So we should NOT multiply by duration for these packages
        console.log('Using RevenueCat pricing (fixed total):', { 
          revenueCatPrice, 
          packageId: selectedPackageDetails.revenueCatId,
          duration: selectedDuration,
          note: 'Fixed total price, not multiplied by duration'
        })
        setPackagePrice(revenueCatPrice)
        return
      }
    }

    // Fallback to local pricing calculation using package price
    // This is for packages not in RevenueCat or when RevenueCat is unavailable
    const packagePrice = selectedPackageDetails.price
    const multiplier = selectedPackageDetails.multiplier ?? 1.0
    const calculatedPrice = packagePrice * multiplier * selectedDuration
    setPackagePrice(calculatedPrice)
    console.log('Using local package pricing:', { packagePrice, multiplier, duration: selectedDuration, total: calculatedPrice })
  }, [selectedPackage, offerings, selectedDuration, packageDetails, effectivePost?.baseRate])

  const calculateTotalPrice = () => {
    // Calculate package price directly from selected package details
    let packageTotal = 0
    let estimatePackage = null // Declare in proper scope
    
    if (selectedPackage && packageDetails[selectedPackage]) {
      const selectedPkg = packageDetails[selectedPackage]
      
      // Check if we have a RevenueCat package with fixed pricing
      if (offerings.length > 0) {
        estimatePackage = offerings.find(pkg => {
          const identifier = pkg.webBillingProduct?.identifier;
          return identifier === selectedPkg.revenueCatId;
        });
      }
      
      if (estimatePackage && estimatePackage.webBillingProduct) {
        const product = estimatePackage.webBillingProduct as RevenueCatProduct
        if (product.price) {
          // Use fixed RevenueCat price (no duration multiplication)
          packageTotal = Number(product.price)
        } else {
          // Fallback to calculated pricing
          packageTotal = selectedPkg.price * selectedPkg.multiplier * selectedDuration
        }
      } else {
        // Use calculated pricing for local packages
        packageTotal = selectedPkg.price * selectedPkg.multiplier * selectedDuration
      }
    }
    
    // Calculate wine package price if selected
    const winePrice = isWineSelected && packageDetails.wine_package 
      ? (packageDetails.wine_package.price * packageDetails.wine_package.multiplier * selectedDuration)
      : 0
      
    const total = packageTotal + winePrice
    console.log('calculateTotalPrice:', { 
      selectedPackage, 
      packageTotal, 
      winePrice, 
      total,
      selectedDuration,
      hasRevenueCatPackage: !!estimatePackage,
      packageDetails: selectedPackage ? packageDetails[selectedPackage] : null
    })
    
    return total
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/A"
    return `R${price.toFixed(2)}`
  }

  const handleEstimate = async () => {
    setPaymentLoading(true)
    setPaymentError(null)
    try {
      const selectedPackageDetails = selectedPackage ? packageDetails[selectedPackage as keyof typeof packageDetails] : null
      if (!selectedPackageDetails) {
        throw new Error("No package selected")
      }

      // Calculate final total including wine package if selected
      const finalTotal = calculateTotalPrice()
      console.log('Final estimate total:', finalTotal)

      // Try to find RevenueCat package if offerings are available
      let estimatePackage = null
      if (offerings.length > 0) {
        estimatePackage = offerings.find(pkg => {
          const identifier = pkg.webBillingProduct?.identifier;
          return identifier === selectedPackageDetails.revenueCatId;
        });
        
        console.log('RevenueCat package search:', {
          selectedPackage: selectedPackageDetails.title,
          searchingForId: selectedPackageDetails.revenueCatId,
          availablePackages: offerings.map(pkg => ({
            identifier: pkg.webBillingProduct?.identifier,
            title: pkg.webBillingProduct?.title || pkg.webBillingProduct?.identifier
          })),
          foundPackage: estimatePackage ? 'Yes' : 'No'
        })
      }

      // Track payment success status
      let paymentProcessed = false
      let purchaseResult = null
      let shouldProceedWithoutPayment = false

      // --- RevenueCat Payment Flow (if available) ---
      if (estimatePackage && estimatePackage.webBillingProduct) {
        try {
          console.log('Processing RevenueCat purchase...')
          purchaseResult = await Purchases.getSharedInstance().purchase({
            rcPackage: estimatePackage,
          })
          console.log("RevenueCat purchase successful:", purchaseResult)
          paymentProcessed = true
        } catch (purchaseError: any) {
          console.error('RevenueCat purchase failed:', purchaseError)
          
          // Handle specific RevenueCat error types
          if (purchaseError.code === ErrorCode.UserCancelledError) {
            throw new Error('Payment was cancelled. Please try again if you wish to complete your booking.')
          } else if (purchaseError.code === ErrorCode.PaymentPendingError) {
            throw new Error('Payment is pending. Please check your payment method and try again.')
          } else if (purchaseError.code === ErrorCode.PurchaseNotAllowedError) {
            throw new Error('Purchase not allowed. Please check your account settings.')
          } else if (purchaseError.code === ErrorCode.PurchaseInvalidError) {
            throw new Error('Invalid purchase. Please try selecting a different package.')
          } else if (purchaseError.code === ErrorCode.NetworkError) {
            throw new Error('Network error during payment. Please check your connection and try again.')
          } else {
            // For any other error, throw a general payment error
            throw new Error(`Payment failed: ${purchaseError.message || 'Unknown error'}. Please try again.`)
          }
        }
      } else if (offerings.length > 0) {
        // Enhanced error message with more details
        const packageDetails = selectedPackageDetails.title
        const revenueCatId = selectedPackageDetails.revenueCatId
        const availableIds = offerings.map(pkg => pkg.webBillingProduct?.identifier).filter(Boolean).join(', ')
        
        console.warn(`RevenueCat package not found. Package: ${packageDetails}, Expected ID: ${revenueCatId}, Available IDs: ${availableIds}`)
        
        // Instead of throwing an error, proceed without payment processing for packages not in RevenueCat
        console.warn(`Proceeding without RevenueCat payment for package: ${packageDetails}`)
        shouldProceedWithoutPayment = true
      } else {
        // If no RevenueCat offerings are loaded, warn but allow to proceed
        console.warn("No RevenueCat offerings available, proceeding with estimate confirmation only")
        shouldProceedWithoutPayment = true
      }

      // Only proceed with booking creation if payment was successful OR no payment was required
      if (paymentProcessed || shouldProceedWithoutPayment) {
        // After successful purchase (or if no RevenueCat), confirm the estimate in backend
        const estimateData = {
          postId: _postId,
          fromDate: data.fromDate,
          toDate: data.toDate,
          guests: Array.isArray(data.guests) ? data.guests.map(g => typeof g === 'string' ? g : g.id) : [],
          baseRate: (typeof effectivePost?.baseRate === 'number' && !isNaN(effectivePost.baseRate)) 
            ? effectivePost.baseRate 
            : 150, // Send the post's base rate for backend calculations with proper fallback
          duration: selectedDuration,
          customer: user.id,
          packageType: selectedPackage,
          isWineSelected,
          totalAmount: finalTotal,
          revenueCatPurchaseResult: purchaseResult // Include purchase details
        }
        
        console.log('Confirming estimate with data:', estimateData)
        
        const response = await fetch(`/api/estimates/${data.id}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimateData),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Estimate confirmation error:', errorData)
          throw new Error(errorData.error || 'Failed to confirm estimate')
        }
        
        const result = await response.json()
        console.log('Estimate confirmation result:', result)
        setPaymentSuccess(true)
        
        // Check if a booking was created and redirect accordingly
        if (result.booking && result.booking.id) {
          setTimeout(() => {
            router.push(`/booking-confirmation?bookingId=${result.booking.id}`)
          }, 1500)
        } else {
          // Fallback to the original redirect if no booking ID is available
          setTimeout(() => {
            router.push(`/booking-confirmation?total=${finalTotal}&duration=${selectedDuration}`)
          }, 1500)
        }
      } else {
        throw new Error('Payment processing failed. No booking was created.')
      }
    } catch (error) {
      console.error('Complete estimate error:', error)
      setPaymentError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleShare = () => {
    const urlToShare = window.location.href
    navigator.clipboard
      .writeText(urlToShare)
      .then(() => {
        // Optionally show a toast or message
      })
      .catch((err) => {
        // Optionally show a toast or message
      })
  }

  if (loading || loadingOfferings || loadingPost) {
    return (
      <div className="container py-10">
        <h1 className="text-4xl font-bold tracking-tighter mb-8">Start your curated stay</h1>
        <p>Loading estimate details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <h1 className="text-4xl font-bold tracking-tighter mb-8">Start your curated stay</h1>
        <p className="text-error">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="container content-with-sticky-footer py-10">
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Estimate Details</h1>
      <Tabs defaultValue="details" className="max-w-screen-lg mx-auto mobile-scroll-safe">

          {/* --- Summary Header Section --- */}
          <div className="pt-12 pb-6">
            <div className="bg-muted p-6 rounded-lg border border-border mb-6 text-center md:hidden">
              <h2 className="text-2xl font-semibold mb-2">{formatPrice(calculateTotalPrice())}</h2>
              <p className="text-base text-muted-foreground">{selectedDuration} nights total</p>
              {isWineSelected && (
                <p className="text-sm text-muted-foreground mt-1">Includes wine package add-on</p>
              )}
            </div>
            
            {/* Desktop summary - more detailed */}
            <div className="hidden md:block bg-muted p-6 rounded-lg border border-border mb-6 text-center">
              <h2 className="text-3xl font-semibold mb-2">{formatPrice(calculateTotalPrice())}</h2>
              <p className="text-lg text-muted-foreground">Total for {selectedDuration} nights</p>
              {isWineSelected && (
                <p className="text-sm text-muted-foreground mt-1">Includes wine package add-on</p>
              )}
            </div>
          </div>

        <TabsList className="mb-6 bg-muted p-2 rounded-full flex flex-row gap-2">
          <TabsTrigger value="details" className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
          <FileText className="h-5 w-5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="guests" className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
          <UserIcon className="h-5 w-5" />
            Guests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">


          {/* --- Estimate Info Section --- */}
          {data && 'post' in data && typeof data?.post !== 'string' ? (
            <div className="flex flex-col gap-5 mb-8">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Estimate Summary</CardTitle>
                  <CardDescription>Your estimation information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {!!effectivePost?.meta?.image && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-border bg-white">
                        <Media
                          resource={effectivePost?.meta?.image || undefined}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <h1 className="text-2xl font-bold">{effectivePost?.title}</h1>
                      <span className="font-medium">Date Estimated: {formatDateTime(data?.createdAt)}</span>
                      <span className="font-medium">Guests: {Array.isArray(data?.guests) ? data.guests.length : 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-xl">Estimate Dates</CardTitle>
                  <CardDescription>Your selected stay dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      numberOfMonths={2}
                      className="max-w-md mx-auto"
                      disabled={() => true}
                    />
                    <div className="text-muted-foreground text-sm text-center">
                      {dateRange && dateRange.from && dateRange.to
                        ? `From ${formatDateTime(dateRange.from.toISOString())} to ${formatDateTime(dateRange.to.toISOString())}`
                        : 'Select a start and end date'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mb-8">Error loading estimate details</div>
          )}

          {/* --- Package Selection --- */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Choose Your Package</h2>
            <p className="text-muted-foreground mb-6">Select the package that best fits your stay duration and needs</p>
            
            {/* Package Filter Info */}
            {getPackageFilterInfo() && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  📅 {getPackageFilterInfo()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Some packages may not be available due to minimum/maximum night requirements or seasonal restrictions.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(packageDetails).map(([packageId, packageInfo]) => {
                // Type assertion for packageInfo
                const pkg = packageInfo as EnhancedPackageDetails
                
                const isSelected = selectedPackage === packageId
                
                // Check if this package has a RevenueCat equivalent with fixed pricing
                let revenueCatPackage = null
                if (offerings.length > 0) {
                  revenueCatPackage = offerings.find(rcPkg => {
                    const identifier = rcPkg.webBillingProduct?.identifier;
                    return identifier === pkg.revenueCatId;
                  });
                }
                
                let displayPrice, totalPrice, isFixedPrice = false
                
                if (revenueCatPackage && revenueCatPackage.webBillingProduct) {
                  const product = revenueCatPackage.webBillingProduct as RevenueCatProduct
                  if (product.price) {
                    // RevenueCat package - fixed total price
                    const fixedTotal = Number(product.price)
                    displayPrice = fixedTotal / selectedDuration // Show as "per night" for comparison
                    totalPrice = fixedTotal
                    isFixedPrice = true
                  } else {
                    // Fallback to calculated pricing
                    displayPrice = pkg.price * pkg.multiplier
                    totalPrice = displayPrice * selectedDuration
                  }
                } else {
                  // Local package - calculated pricing
                  displayPrice = pkg.price * pkg.multiplier
                  totalPrice = displayPrice * selectedDuration
                }
                
                return (
                  <Card 
                    key={packageId}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg",
                      isSelected 
                        ? "border-2 border-primary bg-primary/5 shadow-md" 
                        : "border hover:border-primary/50"
                    )}
                    onClick={() => handlePackageSelect(packageId)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {pkg.title}
                            {isSelected && (
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary-foreground" />
                              </div>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {pkg.description}
                          </CardDescription>
                          
                          {/* Duration compatibility indicator */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-xs">
                              {pkg.minNights === 1 && pkg.maxNights >= 365 
                                ? "Any duration" 
                                : `${pkg.minNights}-${pkg.maxNights} nights`}
                            </Badge>
                            {selectedDuration >= pkg.minNights && selectedDuration <= pkg.maxNights && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                ✓ Perfect for {selectedDuration} nights
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Package Pricing */}
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        {isFixedPrice ? (
                          // RevenueCat fixed pricing display
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Package Type:</span>
                              <span className="text-blue-600 font-medium">Fixed Total</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Avg per Night:</span>
                              <span>{formatPrice(displayPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-bold border-t pt-2 mt-2">
                              <span>Total Package:</span>
                              <span className="text-primary">{formatPrice(totalPrice)}</span>
                            </div>
                          </>
                        ) : (
                          // Local calculated pricing display
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Base Rate:</span>
                              <span>{formatPrice(pkg.price)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Multiplier:</span>
                              <span>{pkg.multiplier}x</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium border-t pt-2 mt-2">
                              <span>Per Night:</span>
                              <span className="text-primary">{formatPrice(displayPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-bold">
                              <span>Total ({selectedDuration} nights):</span>
                              <span className="text-primary">{formatPrice(totalPrice)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Features Included:
                        </h4>
                        <ul className="space-y-1">
                          {pkg.features?.slice(0, 3).map((feature: string, index: number) => (
                            <li key={index} className="flex items-start text-sm">
                              <Check className="mr-2 h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                              <span className="leading-tight">{feature}</span>
                            </li>
                          ))}
                          {pkg.features?.length > 3 && (
                            <li className="text-sm text-muted-foreground italic">
                              +{pkg.features.length - 3} more features...
                            </li>
                          )}
                        </ul>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        variant={isSelected ? "default" : "outline"} 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePackageSelect(packageId)
                        }}
                      >
                        {isSelected ? "Selected" : "Select Package"}
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>

            {/* Show message if no packages are available for the duration */}
            {Object.keys(packageDetails).length === 0 && (
              <div className="text-center p-8 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-lg font-medium text-amber-800 mb-2">
                  No packages available for {selectedDuration} nights
                </h3>
                <p className="text-amber-700 text-sm mb-4">
                  The selected stay duration doesn't match any available packages. Try adjusting your dates or contact us for custom arrangements.
                </p>
                <Button variant="outline" onClick={() => setSelectedDuration(1)}>
                  Reset to 1 night
                </Button>
              </div>
            )}

            {/* Selected Package Details */}
            {selectedPackage && packageDetails[selectedPackage] && (
              <div className="mt-8 p-6 bg-primary/5 border-2 border-primary rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-primary">
                  Selected: {packageDetails[selectedPackage]?.title}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {packageDetails[selectedPackage]?.description}
                </div>
              </div>
            )}

            {/* Wine Package Add-on - Only show for non-wine packages */}
            {selectedPackage && selectedPackage !== 'wine_package' && packageDetails.wine_package && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Optional Add-ons</h3>
                <Card 
                  className={cn(
                    "cursor-pointer transition-all",
                    isWineSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  )}
                  onClick={() => setIsWineSelected(!isWineSelected)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {packageDetails.wine_package.title}
                          {isWineSelected && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </CardTitle>
                        <CardDescription>{packageDetails.wine_package.description}</CardDescription>
                        <div className="mt-2 text-sm text-primary font-medium">
                          +{formatPrice(packageDetails.wine_package.price * packageDetails.wine_package.multiplier)} per night
                        </div>
                      </div>
                      <Switch
                        id="wine-package"
                        checked={isWineSelected}
                        onCheckedChange={(checked) => setIsWineSelected(checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
          
        
        </TabsContent>






        <TabsContent value="guests">
          {/* --- Customer & Guests Section --- */}
          <div className="mb-8 max-w-screen-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Guests</h2>
              {data &&
                'customer' in data &&
                typeof data?.customer !== 'string' &&
                data.customer?.id === user.id && (
                  <InviteUrlDialog
                    estimateId={data.id}
                    type="estimates"
                    trigger={
                      <Button>
                        <span>Invite Guest</span>
                      </Button>
                    }
                  />
                )}
            </div>
            <div className="mt-2 space-y-3">
              <div className="shadow-sm p-2 border border-border rounded-lg flex items-center gap-2">
                <div className="p-2 border border-border rounded-full">
                  <UserIcon className="size-6" />
                </div>
                <div>
                  <div>{typeof data.customer === 'string' ? 'Customer' : data.customer?.name}</div>
                  <div className="font-medium text-sm">Customer</div>
                </div>
              </div>
              {guests.map((guest) => (
                <div key={guest.id} className="shadow-sm p-2 border border-border rounded-lg flex items-center gap-2">
                  <div className="p-2 border border-border rounded-full">
                    <UserIcon className="size-6" />
                  </div>
                  <div>
                    <div>{guest.name}</div>
                    <div className="font-medium text-sm">Guest</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sticky Footer for Mobile / Bottom Summary for Desktop */}
      <div className="sticky-footer md:bg-muted md:rounded-lg md:border md:mt-8">
        <div className="sticky-footer-container">
          {paymentError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{paymentError}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-4">
            {/* Price Display */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-bold">
                  {formatPrice(calculateTotalPrice())}
                </span>
                <span className="text-sm text-muted-foreground">total</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedDuration} night{selectedDuration !== 1 ? 's' : ''}</span>
                {selectedPackage && packageDetails[selectedPackage] && (
                  <>
                    <span>•</span>
                    <span>{packageDetails[selectedPackage].title}</span>
                  </>
                )}
                {isWineSelected && (
                  <>
                    <span>•</span>
                    <span>Wine add-on</span>
                  </>
                )}
              </div>
            </div>

            {/* Complete Estimate Button */}
            <Button
              onClick={handleEstimate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold px-6 py-3 h-auto min-w-[140px] md:min-w-[180px]"
              disabled={paymentLoading || paymentSuccess || !_postId || !selectedPackage}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : paymentSuccess ? (
                "Confirmed!"
              ) : !_postId ? (
                "Missing Info"
              ) : !selectedPackage ? (
                "Select Package"
              ) : (
                <>
                  <span className="hidden md:inline">Complete Estimate</span>
                  <span className="md:hidden">Book Now</span>
                </>
              )}
            </Button>
          </div>

          {/* Error Messages */}
          <div className="mt-2">
            {!_postId && (
              <p className="text-red-500 text-xs">
                Property information is missing. Please start from the property page.
              </p>
            )}
            {!selectedPackage && (
              <p className="text-red-500 text-xs">
                Please select a package to continue.
              </p>
            )}
            {paymentSuccess && (
              <p className="text-green-600 text-xs text-center">
                🎉 Estimate confirmed! Redirecting to booking confirmation...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 