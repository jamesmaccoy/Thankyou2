import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { hostOrCustomer } from '../access/adminOrCustomer'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: hostOrCustomer,
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role?.includes('host')) return true
      if (user.role?.includes('customer')) {
        return {
          owner: {
            equals: user.id,
          },
        }
      }
      return false
    },
    read: ({ req: { user } }) => {
      if (!user) return true // Anyone can view media
      if (user.role?.includes('host')) return true
      if (user.role?.includes('customer')) {
        return {
          owner: {
            equals: user.id,
          },
        }
      }
      return true // Guests can view all media
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role?.includes('host')) return true
      if (user.role?.includes('customer')) {
        return {
          owner: {
            equals: user.id,
          },
        }
      }
      return false
    },
  },
  admin: {
    hidden: ({ user }) => {
      if (!user) return true
      const roles = user.role || []
      return !roles.includes('host') && !roles.includes('customer')
    },
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        condition: (data, siblingData, { user }) => {
          return Boolean(user?.role?.includes('host'))
        },
      },
      defaultValue: ({ user }) => user?.id,
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            if (!value && req.user) {
              return req.user.id
            }
            return value
          },
        ],
      },
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
