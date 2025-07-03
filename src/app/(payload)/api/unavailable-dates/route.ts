import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const postId = searchParams.get('postId')

  if (!slug && !postId) {
    return Response.json({ message: 'Post slug or ID is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    let resolvedPostId = postId

    // If slug is provided, find the post by slug
    if (slug && !postId) {
      const posts = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: slug,
          },
        },
        select: {
          slug: true,
        },
        limit: 1,
      })

      if (!posts.docs.length) {
        return Response.json({ message: 'Post not found' }, { status: 404 })
      }

      resolvedPostId = posts.docs[0]!.id
    }

    // Find all bookings for this post
    // Use admin context to bypass access controls
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        post: {
          equals: resolvedPostId,
        },
      },
      limit: 1000,
      select: {
        fromDate: true,
        toDate: true,
      },
      depth: 0,
      overrideAccess: true, // This bypasses access controls
    })

    // Extract and process date ranges
    const unavailableDates: string[] = []

    bookings.docs.forEach((booking) => {
      const fromDate = new Date(booking.fromDate)
      const toDate = new Date(booking.toDate)

      // Generate array of all dates in the range with full ISO strings
      const currentDate = new Date(fromDate)
      while (currentDate < toDate) {
        unavailableDates.push(currentDate.toISOString())
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    // Remove duplicates if needed
    const uniqueUnavailableDates = [...new Set(unavailableDates)]

    return Response.json({
      unavailableDates: uniqueUnavailableDates,
    })
  } catch (error) {
    console.error('Error fetching unavailable dates:', error)
    return Response.json({ message: 'Error fetching unavailable dates' }, { status: 500 })
  }
} 