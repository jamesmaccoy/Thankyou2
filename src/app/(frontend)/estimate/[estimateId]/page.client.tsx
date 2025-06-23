'use client'

import { useState, useEffect, useCallback } from 'react'
import { Estimate, User } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRevenueCat } from '@/providers/RevenueCat'
import { Purchases, type Package, ErrorCode, type Product } from '@revenuecat/purchases-js'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import InviteUrlDialog from './_components/invite-url-dialog'
import { Media } from '@/components/Media'
import { formatDateTime } from '@/utilities/formatDateTime'
import { UserIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import Link from 'next/link'
import { format } from 'date-fns'

interface RevenueCatError extends Error {
  code?: ErrorCode
}

interface RevenueCatProduct extends Product {
  price?: number
  priceString?: string
  currencyCode?: string
}

type Props = {
  data: Estimate
  user: User
}

export default function EstimateDetailsClientPage({ data, user }: Props) {
  const router = useRouter()
  const { isInitialized } = useRevenueCat()

  // Use estimate data for totals and duration
  // const bookingTotal = data?.total ?? 'N/A' // REMOVE, not in Estimate type
  // const bookingDuration = data?.duration ?? (
  //   data?.fromDate && data?.toDate
  //     ? Math.max(1, Math.round((new Date(data.toDate).getTime() - new Date(data.fromDate).getTime()) / (1000 * 60 * 60 * 24)))
  //     : 'N/A'
  // )
  // Instead, calculate duration and use a fallback for total
  const _bookingDuration =
    data?.fromDate && data?.toDate
      ? Math.max(
          1,
          Math.round(
            (new Date(data.toDate).getTime() - new Date(data.fromDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 1
  const _bookingTotal = data?.total ?? 0
  const _postId = typeof data?.post === 'object' && data?.post?.id ? data.post.id : ''

  const [guests, setGuests] = useState<User[]>(
    Array.isArray(data.guests) ? (data.guests.filter((g) => typeof g !== 'string') as User[]) : [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [offerings, setOfferings] = useState<Package[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(
    typeof _bookingDuration === 'number' ? _bookingDuration : 1,
  )
  const [isWineSelected, setIsWineSelected] = useState(false)
  const [packagePrice, setPackagePrice] = useState<number | null>(null)

  const [areDatesAvailable, setAreDatesAvailable] = useState(true)
  const [availabilityError, setAvailabilityError] = useState('')

  // Add state for date range selection
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: data?.fromDate ? new Date(data.fromDate) : undefined,
    to: data?.toDate ? new Date(data.toDate) : undefined,
  })

  const checkAvailability = useCallback(
    async (fromDate: string, toDate: string) => {
      const postId = typeof data.post === 'string' ? data.post : data.post?.id

      const response = await fetch(
        `/api/bookings/check-availability?postId=${postId}&startDate=${fromDate}&endDate=${toDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const result = await response.json()

      if (!response.ok) {
        setAvailabilityError(result.message || 'Failed to check availability')
        return
      }

      setAreDatesAvailable(!!result.isAvailable)
    },
    [data],
  )

  useEffect(() => {
    checkAvailability(
      format(new Date(data.fromDate), 'yyyy-MM-dd'),
      format(new Date(data.toDate), 'yyyy-MM-dd'),
    )
  }, [checkAvailability, data])

  // Define package tiers with their thresholds and multipliers
  const packageTiers = [
    {
      id: 'per_night',
      title: 'Per Night',
      description: 'Standard nightly rate',
      minNights: 1,
      maxNights: 1,
      multiplier: 1.0,
      features: ['Standard accommodation', 'Basic amenities', 'Self-service'],
    },
    {
      id: 'three_nights',
      title: '3 Night Package',
      description: 'Special rate for 3+ nights',
      minNights: 2,
      maxNights: 3,
      multiplier: 0.9,
      features: [
        'Standard accommodation',
        'Basic amenities',
        'Self-service',
        '10% discount on total',
      ],
    },
    {
      id: 'Weekly',
      title: 'Weekly Package',
      description: 'Best value for week-long stays',
      minNights: 4,
      maxNights: 7,
      multiplier: 0.8,
      features: [
        'Standard accommodation',
        'Basic amenities',
        'Self-service',
        '20% discount on total',
      ],
    },
    {
      id: '2Xweekly',
      title: '2X Weekly Package',
      description: 'Extended stay special rate',
      minNights: 8,
      maxNights: 13,
      multiplier: 0.7,
      features: [
        'Standard accommodation',
        'Basic amenities',
        'Self-service',
        '30% discount on total',
        'Extended stay benefits',
      ],
    },
    {
      id: 'weekX3',
      title: '3 Week Package',
      description: 'Long-term stay special rate',
      minNights: 14,
      maxNights: 28,
      multiplier: 0.5,
      features: [
        'Standard accommodation',
        'Basic amenities',
        'Self-service',
        '50% discount on total',
        'Extended stay benefits',
        'Priority booking for future stays',
      ],
    },
    {
      id: 'monthly',
      title: 'Monthly Package',
      description: 'Extended stay rate',
      minNights: 29,
      maxNights: 365,
      multiplier: 0.7,
      features: [
        'Standard accommodation',
        'Basic amenities',
        'Self-service',
        '30% discount on total',
      ],
    },
  ]

  // Create packageDetails from packageTiers
  const packageDetails = {
    per_night: {
      ...packageTiers[0],
      revenueCatId: 'pn',
    },
    per_night_luxury: {
      ...packageTiers[0],
      title: 'Luxury Night',
      description: 'Premium nightly rate',
      multiplier: 1.5,
      features: ['Premium accommodation', 'Enhanced amenities', 'Priority service'],
      revenueCatId: 'per_night_luxury',
    },
    three_nights: {
      ...packageTiers[1],
      revenueCatId: '3nights',
    },
    hosted3nights: {
      ...packageTiers[1],
      title: 'Hosted 3 Nights',
      description: 'Premium 3-night experience',
      multiplier: 1.4,
      features: [
        'Premium accommodation',
        'Dedicated host',
        'Enhanced amenities',
        'Priority service',
      ],
      revenueCatId: 'hosted3nights',
    },
    Weekly: {
      ...packageTiers[2],
      revenueCatId: 'Weekly',
    },
    hosted7nights: {
      ...packageTiers[2],
      title: 'Hosted Weekly',
      description: 'Premium week-long experience',
      multiplier: 1.3,
      features: [
        'Premium accommodation',
        'Dedicated host',
        'Enhanced amenities',
        'Priority service',
        '15% discount on total',
      ],
      revenueCatId: 'hosted7nights',
    },
    '2Xweekly': {
      ...packageTiers[3],
      revenueCatId: '2Xweekly',
    },
    weekX3: {
      ...packageTiers[4],
      revenueCatId: 'weekX3',
    },
    monthly: {
      ...packageTiers[5],
      revenueCatId: 'monthly',
    },
    wine: {
      title: 'Wine Package',
      description: 'Includes wine tasting and selection platters',
      multiplier: 1.5,
      minNights: 1,
      maxNights: 365,
      features: [
        'Standard accommodation',
        'Wine tasting experience',
        'Curated wine selection',
        'Sommelier consultation',
      ],
      revenueCatId: 'Bottle_wine',
    },
  }

  // Determine package based on duration and wine selection
  useEffect(() => {
    if (!_bookingDuration) return

    const duration = Number(_bookingDuration)
    let packageId = 'per_night'

    // If wine package is selected, use the corresponding luxury package
    if (isWineSelected) {
      if (duration >= 29) {
        packageId = 'monthly'
      } else if (duration >= 14) {
        packageId = 'hosted7nights'
      } else if (duration >= 3) {
        packageId = 'hosted3nights'
      } else {
        packageId = 'per_night_luxury'
      }
    } else {
      // Find the appropriate package tier based on duration
      const selectedTier = packageTiers.find(
        (tier) => duration >= tier.minNights && duration <= tier.maxNights,
      )

      if (selectedTier) {
        packageId = selectedTier.id
      } else {
        // Fallback to per night if no tier matches
        packageId = 'per_night'
      }
    }

    setSelectedPackage(packageId)
    setSelectedDuration(duration)
  }, [_bookingDuration, isWineSelected])

  // Load RevenueCat offerings when initialized
  useEffect(() => {
    if (isInitialized) {
      loadOfferings()
    }
  }, [isInitialized])

  const loadOfferings = async () => {
    setLoadingOfferings(true)
    try {
      const fetchedOfferings = await Purchases.getSharedInstance().getOfferings()
      console.log('Offerings:', fetchedOfferings)
      const perNightOffering = fetchedOfferings.all['per_night']
      if (perNightOffering && perNightOffering.availablePackages.length > 0) {
        setOfferings(perNightOffering.availablePackages)
      } else {
        setOfferings([])
      }
    } catch (err) {
      setPaymentError('Failed to load booking options')
    } finally {
      setLoadingOfferings(false)
    }
  }

  // Update package price when package or duration changes
  useEffect(() => {
    if (!selectedPackage || !offerings.length) return

    const selectedPackageDetails = packageDetails[selectedPackage]
    if (!selectedPackageDetails) return

    const packageToUse = offerings.find(
      (pkg) => pkg.webBillingProduct?.identifier === selectedPackageDetails.revenueCatId,
    )

    if (packageToUse?.webBillingProduct) {
      const product = packageToUse.webBillingProduct as RevenueCatProduct
      if (product.price) {
        const basePrice = Number(product.price)
        const multiplier = selectedPackageDetails.multiplier
        const calculatedPrice = basePrice * multiplier
        setPackagePrice(calculatedPrice)
      } else {
        const basePrice = Number(_bookingTotal)
        const multiplier = selectedPackageDetails.multiplier
        const calculatedPrice = basePrice * multiplier
        setPackagePrice(calculatedPrice)
      }
    } else {
      const basePrice = Number(_bookingTotal)
      const multiplier = selectedPackageDetails.multiplier
      const calculatedPrice = basePrice * multiplier
      setPackagePrice(calculatedPrice)
    }
  }, [selectedPackage, offerings, _bookingTotal])

  const calculateTotalPrice = () => {
    if (!packagePrice || !selectedDuration) return null
    return packagePrice * selectedDuration
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A'
    return `R${price.toFixed(2)}`
  }

  const handleEstimate = async () => {
    if (!areDatesAvailable) return

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      const selectedPackageDetails = selectedPackage ? packageDetails[selectedPackage] : null
      if (!selectedPackageDetails) {
        throw new Error('No package selected')
      }
      const estimatePackage = offerings.find((pkg) => {
        const identifier = pkg.webBillingProduct?.identifier
        return identifier === selectedPackageDetails.revenueCatId
      })
      if (!estimatePackage) {
        throw new Error(
          `Estimate package not found for ${selectedPackageDetails.revenueCatId}. Please contact support.`,
        )
      }

      // --- RevenueCat Payment Flow (mirroring booking) ---
      try {
        const purchaseResult = await Purchases.getSharedInstance().purchase({
          rcPackage: estimatePackage,
        })
        // Optionally: console.log("Purchase successful:", purchaseResult)

        // After successful purchase, confirm the estimate in backend
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
        const result = await response.json()
        setPaymentSuccess(true)
        setTimeout(() => {
          router.push(`/booking-confirmation?total=${packagePrice}&duration=${selectedDuration}`)
        }, 1500)
      } catch (purchaseError) {
        // Handle specific RevenueCat error codes
        if (purchaseError instanceof Error) {
          const rcError = purchaseError as RevenueCatError
          if (rcError.code === ErrorCode.UserCancelledError) {
            setPaymentError(
              "Purchase was cancelled. Please try again if you'd like to complete your estimate.",
            )
            return
          }
          if (rcError.code === ErrorCode.PurchaseInvalidError) {
            setPaymentError(
              'There was an issue with the purchase. Please try again or contact support.',
            )
            return
          }
          if (rcError.code === ErrorCode.NetworkError) {
            setPaymentError('Network error occurred. Please check your connection and try again.')
            return
          }
        }
        setPaymentError('Failed to complete purchase. Please try again or contact support.')
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred')
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
          <TabsTrigger
            value="details"
            className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            <FileText className="h-5 w-5" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="guests"
            className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
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
                      ? `From ${formatDateTime(dateRange.from)} to ${formatDateTime(dateRange.to)}`
                      : 'Select a start and end date'}
                  </div>
                  {!areDatesAvailable && (
                    <div className="text-red-400">
                      The selected dates are not availabe for booking. Please create a new estimate
                      with different dates.
                      {typeof data.post === 'object' && data.post.slug && (
                        <Button asChild variant="link" className="py-0 h-max px-0">
                          <Link href={`/posts/${data.post.slug}`}>Create New Estimate</Link>
                        </Button>
                      )}
                    </div>
                  )}
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
                  <span className="font-medium">
                    Date Estimated: {formatDateTime(data?.createdAt)}
                  </span>
                  <span className="font-medium">
                    Guests: {Array.isArray(data?.guests) ? data.guests.length : 0}
                  </span>
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
                    {selectedPackage ? packageDetails[selectedPackage]?.title : 'Loading...'}
                  </CardTitle>
                  <CardDescription>
                    {selectedPackage ? packageDetails[selectedPackage]?.description : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPackage &&
                      packageDetails[selectedPackage]?.features.map((feature, index) => (
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
              {/* Wine Package Add-on */}
              <Card
                className={cn(
                  'border-2 border-border shadow-lg transition-all cursor-pointer',
                  isWineSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
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
                    {packageDetails.wine.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="mr-2 h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
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
                <div
                  key={guest.id}
                  className="shadow-sm p-2 border border-border rounded-lg flex items-center gap-2"
                >
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
            {selectedPackage ? packageDetails[selectedPackage]?.title : 'Not selected'}
          </span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground">With membership:</span>
          <span className="font-medium">{formatPrice(packagePrice)}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground">Duration:</span>
          <span className="font-medium">{selectedDuration} nights</span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-muted-foreground">Total:</span>
          <span className="text-2xl font-bold">{formatPrice(_bookingTotal)}</span>
        </div>
        {/* Complete Estimate Button */}
        <Button
          onClick={handleEstimate}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={
            paymentLoading || paymentSuccess || !_postId || !selectedPackage || !areDatesAvailable
          }
        >
          {paymentLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : paymentSuccess ? (
            'Estimate Confirmed!'
          ) : !_postId ? (
            'Missing Property Information'
          ) : !selectedPackage ? (
            'Please Select a Package'
          ) : !areDatesAvailable ? (
            'Dates Not Available'
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
          <p className="text-red-500 text-sm mt-2">Please select a package to continue.</p>
        )}
      </div>
    </div>
  )
}
