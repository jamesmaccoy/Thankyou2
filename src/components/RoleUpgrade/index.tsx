'use client'

import React, { useState, useEffect } from 'react'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Crown, Star, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RoleUpgradeProps {
  className?: string
}

export const RoleUpgrade: React.FC<RoleUpgradeProps> = ({ className }) => {
  const { currentUser, handleAuthChange } = useUserContext()
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null)

  // Check if user is a guest and has a subscription
  const isGuest = currentUser?.role?.includes('guest') && !currentUser?.role?.includes('host')
  const isCustomer = currentUser?.role?.includes('customer') && !currentUser?.role?.includes('host')
  const canUpgrade = (isGuest || isCustomer) && isSubscribed

  // Debug logging
  console.log('RoleUpgrade Debug:', {
    currentUser: currentUser,
    userRoles: currentUser?.role,
    isGuest: isGuest,
    isCustomer: isCustomer,
    isSubscribed: isSubscribed,
    isSubscriptionLoading: isSubscriptionLoading,
    canUpgrade: canUpgrade
  })

  const handleRoleUpgrade = async () => {
    setIsUpgrading(true)
    setUpgradeError(null)
    setUpgradeSuccess(null)

    try {
      const response = await fetch('/api/upgrade-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ targetRole: 'host' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upgrade role')
      }

      setUpgradeSuccess(data.message)
      
      // Refresh user context to get updated roles
      handleAuthChange()

    } catch (error) {
      console.error('Role upgrade error:', error)
      setUpgradeError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsUpgrading(false)
    }
  }

  // Don't show component if user can't upgrade
  if (!canUpgrade || isSubscriptionLoading) {
    return null
  }

  return (
    <div className={className}>
      <Card className="w-full max-w-lg mx-auto border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Activate Your Host Account
          </CardTitle>
          <CardDescription>
            You have an active host subscription! Activate your host privileges to start managing your pleks.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {upgradeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{upgradeError}</AlertDescription>
            </Alert>
          )}

          {upgradeSuccess && (
            <Alert className="border-green-500 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{upgradeSuccess}</AlertDescription>
            </Alert>
          )}

          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-purple-600" />
                Host Account
                <Badge className="bg-purple-600 text-white text-xs">Ready to Activate</Badge>
              </CardTitle>
              <CardDescription>
                Unlock full hosting capabilities for your pleks
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Create and manage multiple plek listings
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Access booking management tools
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Create blog posts and content
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Advanced analytics and insights
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Priority support and features
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleRoleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                {isUpgrading ? 'Activating...' : 'Activate Host Account'}
              </Button>
            </CardFooter>
          </Card>

          <div className="text-xs text-gray-500 text-center">
            Your subscription will remain active. You can access all host features immediately after activation.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RoleUpgrade 