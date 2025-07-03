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
      // No RevenueCat purchase result provided - check if this is a subscriber-only package
      console.log('No RevenueCat purchase result provided, checking package access for:', newPackageType)
      
      // Define free packages available to all users (freemium tier)
      const freePackageTypes: string[] = [
        'per_night',           // Basic per night
        'three_nights',        // Basic 3-night package
        'weekly',              // Basic weekly package
        'monthly',             // Basic monthly package
        'wine_package',        // Wine add-on
        'standard',            // Legacy support
        'basic'                // Legacy support
      ]
      
      // Define subscriber-only packages (require active subscription/pro entitlement)
      const subscriberPackageTypes: string[] = [
        'per_night_customer',    // Enhanced per night for subscribers
        'three_nights_customer', // Enhanced 3-night for subscribers
        'weekly_customer',       // Enhanced weekly for subscribers
      ]
      
      // Define luxury packages (require luxury entitlement or payment)
      const luxuryPackageTypes: string[] = [
        'luxury_night',          // Luxury per night
        'hosted_3nights',        // Luxury 3-night hosted experience
        'hosted_weekly',         // Luxury weekly hosted experience
        'hosted_7nights'         // Legacy hosted package
      ]
      
      // Define premium packages that require individual payment (legacy packages not in new architecture)
      const premiumPackageTypes: string[] = [
        // These are packages that truly require individual payment and aren't covered by entitlements
        // Most packages should now be covered by the standard/pro/luxury entitlement system
      ]
      
      if (freePackageTypes.includes(newPackageType)) {
        paymentVerified = true
        console.log('Package type is free tier, available to all users:', newPackageType)
      } else if (subscriberPackageTypes.includes(newPackageType)) {
        // Check if user has active subscription for subscriber packages
        console.log('Checking subscription status for subscriber package:', newPackageType)
        
        try {
          const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
          if (!apiKey) {
            console.error('RevenueCat API key missing for subscription check')
            return NextResponse.json({ 
              error: 'Service configuration error. Please contact support.',
              packageType: newPackageType,
              requiresSubscription: true
            }, { status: 500 })
          }
          
          const { Purchases } = await import('@revenuecat/purchases-js')
          const purchases = Purchases.configure(apiKey, user.id)
          const customerInfo = await purchases.getCustomerInfo()
          
          // Check for active entitlements (subscription)
          const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
          const hasActiveSubscription = activeEntitlements.length > 0
          
          console.log('Subscription check result:', {
            userId: user.id,
            packageType: newPackageType,
            hasActiveSubscription,
            activeEntitlements
          })
          
          if (hasActiveSubscription) {
            paymentVerified = true
            console.log('Subscriber package access granted for active subscriber:', newPackageType)
          } else {
            return NextResponse.json({ 
              error: 'This enhanced package is exclusive to subscribers. Upgrade your plan to access premium features and priority support.',
              packageType: newPackageType,
              requiresSubscription: true,
              suggestedAction: 'Subscribe to unlock enhanced packages'
            }, { status: 403 }) // 403 Forbidden
          }
          
        } catch (subscriptionError) {
          console.error('Subscription check error:', subscriptionError)
          return NextResponse.json({ 
            error: 'Unable to verify subscription status. Please try again or contact support.',
            packageType: newPackageType,
            requiresSubscription: true
          }, { status: 500 })
        }
      } else if (luxuryPackageTypes.includes(newPackageType)) {
        // Check if user has luxury entitlement or recent purchase for luxury packages
        console.log('Checking luxury package access for:', newPackageType)
        
        try {
          const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
          if (!apiKey) {
            console.error('RevenueCat API key missing for luxury package check')
            return NextResponse.json({ 
              error: 'Service configuration error. Please contact support.',
              packageType: newPackageType,
              requiresPayment: true
            }, { status: 500 })
          }
          
          const { Purchases } = await import('@revenuecat/purchases-js')
          const purchases = Purchases.configure(apiKey, user.id)
          const customerInfo = await purchases.getCustomerInfo()
          
          // Check for luxury entitlements or recent purchases
          const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
          const hasLuxuryEntitlement = activeEntitlements.some(ent => 
            ent.includes('luxury') || ent.includes('pro') || ent.includes('premium')
          )
          
          console.log('Luxury package check result:', {
            userId: user.id,
            packageType: newPackageType,
            hasLuxuryEntitlement,
            activeEntitlements
          })
          
          if (hasLuxuryEntitlement) {
            paymentVerified = true
            console.log('Luxury package access granted through entitlement:', newPackageType)
          } else {
            return NextResponse.json({ 
              error: 'This luxury package requires individual payment. Please complete the purchase to proceed.',
              packageType: newPackageType,
              requiresPayment: true,
              suggestedAction: 'Purchase luxury package or upgrade to luxury tier'
            }, { status: 402 }) // 402 Payment Required
          }
          
        } catch (luxuryError) {
          console.error('Luxury package check error:', luxuryError)
          return NextResponse.json({ 
            error: 'Unable to verify luxury package access. Please try again or contact support.',
            packageType: newPackageType,
            requiresPayment: true
          }, { status: 500 })
        }
      } else if (premiumPackageTypes.includes(newPackageType)) {
        console.warn('Premium package requires individual payment:', newPackageType)
        return NextResponse.json({ 
          error: 'This premium package requires individual payment. Please complete the purchase to proceed.',
          packageType: newPackageType,
          requiresPayment: true
        }, { status: 402 }) // 402 Payment Required
      } else {
        // Unknown package type - default to requiring subscription for safety
        console.warn('Unknown package type, defaulting to requiring subscription:', newPackageType)
        return NextResponse.json({ 
          error: 'Package verification required. Please contact support if this error persists.',
          packageType: newPackageType,
          requiresSubscription: true
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