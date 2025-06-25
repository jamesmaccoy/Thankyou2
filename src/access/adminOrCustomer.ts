import type { AccessArgs } from 'payload'
import type { User } from '@/payload-types'

type HostOrCustomer = (args: AccessArgs<User>) => boolean

export const hostOrCustomer: HostOrCustomer = ({ req: { user } }) => {
  if (!user) return false
  
  const roles = user.role || []
  return roles.includes('host') || roles.includes('customer')
} 