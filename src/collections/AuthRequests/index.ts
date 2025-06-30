import { CollectionConfig } from 'payload'
import { InitiateMagicAuth } from './endpoints/initiate-magic-auth'
import { VerifyCode } from './endpoints/verify-code'

export const AuthRequests: CollectionConfig = {
  slug: 'authRequests', // changed from "auth-requests"
  admin: {
    // hidden: true,
  },
  endpoints: [InitiateMagicAuth, VerifyCode],
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
    },
  ],
}
