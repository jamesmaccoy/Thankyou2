import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import type { Page } from '@/payload-types'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  const url = '/' + slug

  let page: Page | null = null
  let baseRate: number | undefined

  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'pages',
      where: {
        slug: {
          equals: slug,
        },
      },
      draft: draft,
      limit: 1,
    })

    page = result.docs[0]
    if (page) {
      baseRate = page.baseRate
    }
  } catch (error) {
    console.error('Error fetching page:', error)
    page = null
  }

  if (!page) {
    return null
  }

  // Ensure we have all required fields
  const safePage: Page = {
    id: page.id,
    title: page.title || '',
    hero: {
      type: page.hero?.type || 'none',
      richText: page.hero?.richText || {
        root: {
          type: 'paragraph',
          children: [],
          direction: null,
          format: '',
          indent: 0,
          version: 1,
        },
      },
      links: page.hero?.links || [],
      media: page.hero?.media || null,
    },
    layout: page.layout || [],
    meta: {
      title: page.meta?.title || page.title || '',
      description: page.meta?.description || '',
      image: page.meta?.image || null,
    },
    slug: page.slug || slug,
    slugLock: page.slugLock || false,
    updatedAt: page.updatedAt || new Date().toISOString(),
    createdAt: page.createdAt || new Date().toISOString(),
    _status: page._status || 'published',
  }

  const metaTags = generateMeta({
    doc: safePage
  })

  return (
    <>
      <PayloadRedirects url={url} />
      <LivePreviewListener />
      <PageClient
        page={safePage}
        draft={draft}
        url={url}
        baseRate={baseRate}
      />
      {safePage.hero && <RenderHero {...safePage.hero} />}
      <RenderBlocks blocks={[safePage.layout]} />
    </>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  const page = await queryPageBySlug({
    slug,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
