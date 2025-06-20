import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })
    
    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const post = await payload.update({
      collection: 'posts',
      id,
      data: body,
      user,
    })

    return NextResponse.json({ 
      message: 'Post updated successfully',
      doc: post 
    })
  } catch (error: any) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update post' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })
    
    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await payload.delete({
      collection: 'posts',
      id,
      user,
    })

    return NextResponse.json({ 
      message: 'Post deleted successfully' 
    })
  } catch (error: any) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    )
  }
} 