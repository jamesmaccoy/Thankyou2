import { getMeUser } from "@/utilities/getMeUser"
import { redirect } from "next/navigation"
import { getPayload } from "payload"
import config from "@payload-config"
import PlekAdminClient from "./page.client"
import Link from "next/link"

export default async function PlekAdminPage() {
  let userAuth
  
  try {
    userAuth = await getMeUser()
  } catch (error) {
    redirect('/login?redirect=/plek/adminPage')
  }

  if (!userAuth?.user) {
    redirect('/login?redirect=/plek/adminPage')
  }

  const user = userAuth.user

  // Check if user has customer or host role
  const userRoles = user.role || []
  if (!userRoles.includes('customer') && !userRoles.includes('host')) {
    redirect('/?error=unauthorized')
  }

  const payload = await getPayload({ config })

  // Fetch user's posts
  const userPosts = await payload.find({
    collection: 'posts',
    where: {
      authors: {
        contains: user.id,
      },
    },
    depth: 2,
    limit: 100,
    sort: '-updatedAt',
  })

  // Fetch categories for the form
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'title',
  })

  // Fetch bookings for statistics
  const bookings = await payload.find({
    collection: 'bookings',
    where: {
      or: [
        {
          customer: {
            equals: user.id,
          },
        },
        {
          guests: {
            contains: user.id,
          },
        },
      ],
    },
    depth: 2,
    limit: 1000,
    sort: '-createdAt',
  })

  return (
    <div className="min-h-screen bg-background">
      <PlekAdminClient 
        user={user}
        initialPosts={userPosts.docs}
        categories={categories.docs}
        initialBookings={bookings.docs}
      />
      <Link
        href="/host"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Go to Host Panel
      </Link>
    </div>
  )
} 