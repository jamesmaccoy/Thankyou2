import React from 'react'
import { getMeUser } from '@/utilities/getMeUser'
import { redirect } from 'next/navigation'
import EmbedPostManager from './page.client'

// Force dynamic rendering for iframe embed
export const dynamic = 'force-dynamic'

export default async function EmbedPostManagerPage() {
  let user
  try {
    const userData = await getMeUser()
    user = userData.user
  } catch (error) {
    // For embed, show a login prompt instead of redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to manage posts</p>
          <a 
            href="/login" 
            target="_parent"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Login
          </a>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to manage posts</p>
          <a 
            href="/login" 
            target="_parent"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Login
          </a>
        </div>
      </div>
    )
  }

  return <EmbedPostManager user={user} />
} 