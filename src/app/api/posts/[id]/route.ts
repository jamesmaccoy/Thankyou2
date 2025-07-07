import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const payload = await getPayload({ config: payloadConfig })

  try {
    const post = await payload.findByID({
      collection: 'posts',
      id,
      depth: 1,
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const payload = await getPayload({ config: payloadConfig })

  try {
    const data = await req.json()
    const updatedPost = await payload.update({
      collection: 'posts',
      id,
      data,
    })

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}