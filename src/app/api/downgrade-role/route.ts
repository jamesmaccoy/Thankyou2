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

    const currentRoles = user.role || []

    // Check if user has any subscription-based roles to downgrade
    if (!currentRoles.includes('customer') && !currentRoles.includes('host')) {
      return NextResponse.json({ 
        message: 'User has no subscription-based roles to downgrade',
        currentRoles: currentRoles
      })
    }

    // Check subscription status with RevenueCat
    try {
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'RevenueCat configuration missing' 
        }, { status: 500 })
      }

      const purchases = Purchases.configure(apiKey, userId)
      const customerInfo = await purchases.getCustomerInfo()
      
      // Check for active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
      const hasActiveSubscription = activeEntitlements.length > 0

      if (hasActiveSubscription) {
        return NextResponse.json({ 
          message: 'User still has active subscription, no downgrade needed',
          hasActiveSubscription: true,
          activeEntitlements: activeEntitlements,
          currentRoles: currentRoles
        })
      }

      // User has no active subscription, proceed with downgrade
      let newRoles = [...currentRoles]
      
      // Remove subscription-based roles
      newRoles = newRoles.filter(role => role !== 'customer' && role !== 'host')
      
      // Ensure user has at least guest role
      if (newRoles.length === 0 || !newRoles.includes('guest')) {
        newRoles.push('guest')
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
        message: 'Successfully downgraded user role due to expired subscription',
        previousRoles: currentRoles,
        newRoles: updatedUser.role,
        hasActiveSubscription: false,
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
    console.error('Role downgrade error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 