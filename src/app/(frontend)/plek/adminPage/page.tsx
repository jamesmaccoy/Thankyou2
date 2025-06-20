import { getMeUser } from "@/utilities/getMeUser"
import { redirect } from "next/navigation"
import { getPayload } from "payload"
import config from "@payload-config"
import PlekAdminClient from "./page.client"

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

  // Check if user has customer or admin role
  const userRoles = user.role || []
  if (!userRoles.includes('customer') && !userRoles.includes('admin')) {
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

  return (
    <div className="min-h-screen bg-background">
      <PlekAdminClient 
        user={user}
        initialPosts={userPosts.docs}
        categories={categories.docs}
      />
    </div>
  )
} 