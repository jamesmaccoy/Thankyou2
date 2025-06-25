import { User } from '@/payload-types'
import { Access } from 'payload'

export const isHost: Access<User> = ({ req: { user } }) => {
  if (!user) return false

  if (user?.role?.includes('host')) {
    return true
  }

  return false
}
