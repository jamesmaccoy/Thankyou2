import { Access, PayloadRequest } from 'payload'
import { Purchases } from '@revenuecat/purchases-js'

// Access control that requires both proper role AND active subscription
export const requiresSubscription: Access = async ({ req }: { req: PayloadRequest }) => {
  const { user } = req
  if (!user) return false
  
  const roles = user.role || []
  
  // Admins bypass subscription check
  if (roles.includes('admin')) {
    return true
  }
  
  // For hosts and customers, check subscription
  if (roles.includes('host') || roles.includes('customer')) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
      if (!apiKey) {
        console.error('RevenueCat API key missing')
        return false
      }
      
      const purchases = Purchases.configure(apiKey, user.id)
      const customerInfo = await purchases.getCustomerInfo()
      
      // Check for active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active || {})
      const hasActiveSubscription = activeEntitlements.length > 0
      
      return hasActiveSubscription
    } catch (error) {
      console.error('Subscription check error:', error)
      return false
    }
  }
  
  return false
}

// For admin interface access specifically
export const requiresSubscriptionForAdmin: Access = async ({ req }: { req: PayloadRequest }) => {
  return await requiresSubscription({ req })
} 