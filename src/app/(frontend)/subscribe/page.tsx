'use client'

import React, { useEffect, useState } from 'react'
import { useUserContext } from '@/context/UserContext'
import { useRevenueCat } from '@/providers/RevenueCat'
import { useSubscription } from '@/hooks/useSubscription'
import { Purchases, Package, PurchasesError, ErrorCode, Offering } from '@revenuecat/purchases-js'
import { useRouter } from 'next/navigation'

export default function SubscribePage() {
  const router = useRouter()
  const { currentUser, handleAuthChange } = useUserContext()
  const { customerInfo, isInitialized } = useRevenueCat()
  const { isSubscribed, isLoading } = useSubscription()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPurchasesConfigured, setIsPurchasesConfigured] = useState(false)

  useEffect(() => {
    if (isInitialized) {
      loadOfferings()
    }
  }, [isInitialized])

  useEffect(() => {
    if (!isLoading && isSubscribed) {
      console.log('User already subscribed, redirecting to /bookings from useEffect.')
      router.push('/bookings')
    }
  }, [isLoading, isSubscribed, router])

  const loadOfferings = async () => {
    setLoadingOfferings(true)
    try {
      const fetched = await Purchases.getSharedInstance().getOfferings()
      console.log("Fetched Offerings Object:", fetched)
      setOfferings(Object.values(fetched.all))
    } catch (err) {
      console.error('Error loading offerings:', err)
      setError('Failed to load subscription offerings: ' + (err instanceof Error ? err.message : JSON.stringify(err)))
    } finally {
      setLoadingOfferings(false)
    }
  }

  const handlePurchase = async (pkg: Package) => {
    if (!currentUser) {
      router.push(`/login?redirect=/subscribe&packageId=${pkg.identifier}`)
      return
    }
    try {
      setError(null)
      await Purchases.getSharedInstance().purchase({
        rcPackage: pkg
      })
      
      // After successful purchase, attempt to upgrade role automatically
      try {
        const upgradeResponse = await fetch('/api/upgrade-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ targetRole: 'host' }),
        })
        
        if (upgradeResponse.ok) {
          // Role upgrade succeeded, refresh user context
          await handleAuthChange()
          console.log('Role upgrade successful after purchase')
        } else {
          console.log('Role upgrade failed or not yet ready, user can upgrade later')
        }
      } catch (upgradeError) {
        console.log('Role upgrade attempt failed, user can upgrade later:', upgradeError)
        // Don't show error to user - they can upgrade manually later
      }
      
      // Redirect to admin page which accepts both customer and host roles
      router.push('/plek/adminPage')
    } catch (purchaseError) {
      const rcError = purchaseError as PurchasesError
      console.error('RevenueCat Purchase Error (Full Object):', rcError)
      console.error('RevenueCat Purchase Error Name:', rcError.name)
      console.error('RevenueCat Purchase Error Message:', rcError.message)

      let isCancelled = false
      try {
        if (rcError && typeof rcError === 'object' && 'code' in rcError && (rcError as { code: unknown }).code === ErrorCode.UserCancelledError) {
          isCancelled = true
        }
      } catch (e) { /* Silently ignore if .code access fails */ }

      if (isCancelled) {
        console.log('User cancelled the purchase flow.')
        return
      }
      
      setError('Failed to complete purchase. Please try again or contact support.')
    }
  }

  // Find the correct offering
  const adminOffering = offerings.find(o => o.identifier === 'simpleplek_admin')

  const monthlyPlan      = adminOffering?.availablePackages.find(p => p.identifier === '$rc_monthly')
  const annualPlan       = adminOffering?.availablePackages.find(p => p.identifier === '$rc_annual')
  const professionalPlan = adminOffering?.availablePackages.find(p => p.identifier === '$rc_six_month')
  
  console.log("Monthly Plan Found:", monthlyPlan)
  console.log("Annual Plan Found:", annualPlan)
  console.log("Professional Plan Found:", professionalPlan)
  console.log({ monthlyPlan, annualPlan, professionalPlan });

  if (!isInitialized) {
    return <div>Please log in</div>;
  }
  if (isSubscribed) {
    return <div>You are already subscribed!</div>;
  }

  return (
    <div className="container py-16 sm:py-24">
      {error && offerings.length > 0 && (
        <div className="mb-8 p-4 text-center text-sm text-destructive bg-destructive/10 rounded-md">
          <p>{error}</p>
        </div>
      )}
      <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Stay at our self built cabins</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
        Become a a member to access the calendar</p>
      </div>

      <div className="mx-auto max-w-4xl grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
        {monthlyPlan && (() => {
          const product = monthlyPlan.webBillingProduct
          return (
            <div key={monthlyPlan.identifier} className="rounded-2xl border border-border p-8 shadow-sm">
              <h2 className="text-lg font-semibold leading-8 text-foreground">{product.displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description || 'Access all standard features.'}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{product.currentPrice.formattedPrice}</span>
                <span className="text-sm font-semibold leading-6 text-muted-foreground">/month</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                <li className="flex gap-x-3">Calendar booking request</li>
                <li className="flex gap-x-3">Curated unique packages</li>
                <li className="flex gap-x-3">Invite guests</li>
              </ul>
              <button
                onClick={() => handlePurchase(monthlyPlan)}
                className="mt-8 block w-full rounded-md bg-secondary px-3.5 py-2.5 text-center text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Pay way later
              </button>
            </div>
          )
        })()}

        {annualPlan && (() => {
          const product = annualPlan.webBillingProduct
          return (
            <div key={annualPlan.identifier} className="relative rounded-2xl border border-primary p-8 shadow-lg">
              <div className="absolute top-0 -translate-y-1/2 transform rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground">
                Most popular
              </div>
              <h2 className="text-lg font-semibold leading-8 text-foreground">{product.displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description || 'Get the best value with annual billing.'}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{product.currentPrice.formattedPrice}</span>
                <span className="text-sm font-semibold leading-6 text-muted-foreground">/year</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                <li className="flex gap-x-3">Calendar booking request</li>
                <li className="flex gap-x-3">Curated unique packages</li>
                <li className="flex gap-x-3">Invite guests</li>
                <li className="flex gap-x-3">Welcome meeting</li>
              </ul>
              <button
                onClick={() => handlePurchase(annualPlan)}
                className="mt-8 block w-full rounded-md bg-primary px-3.5 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Book Now - Save
              </button>
            </div>
          )
        })()}
      </div>

      {professionalPlan && (() => {
        const product = professionalPlan.webBillingProduct;
        return (
          <div 
            className="mt-16 pt-16 pb-16 md:border-t border-border bg-cover bg-center relative rounded-lg shadow-md"
            style={{ backgroundImage: `url('https://llandudnoshack.co.za/images/Gallery-shack.jpg')` }}
          >
            <div className="absolute inset-0 bg-black/30 rounded-lg"></div> 

            <div className="relative max-w-4xl mx-auto px-4 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"> 
              
              <div className="text-center lg:text-left text-white">
                 <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Host a plek</h2>
              </div>

              <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
                  <h3 className="text-lg font-semibold leading-8 text-foreground">{product.displayName}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description || 'Advanced features for professionals.'}</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-foreground">{product.currentPrice.formattedPrice}</span>
                    <span className="text-sm font-semibold leading-6 text-muted-foreground">/term</span>
                  </p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                    <li className="flex gap-x-3">Insight report</li>
                    <li className="flex gap-x-3">Calendar booking request</li>
                    <li className="flex gap-x-3">Short term lease agreement</li>
                    <li className="flex gap-x-3">Estimates for guests</li>
                  </ul>
                  <button
                    onClick={() => handlePurchase(professionalPlan)}
                    className="mt-8 block w-full rounded-md bg-secondary px-3.5 py-2.5 text-center text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Host a plek
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}