import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = new URL(req.url)
    
    // Build query parameters
    const where: any = {}
    const limit = parseInt(searchParams.get('limit') || '50')
    const depth = parseInt(searchParams.get('depth') || '1')
    
    // Handle status filter
    const status = searchParams.get('where[_status][equals]')
    if (status) {
      where._status = { equals: status }
    }
    
    // Handle other filters if needed
    searchParams.forEach((value, key) => {
      if (key.startsWith('where[') && key !== 'where[_status][equals]') {
        // Parse complex where conditions if needed
        console.log('Additional filter:', key, value)
      }
    })
    
    const posts = await payload.find({
      collection: 'posts',
      where,
      limit,
      depth,
    })

    return NextResponse.json(posts)
  } catch (error: any) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to create posts
    const userRoles = user.role || []
    if (!userRoles.includes('admin') && !userRoles.includes('customer')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await req.json()
    
    // Ensure the user is set as an author if not already specified
    const postData = {
      ...body,
      authors: body.authors || [user.id],
    }

    const post = await payload.create({
      collection: 'posts',
      data: postData,
      user,
    })

    return NextResponse.json({ 
      message: 'Post created successfully',
      doc: post 
    })
  } catch (error: any) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    )
  }
} 