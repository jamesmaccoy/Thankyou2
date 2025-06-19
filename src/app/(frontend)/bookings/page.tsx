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
// import { fetchLatestEstimate } from '@/utilities/fetchLatestEstimate'
// import { BookingsList } from './BookingsList'

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

  const where: Where = {
    customer: {
      equals: user.id,
    },
  }

  const bookings = await payload.find({
    collection: 'bookings',
    where,
    sort: '-createdAt',
    pagination: false,
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
    }
  })

  return (
    <main className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Your Bookings</h1>
        
        {latestEstimate && (
          <div className="mb-8 p-6 bg-muted rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Latest Estimate</h2>
            <p className="text-muted-foreground mb-4">
              You have a pending estimate. Complete it to secure your booking.
            </p>
            <Link href={`/estimate/${latestEstimate.id}`}>
              <Button>Complete Estimate</Button>
            </Link>
          </div>
        )}
        
        {bookings.docs.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No bookings yet</h2>
            <p className="text-muted-foreground mb-6">
              Explore our properties and make your first booking.
            </p>
            <Link href="/explore">
              <Button>Explore Properties</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {formattedBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
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
