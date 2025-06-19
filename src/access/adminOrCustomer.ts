import type { AccessArgs } from 'payload'
import type { User } from '@/payload-types'

type AdminOrCustomer = (args: AccessArgs<User>) => boolean

export const adminOrCustomer: AdminOrCustomer = ({ req: { user } }) => {
  if (!user) return false
  
  const roles = user.role || []
  return roles.includes('admin') || roles.includes('customer')
} 