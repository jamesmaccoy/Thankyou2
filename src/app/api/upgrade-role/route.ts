import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Purchases } from '@revenuecat/purchases-js'

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

    // Get the requested role from the request body
    const { targetRole } = await request.json()
    
    if (!targetRole || !['customer', 'host'].includes(targetRole)) {
      return NextResponse.json({ 
        error: 'Invalid target role. Must be either "customer" or "host"' 
      }, { status: 400 })
    }

    // Check if user already has the target role
    if (user.role?.includes(targetRole)) {
      return NextResponse.json({ 
        message: `User already has ${targetRole} role`,
        currentRoles: user.role 
      })
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
      
      // Check for active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
      const hasActiveSubscription = activeEntitlements.length > 0

      if (!hasActiveSubscription) {
        return NextResponse.json({ 
          error: 'Active host subscription required to upgrade role',
          hasSubscription: false,
          activeEntitlements: activeEntitlements
        }, { status: 403 })
      }

      // Update user role
      const currentRoles = user.role || []
      let newRoles = [...currentRoles]

      // Remove guest role if present and add target role
      if (newRoles.includes('guest')) {
        newRoles = newRoles.filter(role => role !== 'guest')
      }
      
      if (!newRoles.includes(targetRole)) {
        newRoles.push(targetRole)
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