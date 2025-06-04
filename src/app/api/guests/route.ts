import { getPayload } from 'payload'
import config from '@payload-config'
import { getMeUser } from '@/utilities/getMeUser'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const currentUser = await getMeUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config })

    // Get all bookings where the current user is either the customer or a guest
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        or: [
          {
            customer: {
              equals: currentUser.user.id,
            },
          },
          {
            guests: {
              contains: currentUser.user.id,
            },
          },
        ],
      },
      depth: 2,
    })

    // Extract unique guests from all bookings
    const allGuests = new Set<string>()
    bookings.docs.forEach((booking) => {
      if (booking.guests) {
        booking.guests.forEach((guest) => {
          if (typeof guest === 'string') {
            allGuests.add(guest)
          } else {
            allGuests.add(guest.id)
          }
        })
      }
    })

    // Get full guest details
    const guests = await Promise.all(
      Array.from(allGuests).map((guestId) =>
        payload.findByID({
          collection: 'users',
          id: guestId,
        })
      )
    )

    return NextResponse.json(guests)
  } catch (error) {
    console.error('Error fetching guests:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 