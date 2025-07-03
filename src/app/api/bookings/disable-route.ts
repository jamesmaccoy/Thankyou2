// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Booking } from '@/payload-types'

export async function POST(req: Request) {
  console.log('=== BOOKING API POST REQUEST STARTED ===')
  
  try {
    const payload = await getPayload({ config })
    
    // Log request details for debugging
    console.log('=== BOOKING API POST REQUEST ===')
    console.log('Request URL:', req.url)
    console.log('Request method:', req.method)
    
    // Add better error handling for different content types
    let data: any
    const contentType = req.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)
    
    try {
      if (contentType.includes('application/json')) {
        // Handle JSON requests
        const rawBody = await req.text()
        console.log('Raw JSON request body:', rawBody)
        data = JSON.parse(rawBody)
        console.log('Parsed JSON data:', JSON.stringify(data, null, 2))
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        // Handle form data requests (from Payload admin)
        console.log('Processing form data request')
        const formData = await req.formData()
        data = {} as any
        
        console.log('FormData entries:')
        for (const [key, value] of formData.entries()) {
          console.log(`  ${key}: ${value}`)
        }
        
        // Convert FormData to regular object
        for (const [key, value] of formData.entries()) {
          if (key.includes('[') && key.includes(']')) {
            // Handle nested form fields
            const match = key.match(/^(\w+)\[(\w+)\]$/)
            if (match && match.length >= 3) {
              const parentKey = match[1]
              const childKey = match[2]
              if (parentKey && childKey) {
                if (!data[parentKey]) data[parentKey] = {}
                data[parentKey][childKey] = value
              }
            } else {
              data[key] = value
            }
          } else {
            data[key] = value
          }
        }
        console.log('Parsed form data:', JSON.stringify(data, null, 2))
      } else {
        // Fallback to JSON parsing
        const rawBody = await req.text()
        console.log('Raw fallback request body:', rawBody)
        data = JSON.parse(rawBody)
        console.log('Parsed fallback JSON data:', JSON.stringify(data, null, 2))
      }
    } catch (parseError) {
      console.error('=== REQUEST PARSING ERROR ===')
      console.error('Parse error:', parseError)
      console.error('Content-Type:', contentType)
      console.error('Request URL:', req.url)
      console.error('Parse error details:', {
        message: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        stack: parseError instanceof Error ? parseError.stack : undefined
      })
      return NextResponse.json({ 
        error: 'Invalid request body format',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 })
    }
    
    console.log('=== EXTRACTED DATA ===')
    console.log('All data keys:', Object.keys(data))
    console.log('Data values:', JSON.stringify(data, null, 2))

    // Handle Payload admin interface format where data is in _payload field
    if (data._payload && typeof data._payload === 'string') {
      console.log('Found _payload field, parsing JSON...')
      try {
        const payloadData = JSON.parse(data._payload)
        console.log('Parsed _payload data:', JSON.stringify(payloadData, null, 2))
        data = payloadData // Replace data with the parsed payload
      } catch (payloadParseError) {
        console.error('Error parsing _payload JSON:', payloadParseError)
        return NextResponse.json({ 
          error: 'Invalid _payload JSON format',
          details: payloadParseError instanceof Error ? payloadParseError.message : 'Unknown parse error'
        }, { status: 400 })
      }
    }

    const { postId, fromDate, toDate } = data

    console.log('Creating booking with data:', { postId, fromDate, toDate })

    // Handle different field names between frontend and admin interface
    const bookingPostId = data.postId || data.post
    const bookingFromDate = data.fromDate || data.from_date
    const bookingToDate = data.toDate || data.to_date
    const bookingTitle = data.title
    const bookingCustomer = data.customer
    const bookingGuests = data.guests || []
    const bookingToken = data.token
    const bookingPaymentStatus = data.paymentStatus || data.payment_status || 'unpaid'
    const bookingPackageType = data.packageType || data.package_type

    console.log('Creating booking with processed data:', { 
      bookingPostId, 
      bookingFromDate, 
      bookingToDate, 
      bookingTitle,
      bookingCustomer,
      bookingPackageType
    })

    // For admin requests, we might have all the data directly
    if (bookingTitle && bookingCustomer && bookingPostId) {
      // This is likely an admin request with complete data
      try {
        const booking = await payload.create({
          collection: "bookings",
          data: {
            title: bookingTitle,
            post: bookingPostId,
            fromDate: bookingFromDate,
            toDate: bookingToDate,
            customer: bookingCustomer,
            guests: bookingGuests,
            token: bookingToken || Math.random().toString(36).substring(2, 15),
            paymentStatus: bookingPaymentStatus,
            packageType: bookingPackageType
          },
          overrideAccess: true, // Bypass access controls for admin creation
        })
        
        console.log('Created booking successfully via admin:', { id: booking.id })
        
        // Return the created booking in the format Payload expects
        return NextResponse.json({
          message: 'Booking created successfully',
          doc: booking
        })
      } catch (bookingError) {
        console.error('Error creating booking via admin:', bookingError)
        const bookingErrorMessage = bookingError instanceof Error ? bookingError.message : 'Unknown booking creation error'
        return NextResponse.json(
          { error: `Failed to create booking: ${bookingErrorMessage}` },
          { status: 500 }
        )
      }
    }

    // For frontend API calls, we need to validate and process the post
    if (!bookingPostId) {
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
      console.log('Attempting to fetch post with ID/slug:', bookingPostId)
      
      // Try to find the post by slug first - using admin access to bypass restrictions
      const postBySlug = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: bookingPostId
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
            id: bookingPostId,
            overrideAccess: true, // Bypass access controls for this operation
          })
        } catch (findError) {
          console.error('Error finding post by ID:', findError)
          post = null
        }
      }

      if (!post || !post.id) {
        console.error('Post not found:', bookingPostId)
        return NextResponse.json({ error: `Post with ID/slug ${bookingPostId} not found in database` }, { status: 404 })
      }

      console.log('Found post:', { id: post.id, title: post.title })

      // Create booking in Payload CMS with the post relationship
      console.log('Creating booking with post:', { postId: post.id, title: post.title })
      console.log('Booking data to create:', {
        title: post.title,
        post: post.id,
        fromDate: bookingFromDate,
        toDate: bookingToDate,
        customer: currentUser.id,
        token: Math.random().toString(36).substring(2, 15),
        paymentStatus: 'unpaid',
        packageType: bookingPackageType
      })
      
      let booking
      try {
        booking = await payload.create({
          collection: "bookings",
          data: {
            title: post.title,
            post: post.id, // Use the actual post ID here
            fromDate: bookingFromDate,
            toDate: bookingToDate,
            customer: currentUser.id,
            token: Math.random().toString(36).substring(2, 15),
            paymentStatus: 'unpaid',
            packageType: bookingPackageType
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
          fromDate: bookingFromDate,
          toDate: bookingToDate
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
        postId: bookingPostId
      })
      return NextResponse.json(
        { error: `Error in post/booking operation: ${errorMessage}. PostId: ${bookingPostId}` },
        { status: 500 }
      )
    }
  } catch (outerError) {
    console.error('=== BOOKING API OUTER ERROR ===')
    console.error('Outer error:', outerError)
    console.error('Outer error details:', {
      message: outerError instanceof Error ? outerError.message : 'Unknown outer error',
      stack: outerError instanceof Error ? outerError.stack : undefined,
      name: outerError instanceof Error ? outerError.name : 'Error'
    })
    return NextResponse.json(
      { 
        error: 'Internal server error in booking API',
        details: outerError instanceof Error ? outerError.message : 'Unknown error'
      },
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

export async function DELETE(req: Request) {
  console.log('=== BOOKING API DELETE REQUEST ===')
  
  try {
    const payload = await getPayload({ config })
    const url = new URL(req.url)
    
    // Log request details
    console.log('DELETE Request URL:', req.url)
    console.log('URL search params:', url.searchParams.toString())
    
    // Get the authenticated user
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      console.log('DELETE request: No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('DELETE request user:', { id: user.id, role: user.role })
    
    // Parse the booking IDs from the query parameters
    // URL format: ?limit=0&where[id][in][0]=bookingId1&where[id][in][1]=bookingId2
    const bookingIds: string[] = []
    
    // Extract booking IDs from query parameters
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('where[id][in][') && key.endsWith(']')) {
        bookingIds.push(value)
      }
    })
    
    console.log('Booking IDs to delete:', bookingIds)
    
    if (bookingIds.length === 0) {
      return NextResponse.json({ error: 'No booking IDs provided' }, { status: 400 })
    }
    
    // Delete each booking
    const deleteResults = []
    const errors = []
    
    for (const bookingId of bookingIds) {
      try {
        console.log(`Attempting to delete booking: ${bookingId}`)
        
        // Check if user has permission to delete this booking
        if (!user.role?.includes('admin')) {
          // For non-admin users, check if they own the booking
          const booking = await payload.findByID({
            collection: 'bookings',
            id: bookingId,
            depth: 0,
          })
          
          if (!booking || booking.customer !== user.id) {
            console.log(`User ${user.id} cannot delete booking ${bookingId} - not owner`)
            errors.push(`Cannot delete booking ${bookingId}: Access denied`)
            continue
          }
        }
        
        await payload.delete({
          collection: 'bookings',
          id: bookingId,
          user,
        })
        
        console.log(`Successfully deleted booking: ${bookingId}`)
        deleteResults.push(bookingId)
      } catch (deleteError) {
        console.error(`Error deleting booking ${bookingId}:`, deleteError)
        const errorMessage = deleteError instanceof Error ? deleteError.message : 'Unknown error'
        errors.push(`Failed to delete booking ${bookingId}: ${errorMessage}`)
      }
    }
    
    console.log('Delete results:', { deleted: deleteResults, errors })
    
    if (errors.length > 0 && deleteResults.length === 0) {
      // All deletions failed
      return NextResponse.json({ 
        error: 'Failed to delete bookings',
        details: errors 
      }, { status: 500 })
    }
    
    // Return success response
    return NextResponse.json({ 
      message: `Successfully deleted ${deleteResults.length} booking(s)`,
      deleted: deleteResults,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error) {
    console.error('=== BOOKING DELETE ERROR ===')
    console.error('Delete error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during booking deletion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}