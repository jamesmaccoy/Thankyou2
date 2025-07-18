import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access/isAdmin'

const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email'],
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        // Ensure new users get guest role if no role is provided
        if (operation === 'create' && (!data.role || data.role.length === 0)) {
          data.role = ['guest']
        }
        
        // Prevent non-admin users from setting admin, customer, or host roles during registration
        if (operation === 'create' && !req.user) {
          // This is a registration (no authenticated user)
          data.role = ['guest']
        }
        
        return data
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      // Admins can see all users
      if (user?.role?.includes('admin')) {
        return true
      }
      
      // Other users can only see their own record
      if (user) {
        return {
          id: {
            equals: user.id,
          },
        }
      }
      
      // Non-authenticated users can't see any users
      return false
    },
    create: () => true, // Allow user registration
    update: ({ req: { user }, id }) => {
      if (!user) return false
      if (user?.role?.includes('admin')) return true
      return user.id === id
    },
    delete: isAdmin,
    admin: ({ req: { user } }) => {
      if (!user) return false
      const roles = user.role || []
      // Allow admins, hosts, and customers to access the admin panel
      return roles.includes('admin') || roles.includes('host') || roles.includes('customer')
    },
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'guest',
      hasMany: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
        {
          label: 'Host',
          value: 'host',
        },
        {
          label: 'Guest',
          value: 'guest',
        },
      ],
      access: {
        create: ({ req: { user } }) => {
          // During registration (when user is null), only allow guest role
          // Admins can set any role
          if (!user) {
            return false // Prevent role setting during registration
          }
          return user?.role?.includes('admin') || false
        },
        update: ({ req: { user } }) => {
          return user?.role?.includes('admin') || false
        },
      },
    },
  ],
  timestamps: true,
}

export default Users
