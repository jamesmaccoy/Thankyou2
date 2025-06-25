'use client'

import React, { useState, useEffect } from 'react'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Users, Star, Crown, AlertCircle } from 'lucide-react'
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
  const isGuest = currentUser?.role?.includes('guest') && !currentUser?.role?.includes('customer') && !currentUser?.role?.includes('host')
  const canUpgrade = isGuest && isSubscribed

  const handleRoleUpgrade = async (targetRole: 'customer' | 'host') => {
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
        body: JSON.stringify({ targetRole }),
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Upgrade Your Account
          </CardTitle>
          <CardDescription>
            You have an active host subscription! Choose your account type to unlock features.
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

          <div className="grid md:grid-cols-2 gap-4">
            {/* Customer Role */}
            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                  Customer
                </CardTitle>
                <CardDescription>
                  Perfect for booking stays and creating listings
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Create and manage your plek listings
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Book stays at other pleks
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Manage your bookings and estimates
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Access to customer features
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={() => handleRoleUpgrade('customer')}
                  disabled={isUpgrading}
                  className="w-full"
                  variant="outline"
                >
                  {isUpgrading ? 'Upgrading...' : 'Become a Customer'}
                </Button>
              </CardFooter>
            </Card>

            {/* Host Role */}
            <Card className="border-2 border-purple-200 hover:border-purple-300 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="h-5 w-5 text-purple-500" />
                  Host
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </CardTitle>
                <CardDescription>
                  Full access to host multiple properties
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Everything in Customer, plus:
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Host multiple properties
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Advanced analytics and insights
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Priority support
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Access to host-only features
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={() => handleRoleUpgrade('host')}
                  disabled={isUpgrading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isUpgrading ? 'Upgrading...' : 'Become a Host'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="text-xs text-gray-500 text-center">
            You can change your role again later if needed. Your subscription will remain active.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RoleUpgrade 