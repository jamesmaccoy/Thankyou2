// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Booking } from '@/payload-types'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    
    // Add better error handling for JSON parsing
    let data
    try {
      const rawBody = await req.text()
      console.log('Raw request body:', rawBody)
      data = JSON.parse(rawBody)
      console.log('Parsed JSON data:', data)
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const { postId, fromDate, toDate } = data

    console.log('Creating booking with data:', { postId, fromDate, toDate })

    if (!postId) {
      console.error('No postId provided in request')
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Get user using Payload's auth method
    let currentUser
    try {
      const authResult = await payload.auth({ headers: req.headers })
      if (!authResult.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      currentUser = authResult.user
      console.log('Authenticated user:', { id: currentUser.id, role: currentUser.role })
    } catch (authError) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, fetch the post to ensure it exists and get its data
    try {
      console.log('Attempting to fetch post with ID/slug:', postId)
      
      // Try to find the post by slug first - using admin access to bypass restrictions
      const postBySlug = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: postId
          }
        },
        limit: 1,
        overrideAccess: true, // Bypass access controls for this operation
      })

      let post: any = null
      if (postBySlug.docs.length > 0) {
        post = postBySlug.docs[0]
        console.log('Found post by slug:', { id: post.id, title: post.title })
      } else {
        // If not found by slug, try by ID - using admin access to bypass restrictions
        try {
          post = await payload.findByID({
            collection: 'posts',
            id: postId,
            overrideAccess: true, // Bypass access controls for this operation
          })
        } catch (findError) {
          console.error('Error finding post by ID:', findError)
          post = null
        }
      }

      if (!post || !post.id) {
        console.error('Post not found:', postId)
        return NextResponse.json({ error: `Post with ID/slug ${postId} not found in database` }, { status: 404 })
      }

      console.log('Found post:', { id: post.id, title: post.title })

      // Create booking in Payload CMS with the post relationship
      console.log('Creating booking with post:', { postId: post.id, title: post.title })
      console.log('Booking data to create:', {
        title: post.title,
        post: post.id,
        fromDate,
        toDate,
        customer: currentUser.id,
        token: Math.random().toString(36).substring(2, 15),
        paymentStatus: 'unpaid'
      })
      
      let booking
      try {
        booking = await payload.create({
          collection: "bookings",
          data: {
            title: post.title,
            post: post.id, // Use the actual post ID here
            fromDate,
            toDate,
            customer: currentUser.id,
            token: Math.random().toString(36).substring(2, 15),
            paymentStatus: 'unpaid'
          },
          overrideAccess: true, // Bypass access controls for booking creation
        })
        console.log('Created booking successfully:', { id: booking.id })
      } catch (bookingError) {
        console.error('Error creating booking:', bookingError)
        const bookingErrorMessage = bookingError instanceof Error ? bookingError.message : 'Unknown booking creation error'
        console.error('Booking creation error details:', {
          message: bookingErrorMessage,
          stack: bookingError instanceof Error ? bookingError.stack : undefined,
          currentUser: currentUser.id,
          postId: post.id,
          fromDate,
          toDate
        })
        return NextResponse.json(
          { error: `Failed to create booking: ${bookingErrorMessage}` },
          { status: 500 }
        )
      }

      // Fetch the created booking with populated relationships
      const populatedBooking = await payload.findByID({
        collection: 'bookings',
        id: booking.id,
        depth: 2,
      })

      console.log('Fetched populated booking:', { id: populatedBooking.id })

      return NextResponse.json(populatedBooking)
    } catch (error) {
      console.error('Error in post/booking operation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      const errorName = error instanceof Error ? error.name : 'Error'
      
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        name: errorName,
        postId: postId
      })
      return NextResponse.json(
        { error: `Error in post/booking operation: ${errorMessage}. PostId: ${postId}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in booking creation:', error)
    return NextResponse.json(
      { error: 'Failed to create booking: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url!);
    const postId = url.searchParams.get('postId');
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }
    const payload = await getPayload({ config });
    // Find all bookings for this post (future and past)
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        post: { equals: postId },
      },
      limit: 100,
      depth: 0,
      select: {
        fromDate: true,
        toDate: true,
      },
    });
    // Return only fromDate and toDate for each booking
    const result = bookings.docs.map(b => ({ fromDate: b.fromDate, toDate: b.toDate }));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings: ' + (error as Error).message }, { status: 500 });
  }
}