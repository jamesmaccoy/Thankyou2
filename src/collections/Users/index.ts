import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access/isAdmin'

const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email'],
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
    create: () => true,
    update: ({ req: { user }, id }) => {
      if (!user) return false
      if (user?.role?.includes('admin')) return true
      return user.id === id
    },
    delete: isAdmin,
    admin: ({ req: { user } }) => {
      return user?.role?.includes('admin') || false
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
