import { hostOrSelfField } from '@/access/adminOrSelfField'
import { isAdmin, isHost } from '@/access/isAdmin'
import { isHostField } from '@/access/isAdminField'
import { slugField } from '@/fields/slug'
import type { CollectionConfig } from 'payload'
import { hostOrSelfOrGuests } from './access/adminOrSelfOrGuests'

import { generateJwtToken, verifyJwtToken } from '@/utilities/token'
import { unavailableDates } from './endpoints/unavailable-dates'
import { checkAvailability } from './endpoints/check-availability'
import { checkAvailabilityHook } from './hooks/checkAvailability'

export const Booking: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: 'Booking',
    plural: 'Bookings',
  },
  typescript: {
    interface: 'Booking',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['customer', 'post', 'fromDate', 'toDate', 'guests'],
  },
  endpoints: [
    unavailableDates,
    checkAvailability,
    // This endpoint is used to generate a token for the booking
    // and return it to the customer
    {
      path: '/:bookingId/token',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json(
            {
              message: 'Unauthorized',
            },
            { status: 401 },
          )
        }

        const _bookingId =
          req.routeParams && 'bookingId' in req.routeParams && req.routeParams.bookingId

        if (!_bookingId || typeof _bookingId !== 'string') {
          return Response.json(
            {
              message: 'Booking ID not provided',
            },
            { status: 400 },
          )
        }

        try {
          // Use findOneAndUpdate to handle concurrent requests
          const booking = await req.payload.findByID({
            collection: 'bookings',
            id: _bookingId,
          })

          if (!booking) {
            return Response.json(
              {
                message: 'Booking not found',
              },
              { status: 404 },
            )
          }

          // Check if user is authorized
          if (
            typeof booking.customer === 'string'
              ? booking.customer !== req.user.id
              : booking.customer?.id !== req.user.id
          ) {
            return Response.json(
              {
                message: 'Unauthorized',
              },
              { status: 401 },
            )
          }

          // If booking already has a token, return it
          if (booking.token) {
            return Response.json({
              token: booking.token,
            })
          }

          // Generate new token
          const token = generateJwtToken({
            bookingId: booking.id,
            customerId:
              typeof booking.customer === 'string' ? booking.customer : booking.customer?.id,
          })

          // Update booking with new token
          await req.payload.update({
            collection: 'bookings',
            id: _bookingId,
            data: {
              token,
            },
          })

          return Response.json({
            token,
          })
        } catch (error) {
          console.error('Error generating token:', error)
          return Response.json(
            {
              message: 'Failed to generate token',
            },
            { status: 500 },
          )
        }
      },
    },

    // This endpoint is used to refresh the current token.
    // If the token is refreshed, the old token will be invalidated
    {
      path: '/:bookingId/refresh-token',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json(
            {
              message: 'Unauthorized',
            },
            { status: 401 },
          )
        }

        const _bookingId =
          req.routeParams && 'bookingId' in req.routeParams && req.routeParams.bookingId

        // This is not supposed to happen, but just in case
        if (!_bookingId || typeof _bookingId !== 'string') {
          return Response.json(
            {
              message: 'Booking ID not provided',
            },
            { status: 400 },
          )
        }

        const bookings = await req.payload.find({
          collection: 'bookings',
          where: {
            and: [
              {
                id: {
                  equals: _bookingId,
                },
              },
              {
                customer: {
                  equals: req.user.id,
                },
              },
            ],
          },
          limit: 1,
          pagination: false,
        })

        if (bookings.docs.length === 0) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        const booking = bookings.docs[0]

        if (!booking) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        const token = generateJwtToken({
          bookingId: booking.id,
          customerId:
            typeof booking.customer === 'string' ? booking.customer : booking.customer?.id,
        })

        await req.payload.update({
          collection: 'bookings',
          id: _bookingId,
          data: {
            token,
          },
        })
        return Response.json({
          token,
        })
      },
    },

    // This endpoint is used to accept the invite for the booking
    // and add the user to the guests list
    {
      path: '/:bookingId/accept-invite/:token',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json(
            {
              message: 'Unauthorized',
            },
            { status: 401 },
          )
        }

        const _bookingId =
          req.routeParams && 'bookingId' in req.routeParams && req.routeParams.bookingId

        // This is not suppossed to happen, but just in case
        if (!_bookingId || typeof _bookingId !== 'string') {
          return Response.json(
            {
              message: 'Booking ID not provided',
            },
            { status: 400 },
          )
        }

        const _token = req.routeParams && 'token' in req.routeParams && req.routeParams.token

        // This is not suppossed to happen, but just in case
        if (!_token || typeof _token !== 'string') {
          return Response.json(
            {
              message: 'Token not provided',
            },
            { status: 400 },
          )
        }

        const bookings = await req.payload.find({
          collection: 'bookings',
          where: {
            and: [
              {
                id: {
                  equals: _bookingId,
                },
              },
              {
                token: {
                  equals: _token,
                },
              },
            ],
          },
          limit: 1,
          pagination: false,
        })

        if (bookings.docs.length === 0) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        const booking = bookings.docs[0]

        if (!booking) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        if (
          booking.guests?.some((guest) =>
            typeof guest === 'string' ? guest === req.user?.id : guest.id === req.user?.id,
          ) ||
          (typeof booking.customer === 'string'
            ? booking.customer === req.user.id
            : booking.customer?.id === req.user.id)
        ) {
          return Response.json({
            message: 'User already in booking',
          })
        }

        await req.payload.update({
          collection: 'bookings',
          id: _bookingId,
          data: {
            guests: [...(booking.guests || []), req.user.id],
          },
        })

        return Response.json({
          message: 'Booking updated',
        })
      },
    },

    // Read the token, verify and return the payload
    // This endpoint can be used to get booking id and customer id to fetch the details and show them to the user.
    {
      path: '/token/:token',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json(
            {
              message: 'Unauthorized',
            },
            { status: 401 },
          )
        }

        const _token = req.routeParams && 'token' in req.routeParams && req.routeParams.token

        // This is not suppossed to happen, but just in case
        if (!_token || typeof _token !== 'string') {
          return Response.json(
            {
              message: 'Token not provided',
            },
            { status: 400 },
          )
        }

        const payload = verifyJwtToken(_token)

        return Response.json(payload)
      },
    },

    // This will remove a guest from the booking
    {
      path: '/:bookingId/guests/:guestId',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return Response.json(
            {
              message: 'Unauthorized',
            },
            { status: 401 },
          )
        }

        const _bookingId =
          req.routeParams && 'bookingId' in req.routeParams && req.routeParams.bookingId

        // This is not suppossed to happen, but just in case
        if (!_bookingId || typeof _bookingId !== 'string') {
          return Response.json(
            {
              message: 'Booking ID not provided',
            },
            { status: 400 },
          )
        }

        const _guestId = req.routeParams && 'guestId' in req.routeParams && req.routeParams.guestId

        // This is not suppossed to happen, but just in case
        if (!_guestId || typeof _guestId !== 'string') {
          return Response.json(
            {
              message: 'Guest ID not provided',
            },
            { status: 400 },
          )
        }

        const bookings = await req.payload.find({
          collection: 'bookings',
          where: {
            and: [
              {
                id: {
                  equals: _bookingId,
                },
              },
              {
                guests: {
                  contains: _guestId,
                },
              },
              {
                customer: {
                  equals: req.user.id,
                },
              },
            ],
          },
          limit: 1,
          pagination: false,
        })

        if (bookings.docs.length === 0) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        const booking = bookings.docs[0]

        if (!booking || !booking.guests) {
          return Response.json(
            {
              message: 'Booking not found',
            },
            { status: 404 },
          )
        }

        await req.payload.update({
          collection: 'bookings',
          id: _bookingId,
          data: {
            guests: booking.guests.filter((guest) =>
              typeof guest === 'string' ? guest !== _guestId : guest.id !== _guestId,
            ),
          },
        })

        return Response.json({
          message: 'Guest removed from booking',
        })
      },
    },
  ],
  access: {
    // create: async ({ req: { user } }) => {
    //   if (!user) return false
    //   const roles = user.role || []
    //   
    //   // Admins bypass subscription check
    //   if (roles.includes('admin')) return true
    //   
    //   // Hosts and customers need active subscription to create bookings
    //   if (roles.includes('host') || roles.includes('customer')) {
    //     try {
    //       const REVENUECAT_PUBLIC_SDK_KEY = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
    //       
    //       if (!REVENUECAT_PUBLIC_SDK_KEY) {
    //         console.error('RevenueCat API key not found')
    //         return false
    //       }
    //       
    //       const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
    //         headers: {
    //           'Authorization': `Bearer ${REVENUECAT_PUBLIC_SDK_KEY}`,
    //           'Content-Type': 'application/json',
    //         },
    //       })
    //       
    //       if (!response.ok) {
    //         console.error('RevenueCat API error:', response.status)
    //         return false
    //       }
    //       
    //       const subscriberData = await response.json()
    //       return subscriberData.subscriber?.entitlements && 
    //              Object.keys(subscriberData.subscriber.entitlements).length > 0
    //              
    //     } catch (error) {
    //       console.error('Subscription check error for booking creation:', error)
    //       return false
    //     }
    //   }
    //   
    //   return false
    // },
    // read: hostOrSelfOrGuests('customer', 'guests'),
    // update: ({ req: { user } }) => {
    //   if (!user) return false
    //   const roles = user.role || []
    //   
    //   // Admins and hosts can update all bookings
    //   if (roles.includes('admin') || roles.includes('host')) return true
    //   
    //   // Customers can update their own bookings
    //   if (roles.includes('customer')) {
    //     return { customer: { equals: user.id } }
    //   }
    //   
    //   return false
    // },
    // delete: ({ req: { user } }) => {
    //   if (!user) return false
    //   const roles = user.role || []
    //   
    //   // Admins and hosts can delete all bookings
    //   if (roles.includes('admin') || roles.includes('host')) return true
    //   
    //   // Customers can delete their own bookings
    //   if (roles.includes('customer')) {
    //     return { customer: { equals: user.id } }
    //   }
    //   
    //   return false
    // },
  },
  hooks: {
    beforeChange: [checkAvailabilityHook],
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      access: {
        update: isHostField,
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      // filterOptions: {
      //   role: {
      //     equals: 'customer',
      //   },
      // },
      access: {
        update: isHostField,
      },
    },
    {
      name: 'token',
      label: 'Token',
      type: 'text',
      required: false,
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
    {
      name: 'guests',
      type: 'relationship',
      hasMany: true,
      relationTo: 'users',
      access: {
        update: hostOrSelfField('customer'),
      },
      admin: {
        isSortable: true,
      },
    },
    ...slugField('title', {
      checkboxOverrides: {
        access: {
          update: isHostField,
        },
      },
      slugOverrides: {
        access: {
          update: isHostField,
        },
      },
    }),
    {
      name: 'post',
      relationTo: 'posts',
      type: 'relationship',
      required: true,
      access: {
        update: isHostField,
      },
    },
    {
      name: 'paymentStatus',
      label: 'Payment Status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      options: [
        {
          label: 'Paid',
          value: 'paid',
        },
        {
          label: 'Unpaid',
          value: 'unpaid',
        },
      ],
      access: {
        update: isHostField,
      },
    },
    {
      name: 'fromDate',
      type: 'date',
      required: true,
      index: true,
      label: 'Check-in Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      access: {
        update: isHostField,
      },
    },
    {
      name: 'toDate',
      type: 'date',
      required: true,
      label: 'Check-out Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      access: {
        update: isHostField,
      },
    },
  ],
}
