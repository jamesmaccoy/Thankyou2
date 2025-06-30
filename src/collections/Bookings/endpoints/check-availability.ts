import { Endpoint } from 'payload'

export const checkAvailability: Endpoint = {
  method: 'get',
  path: '/check-availability',
  handler: async (req) => {
    // Allow public access for availability checking, but require authentication for detailed booking info
    const { slug, postId, startDate, endDate } = req.query

    if ((!slug && !postId) || !startDate || !endDate) {
      return Response.json(
        {
          message: 'Post slug/ID and date range (startDate, endDate) are required',
        },
        { status: 400 },
      )
    }

    try {
      let resolvedPostId = postId

      // If slug is provided, find the post by slug
      if (slug && !postId) {
        const posts = await req.payload.find({
          collection: 'posts',
          where: {
            slug: {
              equals: slug,
            },
          },
          limit: 1,
        })

        if (!posts.docs.length) {
          return Response.json({ message: 'Post not found' }, { status: 404 })
        }

        resolvedPostId = posts.docs[0]?.id
      }

      // Parse the requested date range
      // This will handle various date formats including ISO strings, timestamps, etc.
      const requestStart = new Date(startDate as string)
      const requestEnd = new Date(endDate as string)

      if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) {
        return Response.json({ message: 'Invalid date format' }, { status: 400 })
      }

      // Format dates as YYYY-MM-DD for database queries
      const startFormatted = requestStart.toISOString().split('T')[0]
      const endFormatted = requestEnd.toISOString().split('T')[0]

      // Find all bookings for this post that overlap with the requested range
      const bookings = await req.payload.find({
        collection: 'bookings',
        where: {
          and: [
            { post: { equals: resolvedPostId } },
            { fromDate: { less_than_equal: endFormatted } },
            { toDate: { greater_than_equal: startFormatted } },
          ],
        },
        limit: 1,
        select: {
          slug: true,
        },
        depth: 0,
      })

      // If any bookings were found, the dates are not available
      const isAvailable = bookings.docs.length === 0

      // Prepare response with basic availability info
      const response: any = {
        isAvailable,
        requestedRange: {
          startDate: startFormatted,
          endDate: endFormatted,
        },
      }

      // If user is authenticated and has host role, provide additional details
      if (req.user) {
        const roles = req.user.role || []
        if (roles.includes('host') || roles.includes('admin')) {
          response.userRole = roles.includes('admin') ? 'admin' : 'host'
          response.canManageBookings = true
          if (!isAvailable && bookings.docs.length > 0) {
            response.conflictingBookings = bookings.docs.length
          }
        } else if (roles.includes('customer') || roles.includes('guest')) {
          response.userRole = roles.includes('customer') ? 'customer' : 'guest'
          response.canCreateBooking = roles.includes('customer')
        }
      } else {
        // Public access - limited info
        response.authRequired = 'Login required for booking creation'
      }

      return Response.json(response)
    } catch (error) {
      console.error('Error checking availability:', error)
      return Response.json({ message: 'Error checking availability' }, { status: 500 })
    }
  },
}
