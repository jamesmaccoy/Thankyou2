import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Purchases } from '@revenuecat/purchases-js'

type UserRole = 'host' | 'admin' | 'customer' | 'guest'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Admin authentication check (you may want to add proper admin auth)
    const authCookie = request.cookies.get('payload-token')
    if (!authCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all users with customer or host roles
    const users = await payload.find({
      collection: 'users',
      where: {
        or: [
          { role: { contains: 'customer' } },
          { role: { contains: 'host' } }
        ]
      },
      limit: 1000 // Adjust as needed
    })

    const downgrades = []
    const errors = []

    for (const user of users.docs) {
      try {
        // Skip if user doesn't have customer or host role
        const userRoles = user.role || []
        if (!userRoles.includes('customer') && !userRoles.includes('host')) {
          continue
        }

        const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
        if (!apiKey) {
          errors.push({ userId: user.id, error: 'RevenueCat configuration missing' })
          continue
        }

        const purchases = Purchases.configure(apiKey, user.id)
        const customerInfo = await purchases.getCustomerInfo()
        
        // Check for active entitlements
        const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
        const hasActiveSubscription = activeEntitlements.length > 0

        if (!hasActiveSubscription) {
          // User has no active subscription, downgrade their role
          let newRoles = [...userRoles]
          
          // Remove customer and host roles
          newRoles = newRoles.filter(role => role !== 'customer' && role !== 'host')
          
          // Add guest role if no roles remain
          if (newRoles.length === 0 || !newRoles.includes('guest')) {
            newRoles.push('guest')
          }

          // Update the user in the database
          await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              role: newRoles,
            },
          })

          downgrades.push({
            userId: user.id,
            email: user.email,
            previousRoles: userRoles,
            newRoles: newRoles,
            reason: 'No active subscription'
          })
        }

      } catch (userError) {
        errors.push({
          userId: user.id,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${users.docs.length} users`,
      downgrades: downgrades,
      downgradeCount: downgrades.length,
      errors: errors,
      errorCount: errors.length
    })

  } catch (error) {
    console.error('Role downgrade check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 