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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: 'Missing post id in route params' },
      { status: 400 }
    )
  }

  const payload = await getPayload({ config: payloadConfig })

  try {
    const raw = await req.json()

    /* --- NORMALISE ---------------------------------------------------- */
    // baseRate → number (or undefined)
    if (raw.baseRate === '' || raw.baseRate === null) delete raw.baseRate
    else raw.baseRate = Number(raw.baseRate)

    // packageTypes → ensure valid shapes
    if (Array.isArray(raw.packageTypes)) {
      raw.packageTypes = raw.packageTypes.map((pkg: any) => {
        pkg.price = pkg.price === '' || pkg.price === null ? 0 : Number(pkg.price)

        if (Array.isArray(pkg.features)) {
          pkg.features = pkg.features.map((f: any) =>
            typeof f === 'string' ? { feature: f } : f
          )
        }
        return pkg
      })
    }

    // content normalisation
    if (raw.content) {
      if (typeof raw.content === 'string') {
        raw.content = {
          root: {
            type: 'root',
            children: [
              { type: 'paragraph', children: [{ type: 'text', text: raw.content }] }
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1
          }
        }
      } else if (Array.isArray(raw.content)) {
        // Array format from older editor → wrap as root
        raw.content = {
          root: {
            type: 'root',
            children: raw.content,
            direction: null,
            format: '',
            indent: 0,
            version: 1
          }
        }
      }
    }

    // Remove empty meta.image to satisfy relationship field validation
    if (raw.meta && typeof raw.meta === 'object' && raw.meta.image === '') {
      delete raw.meta.image
    }
    /* ------------------------------------------------------------------ */

    const updated = await payload.update({
      collection: 'posts',
      id,
      data: raw
    })

    const updatedDoc = (updated as any)?.doc || updated;

    return NextResponse.json(updatedDoc)
  } catch (err: any) {
    console.error('PATCH /api/posts error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}