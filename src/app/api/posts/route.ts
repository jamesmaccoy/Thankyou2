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

    let body: any
    const contentType = req.headers.get('content-type') || ''
    
    try {
      if (contentType.includes('application/json')) {
        // Handle JSON requests
        body = await req.json()
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        // Handle form data requests
        const formData = await req.formData()
        body = {} as any
        
        // Convert FormData to regular object
        for (const [key, value] of formData.entries()) {
          if (key.includes('[') && key.includes(']')) {
            // Handle nested form fields like "meta[title]"
            const match = key.match(/^(\w+)\[(\w+)\]$/)
            if (match && match.length >= 3) {
              const parentKey = match[1]
              const childKey = match[2]
              if (parentKey && childKey) {
                if (!body[parentKey]) body[parentKey] = {}
                body[parentKey][childKey] = value
              }
            } else {
              body[key] = value
            }
          } else {
            body[key] = value
          }
        }
      } else {
        // Try to parse as JSON as fallback
        body = await req.json()
      }
    } catch (jsonError) {
      console.error('Request parsing error:', jsonError)
      console.error('Content-Type:', contentType)
      console.error('Request URL:', req.url)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }

    // Log the request details for debugging admin interface calls
    console.log('POST /api/posts request details:')
    console.log('Content-Type:', contentType)
    console.log('Request body:', JSON.stringify(body, null, 2))
    console.log('User:', { id: user.id, role: user.role })

    // Check if this is a query/search request from admin interface
    if (body.where || body.limit || body.depth || body.sort || body.page) {
      console.log('Detected admin interface query request, redirecting to find operation')
      
      // This is likely a query request from the admin interface
      // Convert it to a find operation instead of create
      const findOptions: any = {
        collection: 'posts',
        where: body.where || {},
        limit: body.limit || 50,
        depth: body.depth || 1,
      }
      
      if (body.sort) findOptions.sort = body.sort
      if (body.page) findOptions.page = body.page
      
      const result = await payload.find(findOptions)
      return NextResponse.json(result)
    }

    // Validate and clean the data
    const cleanData: any = {
      title: String(body.title || '').trim(),
      authors: body.authors || [user.id],
      _status: body._status || body.status || 'draft', // Handle both field names
    }

    // Validate required fields - but only for actual post creation
    if (!cleanData.title) {
      console.log('No title provided, checking if this is an admin interface request')
      
      // If there's no title but other admin-like parameters, treat as query
      if (Object.keys(body).length === 0 || 
          (Object.keys(body).length === 1 && body.depth !== undefined) ||
          body.fallbackLocale !== undefined) {
        console.log('Treating as admin query request')
        
        // Return a basic find operation for admin interface
        const result = await payload.find({
          collection: 'posts',
          limit: 50,
          depth: 1,
        })
        return NextResponse.json(result)
      }
      
      return NextResponse.json(
        { error: 'Title is required for post creation' },
        { status: 400 }
      )
    }

    // Handle content properly - convert simple text to Lexical structure if needed
    if (body.content) {
      if (typeof body.content === 'string') {
        // Convert simple text to Lexical format
        cleanData.content = {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    text: body.content
                  }
                ]
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1
          }
        }
      } else if (body.content.root) {
        // Already in Lexical format
        cleanData.content = body.content
      } else if (Array.isArray(body.content)) {
        // Convert array format to Lexical
        cleanData.content = {
          root: {
            type: "root",
            children: body.content.map((item: any) => ({
              type: item.type || "paragraph",
              children: item.children || [{ type: "text", text: item.text || '' }],
              direction: item.direction || 'ltr',
              format: item.format || '',
              indent: item.indent || 0,
              version: item.version || 1
            })),
            direction: null,
            format: '',
            indent: 0,
            version: 1
          }
        }
      }
    }

    // Handle categories safely
    if (body.categories && Array.isArray(body.categories)) {
      cleanData.categories = body.categories.filter((cat: any) => 
        cat && typeof cat === 'string' && cat.trim() !== ''
      )
    }

    // Handle hero image
    if (body.heroImage && typeof body.heroImage === 'string') {
      cleanData.heroImage = body.heroImage
    }

    // Handle baseRate safely
    if (body.baseRate !== undefined && body.baseRate !== null && body.baseRate !== '') {
      const baseRateNum = Number(body.baseRate)
      if (!isNaN(baseRateNum) && baseRateNum >= 0) {
        cleanData.baseRate = baseRateNum
      }
    }

    // Handle meta fields safely
    if (body.meta && typeof body.meta === 'object') {
      cleanData.meta = {}
      if (body.meta.title && typeof body.meta.title === 'string') {
        cleanData.meta.title = body.meta.title.trim()
      }
      if (body.meta.description && typeof body.meta.description === 'string') {
        cleanData.meta.description = body.meta.description.trim()
      }
      if (body.meta.image && typeof body.meta.image === 'string') {
        cleanData.meta.image = body.meta.image
      }
    }

    // Handle publishedAt
    if (body.publishedAt) {
      try {
        cleanData.publishedAt = new Date(body.publishedAt).toISOString()
      } catch (dateError) {
        console.warn('Invalid publishedAt date:', body.publishedAt)
      }
    } else if (cleanData._status === 'published') {
      cleanData.publishedAt = new Date().toISOString()
    }

    console.log('Creating post with clean data:', JSON.stringify(cleanData, null, 2))

    const post = await payload.create({
      collection: 'posts',
      data: cleanData,
      user,
    })

    return NextResponse.json({ 
      message: 'Post created successfully',
      doc: post 
    })
  } catch (error: any) {
    console.error('Error creating post:', error)
    
    // Provide more specific error messages
    if (error.message?.includes('validation')) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.message },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'A post with this title already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    )
  }
} 