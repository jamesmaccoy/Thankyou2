import { NextResponse } from 'next/server'

interface PostAnalytic {
  slug: string
  title: string
  views: number
  users: number
  sessions: number
  averageSessionDuration: string
  publishedAt?: string
}

export async function GET() {
  try {
    // For now, return fallback data with realistic analytics
    // This can be extended later to include real Google Analytics data
    const fallbackData: PostAnalytic[] = [
      {
        slug: 'my-first-blog-post',
        title: 'My First Blog Post',
        views: Math.floor(Math.random() * 500) + 100,
        users: Math.floor(Math.random() * 200) + 50,
        sessions: Math.floor(Math.random() * 300) + 75,
        averageSessionDuration: '2m 30s',
        publishedAt: '2024-01-15'
      },
      {
        slug: 'getting-started-guide',
        title: 'Getting Started Guide',
        views: Math.floor(Math.random() * 800) + 200,
        users: Math.floor(Math.random() * 300) + 100,
        sessions: Math.floor(Math.random() * 400) + 150,
        averageSessionDuration: '3m 45s',
        publishedAt: '2024-01-20'
      },
      {
        slug: 'advanced-tips-tricks',
        title: 'Advanced Tips & Tricks',
        views: Math.floor(Math.random() * 300) + 50,
        users: Math.floor(Math.random() * 150) + 25,
        sessions: Math.floor(Math.random() * 200) + 40,
        averageSessionDuration: '4m 12s',
        publishedAt: '2024-01-25'
      },
      {
        slug: 'community-highlights',
        title: 'Community Highlights',
        views: Math.floor(Math.random() * 600) + 150,
        users: Math.floor(Math.random() * 250) + 75,
        sessions: Math.floor(Math.random() * 350) + 100,
        averageSessionDuration: '2m 15s',
        publishedAt: '2024-02-01'
      },
      {
        slug: 'product-updates',
        title: 'Product Updates',
        views: Math.floor(Math.random() * 400) + 80,
        users: Math.floor(Math.random() * 180) + 40,
        sessions: Math.floor(Math.random() * 250) + 60,
        averageSessionDuration: '1m 45s',
        publishedAt: '2024-02-05'
      }
    ]

    const totalPosts = fallbackData.length
    const totalViews = fallbackData.reduce((sum, post) => sum + post.views, 0)
    const totalUsers = fallbackData.reduce((sum, post) => sum + post.users, 0)

    return NextResponse.json({
      postAnalytics: fallbackData,
      totalPosts,
      totalViews,
      totalUsers,
      averageViewsPerPost: Math.round(totalViews / totalPosts),
      isFallbackData: true
    })

  } catch (error) {
    console.error('Error fetching post analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
} 