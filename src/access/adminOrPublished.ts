import { Access } from 'payload'

export const adminOrPublished: Access = ({ req: { user } }) => {
  if (user?.role?.includes('host')) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
