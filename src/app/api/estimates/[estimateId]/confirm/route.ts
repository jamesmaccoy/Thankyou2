import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Purchases } from '@revenuecat/purchases-js'

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

    // Extract the new packageType from the request body
    const newPackageType = body.packageType || estimate.packageType || 'standard'
    
    console.log('Estimate confirmation data:', {
      estimateId,
      oldPackageType: estimate.packageType,
      newPackageType: newPackageType,
      requestBody: body
    })

    // Check if payment verification is required
    let paymentVerified = false
    
    // If RevenueCat purchase result is provided, verify it
    if (body.revenueCatPurchaseResult) {
      console.log('Verifying RevenueCat purchase for user:', user.id)
      
      try {
        // Initialize RevenueCat with the public API key
        const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
        if (!apiKey) {
          console.error('RevenueCat API key missing')
          return NextResponse.json({ 
            error: 'Payment verification configuration missing' 
          }, { status: 500 })
        }

        // Configure RevenueCat and get customer info to verify the purchase
        const purchases = Purchases.configure(apiKey, String(user.id))
        const customerInfo = await purchases.getCustomerInfo()
        
        console.log('Customer info retrieved:', {
          customerId: customerInfo.originalAppUserId,
          activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
          nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions?.length || 0
        })

        // Check if the user has recent transactions that match the package type
        const hasRecentPurchase = customerInfo.nonSubscriptionTransactions?.some((transaction: any) => {
          // Check if transaction is recent (within last 5 minutes to account for processing delays)
          const transactionDate = new Date(transaction.purchaseDate)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          const isRecent = transactionDate > fiveMinutesAgo
          
          console.log('Checking transaction:', {
            productId: transaction.productId,
            purchaseDate: transaction.purchaseDate,
            isRecent,
            packageType: newPackageType
          })
          
          return isRecent && !transaction.isRefunded
        })

        // Also check for active entitlements (for subscription-based packages)
        const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active || {}).length > 0

        if (hasRecentPurchase || hasActiveEntitlements) {
          paymentVerified = true
          console.log('Payment verified successfully')
        } else {
          console.warn('No recent purchases or active entitlements found')
          return NextResponse.json({ 
            error: 'Payment verification failed. No recent purchase found for this package.' 
          }, { status: 400 })
        }

      } catch (revenueCatError) {
        console.error('RevenueCat verification error:', revenueCatError)
        return NextResponse.json({ 
          error: 'Payment verification failed',
          details: revenueCatError instanceof Error ? revenueCatError.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // No RevenueCat purchase result provided - check if this package type requires payment
      console.log('No RevenueCat purchase result provided, checking if payment is required for package:', newPackageType)
      
      // Define which package types don't require RevenueCat payment
      const freePackageTypes = ['standard', 'basic'] // Add package types that don't require payment
      
      if (freePackageTypes.includes(newPackageType)) {
        paymentVerified = true
        console.log('Package type does not require payment verification')
      } else {
        console.warn('Package type requires payment but no purchase result provided')
        return NextResponse.json({ 
          error: 'Payment required for this package type' 
        }, { status: 400 })
      }
    }

    // Only proceed if payment is verified
    if (!paymentVerified) {
      return NextResponse.json({ 
        error: 'Payment verification required' 
      }, { status: 400 })
    }

    // Update the estimate to mark it as confirmed/paid
    try {
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