import { User } from '@/payload-types'
import { Access } from 'payload'

export const hostOrSelfOrGuests =
  (userField: string, guestsField: string): Access<User> =>
  ({ req: { user } }) => {
    if (!user) return false

    if (user?.role?.includes('host')) {
      return true
    }

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
