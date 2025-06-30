import { FieldAccess } from 'payload'

export const isHostField: FieldAccess = ({ req: { user } }) => {
  return Boolean(user?.role?.includes('host'))
}
