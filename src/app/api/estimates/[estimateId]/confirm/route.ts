import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest, { params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = await params
  const body = await req.json()

  const payload = await getPayload({ config: configPromise })

  const estimate = await payload.findByID({
    collection: 'estimates',
    id: estimateId,
  })

  return NextResponse.json(estimate)
} 