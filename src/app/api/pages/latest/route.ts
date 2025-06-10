// src/app/api/pleks/latest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const PACKAGE_RATES = {
    standard: 1,
    wine: 1.5,
    hiking: 1.2,
    film: 2,
  }
  
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const slug = req.nextUrl.searchParams.get('slug')
  const payload = await getPayload({ config: configPromise })

  const where: any[] = []

  if (slug) {
    // First, resolve the post by slug to get its ID
    const postResult = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    const post = postResult.docs[0]
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    const postId = post.id
    where.push({ post: { equals: postId } })
  }

  if (userId) {
    where.push({ customer: { equals: userId } })
  }

  let pleks;
  if (where.length > 0) {
    pleks = await payload.find({
      collection: 'pages',
      where: { and: where },
      sort: '-createdAt',
      limit: 1,
      depth: 2,
    })
  } else {
    pleks = await payload.find({
      collection: 'pages',
      sort: '-createdAt',
      limit: 1,
      depth: 2,
    })
  }
  const plek = pleks.docs[0] || null

  

  return NextResponse.json(plek)
}