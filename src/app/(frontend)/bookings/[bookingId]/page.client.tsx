'use client'

import { Media } from '@/components/Media'
import { Booking, User } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import { PlusCircleIcon, TrashIcon, UserIcon, FileText } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import InviteUrlDialog from './_components/invite-url-dialog'
import { Button } from '@/components/ui/button'
import { Purchases, type Package, type Product } from '@revenuecat/purchases-js'
import { useRevenueCat } from '@/providers/RevenueCat'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import { getPackageById, getAllPackageTypes } from '@/lib/package-types'

type Props = {
  data: Booking
  user: User
}

interface RevenueCatProduct extends Product {
  price?: number;
  priceString?: string;
  currencyCode?: string;
}

// Helper to format and convert price
function formatPriceWithUSD(product: RevenueCatProduct) {
  const price = product.price;
  const priceString = product.priceString;
  const currency = product.currencyCode || 'ZAR';
  // Fallback: if price is undefined, show N/A
  if (typeof price !== 'number') return 'N/A';
  // If already USD, just show
  if (currency === 'USD') return `$${price.toFixed(2)}`;
  // Convert ZAR to USD (example rate: 1 USD = 18 ZAR)
  const usd = price / 18;
  return `${priceString || `R${price.toFixed(2)}`} / $${usd.toFixed(2)}`;
}

// Package details mapping
const packageDetails = {
  per_night: {
    name: "Per Night",
    description: "Standard nightly rate",
    features: ["Standard accommodation", "Basic amenities"]
  },
  per_night_luxury: {
    name: "Luxury Night",
    description: "Premium nightly rate",
    features: ["Premium accommodation", "Enhanced amenities", "Priority service"]
  },
  three_nights: {
    name: "3 Nights Package",
    description: "Three night stay",
    features: ["Standard accommodation", "5% discount"]
  },
  hosted3nights: {
    name: "Hosted 3 Nights",
    description: "Premium 3-night experience",
    features: ["Premium accommodation", "Dedicated host", "Enhanced amenities", "Priority service"]
  },
  weekly: {
    name: "Weekly Package",
    description: "Seven night stay",
    features: ["Standard accommodation", "15% discount on total"]
  },
  hosted7nights: {
    name: "Hosted Weekly",
    description: "Premium week-long experience",
    features: ["Premium accommodation", "Dedicated host", "Enhanced amenities", "Priority service", "15% discount on total"]
  },
  monthly: {
    name: "Monthly Package",
    description: "Extended month-long stay",
    features: ["Standard accommodation", "30% discount", "Extended stay perks"]
  },
  wine: {
    name: "Wine Package",
    description: "Includes wine tasting and selection platters",
    features: ["Standard accommodation", "Wine tasting experience", "Curated wine selection", "Sommelier consultation"]
  }
} as const

// Helper function to get package details from centralized system
const getPackageDetails = (packageType: string | null) => {
  if (!packageType) return null
  
  const centralizedPackage = getPackageById(packageType)
  if (centralizedPackage) {
    return {
      name: centralizedPackage.name,
      description: centralizedPackage.description,
      features: centralizedPackage.features,
      multiplier: centralizedPackage.multiplier,
    }
  }
  
  // Fallback to existing packageDetails if centralized not found
  return packageDetails[packageType as keyof typeof packageDetails] || null
}

export default function BookingDetailsClientPage({ data, user }: Props) {
  const [removedGuests, setRemovedGuests] = React.useState<string[]>([])

  // RevenueCat product state
  const [offerings, setOfferings] = useState<Package[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const { isInitialized } = useRevenueCat();

  useEffect(() => {
    if (!isInitialized) return;
    const loadOfferings = async () => {
      setLoadingOfferings(true)
      try {
        const fetchedOfferings = await Purchases.getSharedInstance().getOfferings()
        console.log('Offerings:', fetchedOfferings)
        // Only show cleaning, bottle of wine, and guided hike
        const allowed = ['cleaning', 'Bottle_wine', 'Hike']
        let allPackages: Package[] = []
        // Prefer the 'add_ons' offering if it exists
        const addOnsOffering = fetchedOfferings.all["add_ons"];
        if (addOnsOffering && addOnsOffering.availablePackages.length > 0) {
          setOfferings(addOnsOffering.availablePackages.filter(pkg => allowed.includes(pkg.webBillingProduct?.identifier)));
        } else {
          // Fallback: search all offerings for allowed add-ons
          Object.values(fetchedOfferings.all).forEach(offering => {
            if (offering && offering.availablePackages) {
              allPackages = allPackages.concat(offering.availablePackages)
            }
          })
          setOfferings(allPackages.filter(pkg => allowed.includes(pkg.webBillingProduct?.identifier)));
        }
      } catch (err) {
        setPaymentError('Failed to load add-ons')
      } finally {
        setLoadingOfferings(false)
      }
    }
    loadOfferings()
  }, [isInitialized])

  const removeGuestHandler = async (guestId: string) => {
    const res = await fetch(`/api/bookings/${data.id}/guests/${guestId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error('Error removing guest:', res.statusText)
      return
    }

    setRemovedGuests((prev) => [...prev, guestId])
  }

  return (
    <div className="container my-10">
      <Tabs defaultValue="details" className="mt-10 max-w-screen-md mx-auto">
        <TabsList className="mb-6 bg-muted p-2 rounded-full flex flex-row gap-2">
          <TabsTrigger value="details" className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
            <FileText className="h-5 w-5" />
            <span className="hidden sm:inline">Booking Details</span>
          </TabsTrigger>
          <TabsTrigger value="guests" className="px-3 py-2 rounded-full flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground">
            <UserIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Guests</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          {data && 'post' in data && typeof data?.post !== 'string' ? (
            <div className="flex items-start flex-col md:flex-row gap-5 md:gap-10">
              <div className="md:py-5 py-3">
                <h1 className="text-4xl mb-3 font-bold">{data?.post.title}</h1>
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium">Booking Dates:</label>
                  <Calendar
                    mode="range"
                    selected={{
                      from: data?.fromDate ? new Date(data.fromDate) : undefined,
                      to: data?.toDate ? new Date(data.toDate) : undefined,
                    }}
                    numberOfMonths={2}
                    className="max-w-md"
                    disabled={() => true}
                  />
                  <div className="text-muted-foreground text-sm mt-1">
                    {data?.fromDate && data?.toDate
                      ? `From ${formatDateTime(data.fromDate)} to ${formatDateTime(data.toDate)}`
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
                <div className="flex flex-col">
                  <span className="font-medium">Date Booked: {formatDateTime(data?.post.createdAt)}</span>
                  <span className="font-medium">Guests: {Array.isArray(data?.guests) ? data.guests.length : 0}</span>
                  {data?.packageType && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                      <div className="font-medium text-sm text-primary mb-1">Package Purchased</div>
                      {(() => {
                        const packageInfo = getPackageDetails(data.packageType);
                        if (packageInfo) {
                          return (
                            <div className="space-y-1">
                              <div className="font-semibold">{packageInfo.name}</div>
                              <div className="text-sm text-muted-foreground">{packageInfo.description}</div>
                              <div className="text-xs">
                                <div className="font-medium mb-1">Includes:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {packageInfo.features.map((feature, idx) => (
                                    <li key={idx}>{feature}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="font-medium">
                              {data.packageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>Error loading booking details</div>
          )}
        </TabsContent>
        <TabsContent value="guests">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Guests</h2>
            {data &&
              'customer' in data &&
              typeof data?.customer !== 'string' &&
              data.customer?.id === user.id && (
                <InviteUrlDialog
                  bookingId={data.id}
                  trigger={
                    <Button>
                      <PlusCircleIcon className="size-4 mr-2" />
                      <span>Invite</span>
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
            {data.guests
              ?.filter((guest) =>
                typeof guest === 'string'
                  ? !removedGuests.includes(guest)
                  : !removedGuests.includes(guest.id),
              )
              ?.map((guest) => {
                if (typeof guest === 'string') {
                  return <div key={guest}>{guest}</div>
                }
                return (
                  <div
                    key={guest.id}
                    className="shadow-sm p-2 border border-border rounded-lg flex items-center gap-2 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 border border-border rounded-full">
                        <UserIcon className="size-6" />
                      </div>
                      <div>
                        <div>{guest.name}</div>
                        <div className="font-medium text-sm">Guest</div>
                      </div>
                    </div>
                    {data &&
                      'customer' in data &&
                      typeof data?.customer !== 'string' &&
                      data.customer?.id === user.id && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => removeGuestHandler(guest.id)}
                        >
                          <TrashIcon className="size-4" />
                          <span className="sr-only">Remove Guest</span>
                        </Button>
                      )}
                  </div>
                )
              })}
          </div>
        </TabsContent>
      </Tabs>
      {/* Revenuecat cleaning fee, bottle of wine, guided hike */}
      <div className="mt-10 max-w-screen-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Add-ons</h2>
        {loadingOfferings ? (
          <p>Loading add-ons...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...new Map(offerings.map(pkg => [pkg.webBillingProduct?.identifier, pkg])).values()].map((pkg) => {
              const product = pkg.webBillingProduct as RevenueCatProduct;
              const isWine = product.identifier === 'Bottle_wine';
              const isCleaning = product.identifier === 'cleaning';
              const isHike = product.identifier === 'Hike';
              return (
                <div key={product.identifier + '-' + pkg.identifier} className="border rounded-lg p-4 flex flex-col items-center">
                  <div className="font-bold text-lg mb-2">{product.title || product.identifier}</div>
                  <div className="mb-2 text-muted-foreground text-sm">{product.description}</div>
                  <div className="mb-4 text-xl font-bold">{formatPriceWithUSD(product)}</div>
                  <Button
                    className={isWine ? "bg-primary text-primary-foreground hover:bg-primary/90" : isCleaning ? "bg-yellow-200 text-yellow-900" : isHike ? "bg-green-200 text-green-900" : ""}
                    onClick={async () => {
                      setPaymentLoading(true)
                      setPaymentError(null)
                      try {
                        await Purchases.getSharedInstance().purchase({ rcPackage: pkg })
                        setPaymentSuccess(true)
                      } catch (err) {
                        setPaymentError('Failed to purchase add-on')
                      } finally {
                        setPaymentLoading(false)
                      }
                    }}
                    disabled={paymentLoading}
                  >
                    {isWine ? 'Buy Bottle of Wine' : isCleaning ? 'Add Cleaning' : isHike ? 'Book Guided Hike' : 'Purchase'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
        {paymentError && <div className="text-red-500 mt-2">{paymentError}</div>}
        {paymentSuccess && <div className="text-green-600 mt-2">Add-on purchased successfully!</div>}
      </div>
    </div>
  )
}
