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

  // Get packages from the centralized system with fallback to post data
  const getPackageDetails = () => {
    console.log('Post data:', _post)
    console.log('Post packageTypes:', _post?.packageTypes)
    
    // First try to use centralized package types
    const centralizedPackages = getAllPackageTypes()
    if (centralizedPackages && Object.keys(centralizedPackages).length > 0) {
      // Convert centralized packages to the format expected by the component
      const packageDetails: any = {}
      Object.entries(centralizedPackages).forEach(([key, pkg]) => {
        packageDetails[key] = {
          id: key,
          title: pkg.name,
          description: pkg.description,
          multiplier: pkg.multiplier,
          features: pkg.features,
          revenueCatId: pkg.revenueCatId,
          price: _post?.baseRate || 150,
        }
      })
      console.log('Using centralized packages:', packageDetails)
      return packageDetails
    }
    
    // Fallback to post packageTypes if centralized system is not available
    if (_post?.packageTypes && Array.isArray(_post.packageTypes) && _post.packageTypes.length > 0) {
      // Convert post packageTypes to the format expected by the component
      const postPackages: any = {}
      _post.packageTypes.forEach((pkg: any, index: number) => {
        const packageKey = pkg.name.toLowerCase().replace(/\s+/g, '_')
        postPackages[packageKey] = {
          id: packageKey,
          title: pkg.name,
          description: pkg.description || '',
          multiplier: pkg.multiplier || 1,
          features: Array.isArray(pkg.features) 
            ? pkg.features.map((f: any) => typeof f === 'string' ? f : f.feature || '').filter((f: string) => f.trim())
            : [],
          revenueCatId: pkg.revenueCatId || packageKey,
          price: pkg.price || 0,
        }
      })
      console.log('Generated post packages:', postPackages)
      return postPackages
    }
    
    // Final fallback to default packages
    const defaultPackages = {
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
      }
    }
    console.log('Using default packages:', defaultPackages)
    return defaultPackages
  }

  const packageDetails = getPackageDetails()

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
        return
      }

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
    } catch (error) {
      console.error('Error loading offerings:', error)
      // Don't throw the error, just log it and continue with empty offerings
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

    // If we have RevenueCat offerings, try to use them
    if (offerings.length > 0) {
      const packageToUse = offerings.find(pkg => 
        pkg.webBillingProduct?.identifier === selectedPackageDetails.revenueCatId
      )

      if (packageToUse?.webBillingProduct) {
        const product = packageToUse.webBillingProduct as RevenueCatProduct
        if (product.price) {
          const basePrice = Number(product.price)
          const multiplier = selectedPackageDetails.multiplier ?? 1.0
          const calculatedPrice = basePrice * multiplier
          setPackagePrice(calculatedPrice)
          return
        }
      }
    }

    // Fallback to estimate total or post base rate if RevenueCat is not available
    const basePrice = _bookingTotal > 0 ? _bookingTotal : (selectedPackageDetails.price || (_post?.baseRate || 150))
    const multiplier = selectedPackageDetails.multiplier ?? 1.0
    const calculatedPrice = basePrice * multiplier
    setPackagePrice(calculatedPrice)
  }, [selectedPackage, offerings, _bookingTotal, packageDetails, _post?.baseRate])

  const calculateTotalPrice = () => {
    if (!packagePrice || !selectedDuration) return null
    return packagePrice * selectedDuration
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A"
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

      // Try to find RevenueCat package if offerings are available
      let estimatePackage = null
      if (offerings.length > 0) {
        estimatePackage = offerings.find(pkg => {
          const identifier = pkg.webBillingProduct?.identifier;
          return identifier === selectedPackageDetails.revenueCatId;
        });
      }

      if (!estimatePackage && offerings.length > 0) {
        throw new Error(`Estimate package not found for ${selectedPackageDetails.revenueCatId}. Please contact support.`)
      }

      // --- RevenueCat Payment Flow (if available) ---
      if (estimatePackage) {
        try {
          const purchaseResult = await Purchases.getSharedInstance().purchase({
            rcPackage: estimatePackage,
          })
          // Optionally: console.log("Purchase successful:", purchaseResult)
        } catch (purchaseError) {
          // Handle specific RevenueCat error codes
          if (purchaseError instanceof Error) {
            const rcError = purchaseError as RevenueCatError
            if (rcError.code === ErrorCode.UserCancelledError) {
              setPaymentError("Purchase was cancelled. Please try again if you'd like to complete your estimate.")
              return
            }
            if (rcError.code === ErrorCode.PurchaseInvalidError) {
              setPaymentError("There was an issue with the purchase. Please try again or contact support.")
              return
            }
            if (rcError.code === ErrorCode.NetworkError) {
              setPaymentError("Network error occurred. Please check your connection and try again.")
              return
            }
          }
          setPaymentError("Failed to complete purchase. Please try again or contact support.")
          return
        }
      } else {
        // If no RevenueCat package is available, proceed without payment processing
        console.log("No RevenueCat package available, proceeding with estimate confirmation only")
      }

      // After successful purchase (or if no RevenueCat), confirm the estimate in backend
      const fromDate = new Date(data.fromDate)
      const toDate = new Date(data.toDate)
      const estimateData = {
        postId: _postId,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        guests: [],
        baseRate: packagePrice,
        duration: selectedDuration,
        customer: user.id,
        packageType: selectedPackage,
      }
      const response = await fetch(`/api/estimates/${data.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to confirm estimate')
      }
      const result = await response.json();
      setPaymentSuccess(true)
      
      // Check if a booking was created and redirect accordingly
      if (result.booking && result.booking.id) {
        setTimeout(() => {
          router.push(`/booking-confirmation?bookingId=${result.booking.id}`)
        }, 1500)
      } else {
        // Fallback to the original redirect if no booking ID is available
        setTimeout(() => {
          router.push(`/booking-confirmation?total=${packagePrice}&duration=${selectedDuration}`)
        }, 1500)
      }
    } catch (error) {
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
              <h2 className="text-3xl font-semibold mb-2">R{_bookingTotal}</h2>
              <p className="text-lg text-muted-foreground">Total for {_bookingDuration} nights</p>
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
            <div className="flex items-start flex-col md:flex-row gap-5 md:gap-10 mb-8">
              <div className="md:py-5 py-3">
                <h1 className="text-4xl mb-3 font-bold">{data?.post.title}</h1>
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium">Estimate Dates:</label>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    numberOfMonths={2}
                    className="max-w-md"
                    disabled={() => true}
                  />
                  <div className="text-muted-foreground text-sm mt-1">
                    {dateRange && dateRange.from && dateRange.to
                      ? `From ${formatDateTime(dateRange.from.toISOString())} to ${formatDateTime(dateRange.to.toISOString())}`
                      : 'Select a start and end date'}
                  </div>
                </div>
              </div>
              <div className="w-full rounded-md overflow-hidden bg-muted p-2 flex items-center gap-3">
                {!!data?.post.meta?.image && (
                  <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border border-border bg-white">
                    <Media
                      resource={data?.post.meta?.image || undefined}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col text-white">
                <span className="font-medium">Date Estimated: {formatDateTime(data?.createdAt)}</span>
                <span className="font-medium">Guests: {Array.isArray(data?.guests) ? data.guests.length : 0}</span>
              </div>
              </div>
            </div>
          ) : (
            <div className="mb-8">Error loading estimate details</div>
          )}

          {/* --- Package Selection --- */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Selected Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main Package */}
              <Card className="border-2 border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle>
                    {selectedPackage ? packageDetails[selectedPackage as keyof typeof packageDetails]?.title : "Loading..."}
                  </CardTitle>
                  <CardDescription>
                    {selectedPackage ? packageDetails[selectedPackage as keyof typeof packageDetails]?.description : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPackage && packageDetails[selectedPackage as keyof typeof packageDetails]?.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="mr-2 h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <span className="text-2xl font-bold">
                    {formatPrice(packagePrice)} with membership
                  </span>
                </CardFooter>
              </Card>
              {/* Wine Package Card */}
              <div className="col-span-full">
                {packageDetails.wine && (
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all",
                      isWineSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    )}
                    onClick={() => setIsWineSelected(!isWineSelected)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{packageDetails.wine.title}</CardTitle>
                          <CardDescription>{packageDetails.wine.description}</CardDescription>
                        </div>
                        <Switch
                          id="wine-package"
                          checked={isWineSelected}
                          onCheckedChange={(checked) => {
                            setIsWineSelected(checked)
                          }}
                          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking switch
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {packageDetails.wine.features && packageDetails.wine.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center text-sm">
                            <Check className="mr-2 h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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
              <span className="text-muted-foreground">With membership:</span>
              <span className="font-medium">
                {formatPrice(packagePrice)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{selectedDuration} nights</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-2xl font-bold">
                {formatPrice(_bookingTotal)}
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
                `Complete Estimate - ${formatPrice(_bookingTotal)}`
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
          </div>
    </div>
  )
} 