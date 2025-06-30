import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest, { params }: { params: Promise<{ estimateId: string }> }) {
  try {
    const { estimateId } = await params
    
    if (!estimateId) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 })
    }

    let body;
    try {
      body = await req.json()
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the estimate
    let estimate;
    try {
      estimate = await payload.findByID({
        collection: 'estimates',
        id: estimateId,
        depth: 2,
      })
    } catch (findError) {
      console.error('Error finding estimate:', findError)
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Verify the user owns this estimate
    const estimateCustomerId = typeof estimate.customer === 'string' 
      ? estimate.customer 
      : estimate.customer?.id;
    
    if (estimateCustomerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the estimate to mark it as confirmed/paid
    try {
      // Extract the new packageType from the request body
      const newPackageType = body.packageType || estimate.packageType || 'standard'
      
      console.log('Estimate confirmation data:', {
        estimateId,
        oldPackageType: estimate.packageType,
        newPackageType: newPackageType,
        requestBody: body
      })

      const updatedEstimate = await payload.update({
        collection: 'estimates',
        id: estimateId,
        data: {
          paymentStatus: 'paid',
          packageType: newPackageType // Update the estimate with the new package type
        },
      })

      // Create a booking from the confirmed estimate
      const bookingData: any = {
        title: `Booking for ${typeof estimate.post === 'string' ? estimate.post : estimate.post?.title || 'Unknown Post'}`,
        customer: user.id,
        post: typeof estimate.post === 'string' ? estimate.post : estimate.post?.id,
        fromDate: estimate.fromDate,
        toDate: estimate.toDate,
        guests: estimate.guests || [],
        paymentStatus: 'paid' as const,
        packageType: newPackageType, // Use the new package type instead of the old one
      }

      // Only add token if it exists
      if (estimate.token) {
        bookingData.token = estimate.token
      }

      console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2))

      const booking = await payload.create({
        collection: 'bookings',
        data: bookingData,
        user,
      })

      return NextResponse.json({
        estimate: updatedEstimate,
        booking: booking,
        message: 'Estimate confirmed and booking created successfully'
      })

    } catch (updateError) {
      console.error('Error updating estimate or creating booking:', updateError)
      return NextResponse.json({
        error: 'Failed to confirm estimate',
        details: updateError instanceof Error ? updateError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Estimate confirmation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 