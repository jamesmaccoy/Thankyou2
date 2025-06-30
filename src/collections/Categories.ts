import type { CollectionConfig } from 'payload'

import { hostOrCustomer } from '../access/adminOrCustomer'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: hostOrCustomer,
    delete: hostOrCustomer,
    read: anyone,
    update: hostOrCustomer,
  },
  admin: {
    hidden: ({ user }) => {
      if (!user) return true
      const roles = user.role || []
      return !roles.includes('host') && !roles.includes('customer')
    },
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
  ],
}
