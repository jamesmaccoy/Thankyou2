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
  const _postId = typeof data?.post === 'object' && data?.post?.id ? data.post.id : ''
  const _post = typeof data?.post === 'object' ? data.post : null

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
        
        // Filter by duration
        const withinDuration = selectedDuration >= packageInfo.minNights && selectedDuration <= packageInfo.maxNights
        
        // Filter by season (if package has season restrictions)
        const seasonMatch = packageInfo.availableSeasons.includes('all') || 
                           packageInfo.availableSeasons.includes(currentSeason)
        
        return withinDuration && seasonMatch
      })
    )
  }

  // Get packages from the centralized system with proper post integration
  const getPackageDetails = (): Record<string, EnhancedPackageDetails> => {
    console.log('Post data:', _post)
    console.log('Post packageTypes:', _post?.packageTypes)
    
    // Always try centralized packages first, but integrate with post data
    const centralizedPackages = getAllPackageTypes()
    if (centralizedPackages && Object.keys(centralizedPackages).length > 0) {
      const packageDetails: Record<string, EnhancedPackageDetails> = {}
      Object.entries(centralizedPackages).forEach(([key, pkg]) => {
        // Use post's base rate as the pricing basis
        const basePrice = _post?.baseRate || 150
        
        packageDetails[key] = {
          id: key,
          title: pkg.name,
          description: pkg.description,
          multiplier: pkg.multiplier,
          features: pkg.features,
          revenueCatId: pkg.revenueCatId,
          price: basePrice, // Use the post's base rate
          minNights: pkg.minNights || 1,
          maxNights: pkg.maxNights || 365,
          availableSeasons: ['all'], // Default to all seasons for now
        }
      })
      console.log('Using centralized packages with post integration:', packageDetails)
      return packageDetails
    }
    
    // Fallback to post packageTypes if centralized system is not available
    if (_post?.packageTypes && Array.isArray(_post.packageTypes) && _post.packageTypes.length > 0) {
      const postPackages: Record<string, EnhancedPackageDetails> = {}
      _post.packageTypes.forEach((pkg: any) => {
        const packageKey = pkg.templateId || pkg.name.toLowerCase().replace(/\s+/g, '_')
        postPackages[packageKey] = {
          id: packageKey,
          title: pkg.name,
          description: pkg.description || '',
          multiplier: pkg.multiplier || 1,
          features: Array.isArray(pkg.features) 
            ? pkg.features.map((f: any) => typeof f === 'string' ? f : f.feature || '').filter((f: string) => f.trim())
            : [],
          revenueCatId: pkg.revenueCatId || packageKey,
          price: pkg.price || (_post?.baseRate || 150),
          minNights: pkg.minNights || 1,
          maxNights: pkg.maxNights || 365,
          availableSeasons: ['all'], // Default to all seasons
        }
      })
      console.log('Using post packages:', postPackages)
      return postPackages
    }
    
    // Final fallback to default packages
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
        price: _post?.baseRate || 150,
        minNights: 1,
        maxNights: 365,
        availableSeasons: ['all'],
      }
    }
    console.log('Using default packages:', defaultPackages)
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

  // Set initial selected package to the first available package
  React.useEffect(() => {
    if (!selectedPackage && Object.keys(packageDetails).length > 0) {
      const firstPackageKey = Object.keys(packageDetails)[0]
      setSelectedPackage(firstPackageKey || null)
    }
  }, [selectedPackage, packageDetails])

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
    const selectedPkg = packageDetails[packageId]
    if (selectedPkg) {
      const basePrice = selectedPkg.price || (_post?.baseRate || 150)
      const calculatedPrice = basePrice * selectedPkg.multiplier * selectedDuration
      setPackagePrice(calculatedPrice)
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
        const basePrice = Number(product.price)
        const multiplier = selectedPackageDetails.multiplier ?? 1.0
        const calculatedPrice = basePrice * multiplier * selectedDuration
        setPackagePrice(calculatedPrice)
        console.log('Using RevenueCat pricing:', { basePrice, multiplier, duration: selectedDuration, total: calculatedPrice })
        return
      }
    }

    // Fallback to local pricing calculation
    const basePrice = selectedPackageDetails.price || (_post?.baseRate || 150)
    const multiplier = selectedPackageDetails.multiplier ?? 1.0
    const calculatedPrice = basePrice * multiplier * selectedDuration
    setPackagePrice(calculatedPrice)
    console.log('Using fallback pricing:', { basePrice, multiplier, duration: selectedDuration, total: calculatedPrice })
  }, [selectedPackage, offerings, selectedDuration, packageDetails, _post?.baseRate])

  const calculateTotalPrice = () => {
    const totalPrice = packagePrice || 0
    const winePrice = isWineSelected && packageDetails.wine_package 
      ? (packageDetails.wine_package.price * packageDetails.wine_package.multiplier * selectedDuration)
      : 0
    return totalPrice + winePrice
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
        
        console.log('Found RevenueCat package:', estimatePackage ? 'Yes' : 'No')
      }

      // Track payment success status
      let paymentProcessed = false
      let purchaseResult = null

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
        // If we have offerings but no matching package, this is an error
        throw new Error(`Payment package not found for ${selectedPackageDetails.title}. Please contact support.`)
      } else {
        // If no RevenueCat offerings are loaded, warn but allow to proceed
        console.warn("No RevenueCat offerings available, proceeding with estimate confirmation only")
      }

      // Only proceed with booking creation if payment was successful OR no payment was required
      if (paymentProcessed || offerings.length === 0) {
        // After successful purchase (or if no RevenueCat), confirm the estimate in backend
        const estimateData = {
          postId: _postId,
          fromDate: data.fromDate,
          toDate: data.toDate,
          guests: Array.isArray(data.guests) ? data.guests.map(g => typeof g === 'string' ? g : g.id) : [],
          baseRate: finalTotal,
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

  if (loading || loadingOfferings) {
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
    <div className="container py-10">
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Estimate Details</h1>
      <Tabs defaultValue="details" className="max-w-screen-lg mx-auto">

          {/* --- Summary Header Section --- */}
          <div className="pt-12 pb-6">
            <div className="bg-muted p-6 rounded-lg border border-border mb-6 text-center">
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
                    {!!data?.post.meta?.image && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-border bg-white">
                        <Media
                          resource={data?.post.meta?.image || undefined}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <h1 className="text-2xl font-bold">{data?.post.title}</h1>
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
                const calculatedPrice = pkg.price * pkg.multiplier
                const totalPrice = calculatedPrice * selectedDuration
                
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
                          <span className="text-primary">{formatPrice(calculatedPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>Total ({selectedDuration} nights):</span>
                          <span className="text-primary">{formatPrice(totalPrice)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Features Included:
                        </h4>
                        <ul className="space-y-1">
                          {pkg.features?.slice(0, 4).map((feature: string, index: number) => (
                            <li key={index} className="flex items-start text-sm">
                              <Check className="mr-2 h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                              <span className="leading-tight">{feature}</span>
                            </li>
                          ))}
                          {pkg.features?.length > 4 && (
                            <li className="text-sm text-muted-foreground italic">
                              +{pkg.features.length - 4} more features...
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Complete Features List:</h4>
                    <ul className="space-y-1">
                      {packageDetails[selectedPackage]?.features?.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="mr-2 h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Pricing Breakdown:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base Rate per Night:</span>
                        <span>{formatPrice(packageDetails[selectedPackage]?.price || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Package Multiplier:</span>
                        <span>{packageDetails[selectedPackage]?.multiplier || 1}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Adjusted Rate per Night:</span>
                        <span>{formatPrice((packageDetails[selectedPackage]?.price || 0) * (packageDetails[selectedPackage]?.multiplier || 1))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{selectedDuration} nights</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Package Price:</span>
                        <span className="text-primary">{formatPrice(packagePrice || 0)}</span>
                      </div>
                    </div>
                  </div>
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
                  <CardContent>
                    <ul className="space-y-1">
                      {packageDetails.wine_package.features && packageDetails.wine_package.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="mr-2 h-3 w-3 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
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

        {/* --- Estimate Summary --- */}
        <div className="mb-8 bg-muted p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold mb-4">Estimate Summary</h2>
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Package:</span>
              <span className="font-medium">
                {selectedPackage ? packageDetails[selectedPackage as keyof typeof packageDetails]?.title : "Not selected"}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Package Total:</span>
              <span className="font-medium">
                {formatPrice(packagePrice)}
              </span>
            </div>
            {isWineSelected && packageDetails.wine_package && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Wine Package Add-on:</span>
                <span className="font-medium">
                  {formatPrice(packageDetails.wine_package.price * packageDetails.wine_package.multiplier * selectedDuration)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{selectedDuration} nights</span>
            </div>
            {paymentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{paymentError}</p>
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-2xl font-bold">
                {formatPrice(calculateTotalPrice())}
              </span>
            </div>
            {/* Complete Estimate Button */}
            <Button
              onClick={handleEstimate}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={paymentLoading || paymentSuccess || !_postId || !selectedPackage}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : paymentSuccess ? (
                "Estimate Confirmed!"
              ) : !_postId ? (
                "Missing Property Information"
              ) : !selectedPackage ? (
                "Please Select a Package"
              ) : (
                `Complete Estimate - ${formatPrice(calculateTotalPrice())}`
              )}
            </Button>
            {!_postId && (
              <p className="text-red-500 text-sm mt-2">
                Property information is missing. Please start from the property page.
              </p>
            )}
            {!selectedPackage && (
              <p className="text-red-500 text-sm mt-2">
                Please select a package to continue.
              </p>
            )}
            {paymentSuccess && (
              <p className="text-green-600 text-sm mt-2 text-center">
                🎉 Estimate confirmed successfully! Redirecting to booking confirmation...
              </p>
            )}
          </div>
    </div>
  )
} 