import { User } from '@/payload-types'
import { Access } from 'payload'

export const isAdmin: Access<User> = ({ req: { user } }) => {
  if (!user) return false

  if (user?.role?.includes('admin')) {
    return true
  }

  return false
}

export const isHost: Access<User> = ({ req: { user } }) => {
  if (!user) return false

  if (user?.role?.includes('host')) {
    return true
  }

  return false
}

export const isAdminOrCreatedBy: Access = ({ req: { user } }) => {
  if (!user) return false
  
  // Admins can access everything
  if (user?.role?.includes('admin')) {
    return true
  }
  
  // Hosts and customers can only access their own posts
  if (user?.role?.includes('host') || user?.role?.includes('customer')) {
    return {
      authors: {
        contains: user.id,
      },
    }
  }
  
  return false
}
