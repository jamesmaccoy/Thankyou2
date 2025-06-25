import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: () => true,
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role?.includes('host') || false
    },
    read: async ({ req: { user, payload } }) => {
      if (!user) return false
      
      // Hosts can see all users
      if (user.role?.includes('host')) return true
      
      // Customers can see all users (existing behavior)
      if (user.role?.includes('customer')) return true
      
      // Guests can only see users associated with their bookings
      if (user.role?.includes('guest')) {
        // Get bookings where this user is listed as a guest
        const bookings = await payload.find({
          collection: 'bookings',
          where: {
            guests: {
              contains: user.id,
            },
          },
          depth: 0,
        })

        // Extract all customer IDs and guest IDs from bookings
        const allowedUserIds = new Set([user.id]) // Include the user themselves
        
        bookings.docs.forEach((booking) => {
          if (booking.customer) {
            if (typeof booking.customer === 'string') {
              allowedUserIds.add(booking.customer)
            } else if (booking.customer.id) {
              allowedUserIds.add(booking.customer.id)
            }
          }

          if (booking.guests) {
            booking.guests.forEach((guest) => {
              if (typeof guest === 'string') {
                allowedUserIds.add(guest)
              } else if (guest && guest.id) {
                allowedUserIds.add(guest.id)
              }
            })
          }
        })

        return {
          id: {
            in: Array.from(allowedUserIds),
          },
        }
      }

      return false
    },
    update: ({ req: { user }, id }) => {
      if (!user) return false
      if (user.role?.includes('host')) return true
      return user.id === id
    },
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      label: 'Roles',
      type: 'select',
      hasMany: true,
      options: [
        {
          label: 'Host',
          value: 'host',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
        {
          label: 'Guest',
          value: 'guest',
        },
      ],
      required: true,
      defaultValue: ['guest'],
    },
  ],
  timestamps: true,
}
