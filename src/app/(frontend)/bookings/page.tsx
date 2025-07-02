import { Where } from 'payload'
import configPromise from '@payload-config'
import React from 'react'
import { Post, User } from '@/payload-types'
import { getMeUser } from '@/utilities/getMeUser'
import PageClient from './page.client'
import BookingCard from '@/components/Bookings/BookingCard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getPayload } from 'payload'
import { Estimate } from '@/payload-types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Package, Users, Crown } from "lucide-react"
import { getPackageById } from '@/lib/package-types'
// import { fetchLatestEstimate } from '@/utilities/fetchLatestEstimate'
// import { BookingsList } from './BookingsList'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const fetchLatestEstimate = async (userId: string) => {
  const payload = await getPayload({ config: configPromise });
  const estimates = await payload.find({
    collection: 'estimates',
    where: {
      customer: { equals: userId },
    },
    sort: '-createdAt',
    limit: 1,
    depth: 2,
  });
  return estimates.docs[0] || null;
};

export default async function Bookings() {
  let user
  try {
    const userData = await getMeUser()
    user = userData.user
  } catch (error) {
    console.error('Failed to get user in Bookings:', error)
    // Redirect to login if user authentication fails
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  const payload = await getPayload({ config: configPromise })

  // Get bookings where user is customer or guest
  const bookingsWhere: Where = {
    or: [
      {
        customer: {
          equals: user.id,
        },
      },
      {
        guests: {
          contains: user.id,
        },
      },
    ],
  }

  const bookings = await payload.find({
    collection: 'bookings',
    where: bookingsWhere,
    sort: '-createdAt',
    pagination: false,
    depth: 2,
  })

  // Get estimates where user is customer or guest - only fetch the latest one
  const estimatesWhere: Where = {
    or: [
      {
        customer: {
          equals: user.id,
        },
      },
      {
        guests: {
          contains: user.id,
        },
      },
    ],
  }

  const estimates = await payload.find({
    collection: 'estimates',
    where: estimatesWhere,
    sort: '-createdAt',
    limit: 1, // Only get the latest estimate
    depth: 2,
  })

  const latestEstimate = await fetchLatestEstimate(user.id);

  // Map bookings to the format expected by BookingCard
  const formattedBookings = bookings.docs.map((booking) => {
    const post = booking.post as Post
    return {
      id: booking.id,
      fromDate: booking.fromDate,
      toDate: booking.toDate,
      guests: booking.guests || [],
      title: post?.title || 'Untitled Booking',
      slug: post?.slug,
      meta: post?.meta,
      type: 'booking' as const,
      customer: booking.customer,
      packageType: booking.packageType,
    }
  })

  // Map estimates to the format expected by BookingCard
  const formattedEstimates = estimates.docs.map((estimate) => {
    const post = estimate.post as Post
    return {
      id: estimate.id,
      fromDate: estimate.fromDate,
      toDate: estimate.toDate,
      guests: estimate.guests || [],
      title: post?.title || 'Untitled Estimate',
      slug: post?.slug,
      meta: post?.meta,
      type: 'estimate' as const,
      customer: estimate.customer,
      packageType: estimate.packageType,
    }
  })

  // Filter past bookings/estimates (where toDate is before today)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison
  
  const pastBookings = formattedBookings.filter(booking => new Date(booking.toDate) < today)
  const currentBookings = formattedBookings.filter(booking => new Date(booking.toDate) >= today)
  
  const pastEstimates = formattedEstimates.filter(estimate => new Date(estimate.toDate) < today)
  const currentEstimates = formattedEstimates.filter(estimate => new Date(estimate.toDate) >= today)
  
  const allPastItems = [...pastBookings, ...pastEstimates]
  const allCurrentItems = [...currentBookings, ...currentEstimates]

  // Calculate package statistics
  const allItems = [...bookings.docs, ...estimates.docs]
  const packageTypeStats: Record<string, number> = {}
  const categoryStats: Record<string, number> = {}
  
  allItems.forEach(item => {
    // Count package types
    if (item.packageType) {
      packageTypeStats[item.packageType] = (packageTypeStats[item.packageType] || 0) + 1
    }
    
    // Count package categories based on package details (only for bookings)
    if ('packageDetails' in item && item.packageDetails?.category) {
      categoryStats[item.packageDetails.category] = (categoryStats[item.packageDetails.category] || 0) + 1
    } else if (item.packageType) {
      // Fallback: categorize based on package type
      const packageInfo = getPackageById(item.packageType)
      if (packageInfo?.category) {
        categoryStats[packageInfo.category] = (categoryStats[packageInfo.category] || 0) + 1
      }
    }
  })

  // Get specific package counts
  const weeklyCount = (packageTypeStats['weekly'] || 0) + (packageTypeStats['Weekly'] || 0) + (packageTypeStats['hosted7nights'] || 0)
  const hostedCount = Object.entries(packageTypeStats).reduce((sum, [packageType, count]) => {
    const packageInfo = getPackageById(packageType)
    return sum + (packageInfo?.isHosted ? count : 0)
  }, 0)

  const packageStats = {
    totalBookings: allItems.length,
    packageTypeStats,
    categoryStats,
    weeklyCount,
    hostedCount,
    mostPopularPackage: Object.entries(packageTypeStats).sort(([,a], [,b]) => b - a)[0]?.[0] || null
  }

  return (
    <main className="container py-8">
      <PageClient />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Your Bookings & Estimates</h1>
        
        {/* Package Statistics Cards */}
        {(bookings.docs.length > 0 || estimates.docs.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{packageStats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {formattedBookings.length} confirmed, {formattedEstimates.length} pending
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Packages</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{packageStats.weeklyCount}</div>
                <p className="text-xs text-muted-foreground">
                  7+ night stays
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hosted Packages</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{packageStats.hostedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Premium hosted experiences
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[...bookings.docs, ...estimates.docs].reduce((total, item) => 
                    total + (item.guests?.length || 0) + 1, 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Including hosts & customers
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/*{latestEstimate && (
          <div className="mb-8 p-6 bg-muted rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Latest Estimate</h2>
            <p className="text-muted-foreground mb-4">
              You have a pending estimate. Complete it to secure your booking.
            </p>
            <Link href={`/estimate/${latestEstimate.id}`}>
              <Button>Complete Estimate</Button>
            </Link>
          </div>
        )}*/}
        
        {bookings.docs.length === 0 && estimates.docs.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No bookings or estimates yet</h2>
            <p className="text-muted-foreground mb-6">
              Explore our properties and make your first booking.
            </p>
            <Link href="/explore">
              <Button>Explore Properties</Button>
            </Link>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({allCurrentItems.length + allPastItems.length})</TabsTrigger>
              <TabsTrigger value="bookings">Bookings ({currentBookings.length})</TabsTrigger>
              <TabsTrigger value="estimates">Estimates ({currentEstimates.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({allPastItems.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-6 mt-6">
              <div className="grid gap-6">
                {[...allCurrentItems, ...allPastItems]
                  .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                  .map((item) => (
                    <BookingCard key={`${item.type}-${item.id}`} booking={item} />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="bookings" className="space-y-6 mt-6">
              <div className="grid gap-6">
                {currentBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="estimates" className="space-y-6 mt-6">
              <div className="grid gap-6">
                {currentEstimates.map((estimate) => (
                  <BookingCard key={estimate.id} booking={estimate} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="past" className="space-y-6 mt-6">
              <div className="grid gap-6">
                {allPastItems
                  .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                  .map((item) => (
                    <BookingCard key={`${item.type}-${item.id}`} booking={item} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <PageClient />
    </main>
  )
}

const getBookings = async (type: 'upcoming' | 'past', currentUser: User) => {
  const payload = await getPayload({ config: configPromise })

  let whereQuery: Where

  if (type === 'upcoming') {
    whereQuery = {
      and: [
        {
          fromDate: {
            greater_than_equal: new Date(),
          },
        },
        {
          customer: {
            equals: currentUser.id,
          },
        },
      ],
    }
  } else {
    whereQuery = {
      and: [
        {
          fromDate: {
            less_than: new Date(),
          },
        },
        {
          customer: {
            equals: currentUser.id,
          },
        },
      ],
    }
  }

  const bookings = await payload.find({
    collection: 'bookings',
    limit: 100,
    where: whereQuery,
    depth: 2,
    sort: '-fromDate',
    select: {
      slug: true,
      post: true,
      guests: true,
      fromDate: true,
      toDate: true,
    },
  })

  return bookings
}
