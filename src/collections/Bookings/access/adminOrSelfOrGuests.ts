import { User } from '@/payload-types'
import { Access } from 'payload'

export const hostOrSelfOrGuests =
  (userField: string, guestsField: string): Access<User> =>
  ({ req: { user } }) => {
    if (!user) return false

    // Admins and hosts can see all bookings
    if (user?.role?.includes('admin') || user?.role?.includes('host')) {
      return true
    }

    // Customers can see their own bookings or bookings where they are guests
    return {
      or: [
        {
          [userField]: {
            equals: user?.id,
          },
        },
        {
          [guestsField]: {
            contains: user?.id,
          },
        },
      ],
    }
  }
