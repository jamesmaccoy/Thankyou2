import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { adminOrCustomer } from '../../access/adminOrCustomer'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: adminOrCustomer,
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role?.includes('admin') || false
    },
    read: async ({ req: { user, payload } }) => {
      if (!user) return false
      
      // Admins can see all users
      if (user.role?.includes('admin')) return true
      
      // Customers can see all users (existing behavior)
      if (user.role?.includes('customer')) return true
      
      // Guests can only see users associated with their bookings
      if (user.role?.includes('guest')) {
        try {
          // Find all bookings where this guest user is included
          const guestBookings = await payload.find({
            collection: 'bookings',
            where: {
              guests: {
                contains: user.id,
              },
            },
            limit: 1000,
            pagination: false,
          })

          if (guestBookings.docs.length === 0) {
            // If guest has no bookings, they can only see themselves
            return { id: { equals: user.id } }
          }

          // Collect all user IDs that this guest should be able to see
          const allowedUserIds = new Set([user.id]) // Always allow seeing themselves
          
          guestBookings.docs.forEach((booking) => {
            // Add the customer who owns the booking
            if (typeof booking.customer === 'string') {
              allowedUserIds.add(booking.customer)
            } else if (booking.customer?.id) {
              allowedUserIds.add(booking.customer.id)
            }
            
            // Add all other guests on the same booking
            if (booking.guests && Array.isArray(booking.guests)) {
              booking.guests.forEach((guest) => {
                if (typeof guest === 'string') {
                  allowedUserIds.add(guest)
                } else if (guest?.id) {
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
        } catch (error) {
          // If there's an error, fall back to only allowing the user to see themselves
          return { id: { equals: user.id } }
        }
      }
      
      // Default fallback - user can only see themselves
      return { id: { equals: user.id } }
    },
    update: ({ req: { user }, id }) => {
      if (!user) return false
      if (user.role?.includes('admin')) return true
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
          label: 'Admin',
          value: 'admin',
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
