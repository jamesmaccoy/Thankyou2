'use client'

import React, { useState } from 'react'
import { useRevenueCat } from '@/providers/RevenueCat'
import { useSubscription } from '@/hooks/useSubscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  Calendar, 
  Receipt, 
  Settings, 
  X, 
  Crown,
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  MessageSquare,
  XCircle,
  ArrowUpDown
} from 'lucide-react'
import { formatDateTime } from '@/utilities/formatDateTime'

// Type definitions for RevenueCat structures
interface RevenueCatEntitlement {
  productIdentifier?: string
  expirationDate?: string | null
  purchaseDate?: string | null
  willRenew?: boolean
  isActive?: boolean
  billingPeriod?: string
  price?: number
  currency?: string
}

interface RevenueCatTransaction {
  productId: string
  purchaseDate: string
  transactionId?: string
  isRefunded?: boolean
}

interface CustomerCenterProps {
  isOpen: boolean
  onClose: () => void
}

// Helper function to format currency
const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
  if (amount === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100) // RevenueCat typically stores prices in cents
}

// Helper function to format billing period
const formatBillingPeriod = (period: string | undefined) => {
  if (!period) return 'Unknown'
  switch (period.toLowerCase()) {
    case 'p1m': return 'Monthly'
    case 'p1y': return 'Yearly'
    case 'p1w': return 'Weekly'
    case 'p3m': return 'Quarterly'
    case 'p6m': return 'Every 6 months'
    default: return period
  }
}

export function CustomerCenter({ isOpen, onClose }: CustomerCenterProps) {
  const { customerInfo, isLoading, refreshCustomerInfo, restorePurchases } = useRevenueCat()
  const { isSubscribed, entitlements } = useSubscription()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshCustomerInfo()
    } catch (error) {
      console.error('Failed to refresh customer info:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRestorePurchases = async () => {
    setIsRefreshing(true)
    try {
      await restorePurchases()
    } catch (error) {
      console.error('Failed to restore purchases:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleActionClick = (action: string) => {
    console.log(`Customer action: ${action}`)
    // In a real implementation, these would open support tickets or redirect to appropriate pages
    alert(`This would open a support form for: ${action}`)
  }

  if (!customerInfo && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Customer Center
            </DialogTitle>
            <DialogDescription>
              No purchase information available
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No purchase history found. Make a purchase to see your transaction history here.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Customer Center
          </DialogTitle>
          <DialogDescription>
            Manage your subscriptions and view purchase history
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading purchase information...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Customer ID</div>
                    <div className="text-sm text-gray-600 font-mono">
                      {customerInfo?.originalAppUserId || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Subscription Status</div>
                    <Badge variant={isSubscribed ? 'default' : 'secondary'} className="mt-1">
                      {isSubscribed ? 'Active' : 'No active subscription'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Account Created</div>
                    <div className="text-sm text-gray-600">
                      {customerInfo?.firstSeen ? new Date(customerInfo.firstSeen).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRestorePurchases}
                    disabled={isRefreshing}
                  >
                    Restore Purchases
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Subscriptions with Billing Info */}
            {customerInfo?.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Active Subscriptions
                  </CardTitle>
                  <CardDescription>
                    Your current active subscriptions with billing details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(customerInfo.entitlements.active).map(([key, entitlementData]) => {
                      const entitlement = entitlementData as RevenueCatEntitlement
                      return (
                        <div key={key} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="font-medium text-lg">{key}</div>
                              <div className="text-sm text-gray-600">
                                Product: {entitlement.productIdentifier || 'Unknown'}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>

                          {/* Billing Information Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-gray-600" />
                                <div className="text-sm font-medium text-gray-700">Current Price</div>
                              </div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(entitlement.price, entitlement.currency)}
                              </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <RefreshCw className="h-4 w-4 text-gray-600" />
                                <div className="text-sm font-medium text-gray-700">Billing Cycle</div>
                              </div>
                              <div className="text-lg font-semibold">
                                {formatBillingPeriod(entitlement.billingPeriod)}
                              </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <div className="text-sm font-medium text-gray-700">Next Billing</div>
                              </div>
                              <div className="text-lg font-semibold">
                                {entitlement.expirationDate ? 
                                  new Date(entitlement.expirationDate).toLocaleDateString() : 
                                  'Unknown'
                                }
                              </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-gray-600" />
                                <div className="text-sm font-medium text-gray-700">Auto-Renewal</div>
                              </div>
                              <div className="text-lg font-semibold">
                                {entitlement.willRenew !== undefined ? 
                                  (entitlement.willRenew ? 'Enabled' : 'Disabled') : 
                                  'Unknown'
                                }
                              </div>
                            </div>
                          </div>

                          {/* Purchase Details */}
                          <div className="space-y-2 text-sm text-gray-600">
                            {entitlement.purchaseDate && (
                              <div>
                                <span className="font-medium">Purchased:</span> {new Date(entitlement.purchaseDate).toLocaleDateString()}
                              </div>
                            )}
                            {entitlement.expirationDate && (
                              <div>
                                <span className="font-medium">Expires:</span> {new Date(entitlement.expirationDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Customer Actions
                </CardTitle>
                <CardDescription>
                  Need help with your subscription or purchases?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                    onClick={() => handleActionClick('Didn\'t receive purchase')}
                  >
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">Didn't Receive Purchase</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                    onClick={() => handleActionClick('Request a refund')}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-sm">Request a Refund</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                    onClick={() => handleActionClick('Change plans')}
                  >
                    <ArrowUpDown className="h-5 w-5" />
                    <span className="text-sm">Change Plans</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleActionClick('Cancel subscription')}
                  >
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm">Cancel Subscription</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Purchase History */}
            {customerInfo?.allPurchaseDates && Object.keys(customerInfo.allPurchaseDates).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Purchase History
                  </CardTitle>
                  <CardDescription>
                    All your purchases and transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(customerInfo.allPurchaseDates)
                      .sort(([, a], [, b]) => {
                        const dateA = typeof a === 'string' ? new Date(a).getTime() : 0
                        const dateB = typeof b === 'string' ? new Date(b).getTime() : 0
                        return dateB - dateA
                      })
                      .map(([productId, purchaseDate]) => (
                      <div key={`${productId}-${purchaseDate}`} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{productId}</div>
                            <div className="text-sm text-gray-600">
                              {typeof purchaseDate === 'string' ? new Date(purchaseDate).toLocaleDateString() : 'Unknown date'} at {typeof purchaseDate === 'string' ? new Date(purchaseDate).toLocaleTimeString() : 'Unknown time'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Subscription</Badge>
                            <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Non-subscription purchases */}
            {customerInfo?.nonSubscriptionTransactions && Array.isArray(customerInfo.nonSubscriptionTransactions) && customerInfo.nonSubscriptionTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    One-time Purchases
                  </CardTitle>
                  <CardDescription>
                    Non-subscription purchases and add-ons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customerInfo.nonSubscriptionTransactions
                      .filter((transaction: any): transaction is RevenueCatTransaction => 
                        transaction && 
                        typeof transaction === 'object' && 
                        'productId' in transaction && 
                        'purchaseDate' in transaction
                      )
                      .sort((a: RevenueCatTransaction, b: RevenueCatTransaction) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                      .map((transaction: RevenueCatTransaction, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{transaction.productId}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(transaction.purchaseDate).toLocaleDateString()} at {new Date(transaction.purchaseDate).toLocaleTimeString()}
                            </div>
                            {transaction.transactionId && (
                              <div className="text-xs text-gray-500 font-mono">
                                ID: {transaction.transactionId}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">One-time</Badge>
                            {transaction.isRefunded && (
                              <Badge variant="destructive" className="text-xs">
                                Refunded
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Support</CardTitle>
                <CardDescription>
                  Need more help? Contact our support team directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  For billing questions, technical issues, or other concerns not covered above, our support team is here to help.
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm">
                    View FAQ
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debug Info (only show in development) */}
            {process.env.NODE_ENV === 'development' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Debug Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded max-h-40">
                    {JSON.stringify(customerInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Hook for using Customer Center
export function useCustomerCenter() {
  const [isOpen, setIsOpen] = useState(false)

  const presentCustomerCenter = () => {
    setIsOpen(true)
    console.log("Customer center presented")
  }

  const dismissCustomerCenter = () => {
    setIsOpen(false)
    console.log("Customer center dismissed")
  }

  return {
    CustomerCenterComponent: () => (
      <CustomerCenter isOpen={isOpen} onClose={dismissCustomerCenter} />
    ),
    presentCustomerCenter,
    dismissCustomerCenter,
    isOpen
  }
} 