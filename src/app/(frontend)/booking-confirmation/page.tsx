// app/(frontend)/booking-confirmation/page.tsx
import { getMeUser } from "@/utilities/getMeUser"
import { redirect } from "next/navigation"
import { getPayload } from "payload"
import config from "@payload-config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ConfettiCelebration } from "./confetti-celebration"

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const bookingId = params.bookingId
  let duration = "N/A"

  const payload = await getPayload({ config })

  let booking = null
  
  if (bookingId && typeof bookingId === "string") {
    // Try to find the booking by ID
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        id: {
          equals: bookingId,
        },
      },
      depth: 2,
      limit: 1,
    })
    
    booking = bookings.docs[0] || null
  }

  // Calculate duration if we have a booking
  if (booking?.fromDate && booking?.toDate) {
    const fromDate = new Date(booking.fromDate)
    const toDate = new Date(booking.toDate)
    
    // Calculate duration in days
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString()
  }
  
  // Fallback to search params if booking not found
  const bookingTotal = typeof params.total === "string" ? params.total : "N/A"
  const bookingDuration = booking ? duration : (typeof params.duration === "string" ? params.duration : "N/A")
  const totalAmount = 
    !isNaN(Number(bookingTotal)) && !isNaN(Number(bookingDuration)) 
      ? Number(bookingTotal) * Number(bookingDuration) 
      : "N/A"
  
  return (
    <div className="container py-10">
      <ConfettiCelebration />
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tighter mb-4">Booking Confirmed!</h1>
          <p className="text-muted-foreground">Thank you for your booking. We&apos;re excited to host you!</p>
        </div>
        
        <div className="bg-muted p-6 rounded-lg border border-border mb-8">
          <h2 className="text-2xl font-semibold mb-4">Booking Details</h2>
          
          <div className="space-y-4">
            {booking?.id && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-medium">{booking.id}</span>
              </div>
            )}
            
            {booking?.fromDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Check-in Date:</span>
                <span className="font-medium">{new Date(booking.fromDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {booking?.toDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Check-out Date:</span>
                <span className="font-medium">{new Date(booking.toDate).toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rate per night:</span>
              <span className="font-medium">R{bookingTotal}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{bookingDuration} nights</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-2xl font-bold">R{totalAmount}</span>
            </div>
            
            {booking?.paymentStatus && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className="font-medium text-green-600">
                  {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/bookings" passHref>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              View All Bookings
            </Button>
          </Link>
          
          <Link href="/" passHref>
            <Button variant="outline">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}