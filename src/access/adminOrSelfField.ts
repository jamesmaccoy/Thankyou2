import { FieldAccess } from 'payload'

export const hostOrSelfField =
  (field: string): FieldAccess =>
  ({ req: { user }, doc }) => {
    if (!user) return false

    if (user?.role?.includes('host')) {
      return true
    }

    if (!user.role?.includes('customer')) {
      return false
    }

    return doc?.[field] === user.id
  }
