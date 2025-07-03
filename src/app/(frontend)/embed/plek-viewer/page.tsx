import React from 'react'
import EmbedPlekViewer from '@/app/(frontend)/embed/plek-viewer/page.client'

// Force dynamic rendering for iframe embed
export const dynamic = 'force-dynamic'

export default async function EmbedPlekViewerPage() {
  let posts
  try {
    // Fetch published posts for public viewing
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/posts?where[_status][equals]=published&depth=2&limit=50`, {
      cache: 'no-store'
    })
    
    if (response.ok) {
      const result = await response.json()
      posts = result.docs || []
    } else {
      posts = []
    }
  } catch (error) {
    console.error('Error fetching posts:', error)
    posts = []
  }

  return <EmbedPlekViewer posts={posts} />
} 