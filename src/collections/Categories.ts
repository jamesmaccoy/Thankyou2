import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { adminOrCustomer } from '../access/adminOrCustomer'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: adminOrCustomer,
    delete: adminOrCustomer,
    read: anyone,
    update: adminOrCustomer,
  },
  admin: {
    hidden: ({ user }) => {
      if (!user) return true
      const roles = user.role || []
      return !roles.includes('admin') && !roles.includes('customer')
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
