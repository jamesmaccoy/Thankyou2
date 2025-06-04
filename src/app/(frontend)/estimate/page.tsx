'use client'

import React, { Suspense } from 'react' // Import Suspense
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button' // Assuming you have a Button component
import EstimateClient from './page.client'

export default function EstimatePage() {
  const router = useRouter()
  const { currentUser } = useUserContext()
  const { isSubscribed, isLoading, error } = useSubscription()

  if (isLoading) {
    return (
      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-6">Estimate</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-6">Estimate</h1>
        <p className="text-error">Error: {error.message}</p>
      </div>
    )
  }

  return (
    <>
      {/* Wrap the part using useSearchParams in Suspense */}
      <Suspense fallback={<EstimateClient />}>
        <EstimateInner />
      </Suspense>
    </>
  )
} 

// New component to contain logic using useSearchParams
function EstimateInner() {
  const searchParams = useSearchParams()
  const bookingTotal = searchParams.get('total') ?? 'N/A'
  const bookingDuration = searchParams.get('duration') ?? 'N/A'

  return (
    <>
      {/* Booking Summary Header */}
      <div className="pt-12 pb-6">
        <div className="bg-muted p-6 rounded-lg border border-border mb-6 text-center">
          <h2 className="text-3xl font-semibold mb-2">R{bookingTotal}</h2>
          <p className="text-lg text-muted-foreground">Total for {bookingDuration} nights</p>
        </div>
      </div>
      {/* The actual premium content */}
      <EstimateClient bookingTotal={bookingTotal} bookingDuration={bookingDuration} />
    </>
  )
}

// Simple loading component for the Suspense fallback
function EstimateLoading() {
  return (
    <div className="container py-12 text-center">
      <p>Loading booking details...</p>
    </div>
  )
} 