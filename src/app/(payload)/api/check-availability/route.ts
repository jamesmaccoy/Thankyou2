import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const postId = searchParams.get('postId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if ((!slug && !postId) || !startDate || !endDate) {
    return Response.json(
      {
        message: 'Post slug/ID and date range (startDate, endDate) are required',
      },
      { status: 400 },
    )
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

    // Parse the requested date range
    const requestStart = new Date(startDate)
    const requestEnd = new Date(endDate)

    if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) {
      return Response.json({ message: 'Invalid date format' }, { status: 400 })
    }

    // Format dates as YYYY-MM-DD for database queries
    const startFormatted = requestStart.toISOString().split('T')[0]
    const endFormatted = requestEnd.toISOString().split('T')[0]

    // Find all bookings for this post that overlap with the requested range
    // Use admin context to bypass access controls
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { post: { equals: resolvedPostId } },
          { fromDate: { less_than_equal: endFormatted } },
          { toDate: { greater_than_equal: startFormatted } },
        ],
      },
      limit: 1,
      select: {
        slug: true,
      },
      depth: 0,
      overrideAccess: true, // This bypasses access controls
    })

    // If any bookings were found, the dates are not available
    const isAvailable = bookings.docs.length === 0

    return Response.json({
      isAvailable,
      requestedRange: {
        startDate: startFormatted,
        endDate: endFormatted,
      },
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return Response.json({ message: 'Error checking availability' }, { status: 500 })
  }
} 