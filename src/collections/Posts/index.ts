import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { hostOrCustomer } from '../../access/adminOrCustomer'
import { isAdminOrCreatedBy } from '../../access/isAdmin'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '../../fields/slug'
import { getAllPackageTypes, PACKAGE_TYPES } from '@/lib/package-types'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: hostOrCustomer,
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role?.includes('admin')) return true
      // Temporarily simplified - hosts and customers can delete (will refine later)
      if (user.role?.includes('host') || user.role?.includes('customer')) {
        return true
      }
      return false
    },
    read: authenticatedOrPublished,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role?.includes('admin')) return true
      // Temporarily simplified - hosts and customers can update (will refine later)
      if (user.role?.includes('host') || user.role?.includes('customer')) {
        return true
      }
      return false
    },
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    hidden: ({ user }) => {
      if (!user) return true
      const roles = user.role || []
      return !roles.includes('admin') && !roles.includes('host') && !roles.includes('customer')
    },
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'posts',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: 'categories',
            },
          ],
          label: 'Meta',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'baseRate',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Base rate per night in USD',
      },
      defaultValue: 150,
    },
    {
      name: 'packageTypes',
      type: 'array',
      admin: {
        position: 'sidebar',
        description: 'Available packages for this plek. You can select from templates or create custom packages.',
      },
      fields: [
        {
          name: 'templateId',
          type: 'select',
          label: 'Package Template',
          admin: {
            description: 'Select a package template from the centralized system (optional)',
          },
          options: Object.entries(PACKAGE_TYPES).map(([key, template]) => ({
            label: template.name,
            value: key,
          })),
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Package name (will be auto-filled if using a template)',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Package description (will be auto-filled if using a template)',
          },
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          admin: {
            description: 'Price for this package (can override template pricing)',
          },
        },
        {
          name: 'multiplier',
          type: 'number',
          required: true,
          defaultValue: 1,
          admin: {
            description: 'Price multiplier applied to base rate',
          },
        },
        {
          name: 'features',
          type: 'array',
          admin: {
            description: 'Package features (will be auto-filled if using a template)',
          },
          fields: [
            {
              name: 'feature',
              type: 'text',
            },
          ],
        },
        {
          name: 'revenueCatId',
          type: 'text',
          admin: {
            description: 'RevenueCat package identifier (will be auto-filled if using a template)',
          },
        },
        {
          name: 'category',
          type: 'select',
          label: 'Package Category',
          admin: {
            description: 'Package category for organization',
          },
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Luxury', value: 'luxury' },
            { label: 'Hosted', value: 'hosted' },
            { label: 'Specialty', value: 'specialty' },
          ],
          defaultValue: 'standard',
        },
        {
          name: 'minNights',
          type: 'number',
          label: 'Minimum Nights',
          admin: {
            description: 'Minimum number of nights for this package',
          },
        },
        {
          name: 'maxNights',
          type: 'number',
          label: 'Maximum Nights',
          admin: {
            description: 'Maximum number of nights for this package',
          },
        },
        {
          name: 'isHosted',
          type: 'checkbox',
          label: 'Hosted Package',
          admin: {
            description: 'Whether this package includes hosted services',
          },
        },
      ],
    },
    ...slugField(),
  ],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        // Auto-assign current user as author when creating a new post
        if (operation === 'create' && req.user) {
          const currentAuthors = data.authors || []
          // Only add the user if they're not already in the authors list
          if (!currentAuthors.includes(req.user.id)) {
            data.authors = [...currentAuthors, req.user.id]
          }
        }
        
        // Removed auto-population to prevent recursion issues
        // Package template selection can be handled in the frontend
        return data
      },
    ],
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      // Disable autosave to prevent conflicts with manual saves
      autosave: false,
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
