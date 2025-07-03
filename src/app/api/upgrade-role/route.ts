import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Purchases } from '@revenuecat/purchases-js'

type UserRole = 'host' | 'admin' | 'customer' | 'guest'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Get the user from the auth token
    const authCookie = request.cookies.get('payload-token')
    if (!authCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authCookie.value
    const [header, payloadToken, signature] = token.split('.')
    if (!payloadToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payloadToken, 'base64').toString())
    const userId = decodedPayload.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in token' }, { status: 401 })
    }

    // Get the current user from the database
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has an active subscription with RevenueCat
    try {
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'RevenueCat configuration missing' 
        }, { status: 500 })
      }

      const purchases = Purchases.configure(apiKey, userId)
      const customerInfo = await purchases.getCustomerInfo()
      
      // Check for active entitlements and subscription products
      const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
      const hasActiveSubscription = activeEntitlements.length > 0

      if (!hasActiveSubscription) {
        return NextResponse.json({ 
          error: 'Active subscription required to upgrade role',
          hasSubscription: false,
          activeEntitlements: activeEntitlements
        }, { status: 403 })
      }

      // Determine the appropriate role based on subscription type
      let targetRole: UserRole = 'customer' // Default for monthly/annual subscriptions
      
      // Check active entitlements for subscription types
      for (const entitlementKey of activeEntitlements) {
        const entitlement = customerInfo.entitlements.active[entitlementKey]
        if (entitlement && entitlement.productIdentifier) {
          // Professional plan gets host access
          if (entitlement.productIdentifier.includes('six_month') || 
              entitlement.productIdentifier.includes('professional') ||
              entitlement.productIdentifier === '$rc_six_month') {
            targetRole = 'host'
            break
          }
        }
      }

      // Check if user already has the appropriate role or higher
      const currentRoles = user.role || []
      if (targetRole === 'customer' && (currentRoles.includes('customer') || currentRoles.includes('host'))) {
        return NextResponse.json({ 
          message: `User already has ${targetRole} role or higher`,
          currentRoles: user.role,
          targetRole: targetRole
        })
      }
      if (targetRole === 'host' && currentRoles.includes('host')) {
        return NextResponse.json({ 
          message: `User already has ${targetRole} role`,
          currentRoles: user.role,
          targetRole: targetRole
        })
      }

      // Update user role
      let newRoles = [...currentRoles]

      // Remove guest role if present
      if (newRoles.includes('guest')) {
        newRoles = newRoles.filter(role => role !== 'guest')
      }
      
      // Add the target role if not already present
      if (!newRoles.includes(targetRole)) {
        newRoles.push(targetRole)
      }

      // For host upgrades, also ensure customer role is present
      if (targetRole === 'host' && !newRoles.includes('customer')) {
        newRoles.push('customer')
      }

      // Update the user in the database
      const updatedUser = await payload.update({
        collection: 'users',
        id: userId,
        data: {
          role: newRoles,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${targetRole} role`,
        previousRoles: user.role,
        newRoles: updatedUser.role,
        targetRole: targetRole,
        hasActiveSubscription: true,
        activeEntitlements: activeEntitlements
      })

    } catch (revenueCatError) {
      console.error('RevenueCat error:', revenueCatError)
      return NextResponse.json({ 
        error: 'Failed to verify subscription status',
        details: revenueCatError instanceof Error ? revenueCatError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Role upgrade error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 