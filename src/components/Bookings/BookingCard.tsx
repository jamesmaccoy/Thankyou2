import { type Media as MediaType, User } from '@/payload-types'
import { formatDate } from 'date-fns'
import { CalendarIcon, UsersIcon, Eye, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import React, { FC } from 'react'
import { Media } from '../Media'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

type Props = {
  booking: {
    fromDate: string
    toDate: string
    guests: (string | User)[] | null | undefined
    id: string
    slug?: string | null | undefined
    title: string
    meta?:
      | {
          title?: string | null | undefined
          image?: string | MediaType | null | undefined
        }
      | undefined
    type?: 'booking' | 'estimate'
    customer?: (string | User) | null | undefined
  }
}

const BookingCard: FC<Props> = ({ booking }) => {
  const isEstimate = booking.type === 'estimate'
  const linkPath = isEstimate ? `/estimate/${booking.id}` : `/bookings/${booking.id}`
  
  // Count accepted guests (excluding customer)
  const acceptedGuests = booking.guests?.filter(Boolean) || []
  const totalGuests = acceptedGuests.length + 1 // +1 for customer
  
  // Get guest names for display
  const guestNames = acceptedGuests
    .map(guest => typeof guest === 'string' ? 'Guest' : guest.name || 'Guest')
    .slice(0, 2) // Show first 2 guest names
  
  const hasMoreGuests = acceptedGuests.length > 2
  
  return (
    <Link key={booking.id} href={linkPath}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <div className="relative flex gap-3 p-2">
          <div className="relative w-24 h-24 flex-shrink-0">
            {!booking.meta?.image && <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">No Image</div>}
            {booking.meta?.image && typeof booking.meta?.image !== 'string' && (
              <>
                <Media resource={booking.meta.image} size="25vw" className="w-full h-full object-cover rounded-md" />
                {totalGuests > 0 && (
                  <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                    <UsersIcon className="size-4" />
                    <span className="text-sm font-medium">{totalGuests}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl">{booking.title}</CardTitle>
              {isEstimate && (
                <Badge variant="outline" className="text-xs">
                  Estimate
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="size-4" />
                <div className="text-sm">
                  {formatDate(new Date(booking.fromDate), 'PPP')} -{' '}
                  {formatDate(new Date(booking.toDate), 'PPP')}
                </div>
              </div>
              
              {/* Guest information */}
              {acceptedGuests.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4" />
                  <div className="text-sm">
                    {guestNames.join(', ')}
                    {hasMoreGuests && ` +${acceptedGuests.length - 2} more`}
                    {acceptedGuests.length === 1 ? ' has' : ' have'} joined
                  </div>
                </div>
              )}
              
              {/* Customer info if current user is a guest */}
              {booking.customer && typeof booking.customer !== 'string' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4" />
                  <div className="text-sm">
                    Host: {booking.customer.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default BookingCard
