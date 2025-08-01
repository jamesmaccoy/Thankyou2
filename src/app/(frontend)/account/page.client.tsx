'use client'

import React from 'react'
import { User } from '@/payload-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, User as UserIcon, Crown, Calendar, FileText, CreditCard, LogOut } from 'lucide-react'
import { RoleUpgrade } from '@/components/RoleUpgrade'
import { useSubscription } from '@/hooks/useSubscription'
import { useCustomerCenter } from '@/components/CustomerCenter'
import { useUserContext } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AccountClientProps {
  user: User | null
}

export default function AccountClient({ user }: AccountClientProps) {
  const { isSubscribed, isLoading } = useSubscription()
  const { CustomerCenterComponent, presentCustomerCenter } = useCustomerCenter()
  const { handleAuthChange } = useUserContext()
  const router = useRouter()

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">You need to be logged in to view this page.</p>
        </div>
      </div>
    )
  }

  const userRoles = Array.isArray(user.role) ? user.role : []
  const isGuest = userRoles.includes('guest')
  const isHost = userRoles.includes('host')
  const isAdmin = userRoles.includes('admin')

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        // Update user context to reflect logout
        handleAuthChange()
        // Redirect to home page
        router.push('/')
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account</h1>
        <p className="text-gray-600 mt-2">Manage your account and access your features</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Upgrade Section */}
          <RoleUpgrade />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and features you can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col gap-2"
                  onClick={presentCustomerCenter}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Purchase History</span>
                </Button>
                {(isHost || isAdmin) && (
                  <>
                    <Link href="/plek/adminPage">
                      <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                        <FileText className="h-5 w-5" />
                        <span>Manage Pleks</span>
                      </Button>
                    </Link>
                    <Link href="/bookings">
                      <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                        <Calendar className="h-5 w-5" />
                        <span>View Bookings</span>
                      </Button>
                    </Link>
                  </>
                )}
                <Link href="/estimate">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>Get Estimate</span>
                  </Button>
                </Link>
                {isSubscribed && (
                  <Link href="/plek">
                    <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                      <FileText className="h-5 w-5" />
                      <span>Book a Plek</span>
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity / Features */}
          <Card>
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
              <CardDescription>
                Features you can access based on your current role and subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Booking Estimates</div>
                    <div className="text-sm text-gray-600">Get pricing estimates for stays</div>
                  </div>
                  <Badge variant="secondary">Available</Badge>
                </div>
                
                {isSubscribed && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Plek Booking</div>
                      <div className="text-sm text-gray-600">Book stays at available pleks</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                )}

                {(isHost || isAdmin) && (
                  <>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Create Blog Posts</div>
                        <div className="text-sm text-gray-600">Write and publish blog content</div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Host</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Manage Pleks</div>
                        <div className="text-sm text-gray-600">Create and manage property listings</div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Host</Badge>
                    </div>
                  </>
                )}

                {isGuest && !isSubscribed && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-500">Book or host a plek</div>
                      <div className="text-sm text-gray-400">Subscribe to unlock calendar</div>
                    </div>
                    <Link href="/subscribe">
                      <Button size="sm">Join the waitlist</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium">{user.name || 'No name set'}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Roles</div>
                <div className="flex flex-wrap gap-2">
                  {userRoles.map((role) => (
                    <Badge 
                      key={role} 
                      variant={role === 'admin' ? 'destructive' : role === 'host' ? 'default' : 'secondary'}
                      className={role === 'host' ? 'bg-purple-100 text-purple-800' : ''}
                    >
                      {role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                      {role === 'host' && <Crown className="h-3 w-3 mr-1" />}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              {!isLoading && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Subscription</div>
                  <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                    {isSubscribed ? 'Active' : 'None'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card>
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium">Need assistance?</p>
                <p className="text-gray-600 mt-1">
                  Contact our support team for help with your account or booking questions.
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logout Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Customer Center Modal */}
      <CustomerCenterComponent />
    </div>
  )
} 