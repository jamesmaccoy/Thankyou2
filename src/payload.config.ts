// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { s3Storage } from '@payloadcms/storage-s3'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import Users from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Booking } from './collections/Bookings'
import { Estimate } from './collections/Estimates'
import { isAdmin } from './access/isAdmin'
//import analyticsRouter from '@/app/api/analytics/route'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      afterDashboard: ['@/components/AnalyticsDashboardData/AnalyticsDashboard'],
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      //beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      //beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  collections: [Booking, Estimate, Pages, Posts, Media, Categories, Users],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    s3Storage({
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: process.env.R2_REGION || '',
        endpoint: process.env.R2_ENDPOINT, // Optional: for S3-compatible storage like Cloudflare R2
        forcePathStyle: true, // Optional: often needed for S3-compatible storage
      },
      collections: {
        media: true,
      },
    }),
    // System collections access control plugin
    (() => (incomingConfig: any): any => {
      const config = { ...incomingConfig }
      config.onInit = async (payload: any) => {
        if (incomingConfig.onInit) await incomingConfig.onInit(payload)
        
        // Configure system collections to only be visible to admin users
        const systemCollections = [
          'payload-jobs',
          'payload-preferences', 
          'payload-locked-documents',
          'payload-migrations'
        ]
        
        // Configure collections that should be hidden from customer users
        const adminHostCollections = [
          'redirects',
          'forms',
          'form-submissions', 
          'search'
        ]
        
        systemCollections.forEach(collectionSlug => {
          if (payload.collections[collectionSlug]) {
            // Show collection but restrict access to admin only
            payload.collections[collectionSlug].config.admin.hidden = ({ user }: { user: any }) => {
              if (!user) return true
              const roles = user.role || []
              return !roles.includes('admin')
            }
            payload.collections[collectionSlug].config.admin.group = 'System'
            
            // Set access controls for the collection
            payload.collections[collectionSlug].config.access = {
              create: isAdmin,
              read: isAdmin,
              update: isAdmin,
              delete: isAdmin,
              admin: isAdmin,
            }
          }
        })
        
        // Hide admin/host-only collections from customer users
        adminHostCollections.forEach(collectionSlug => {
          if (payload.collections[collectionSlug]) {
            payload.collections[collectionSlug].config.admin.hidden = ({ user }: { user: any }) => {
              if (!user) return true
              const roles = user.role || []
              return !roles.includes('admin') && !roles.includes('host')
            }
            payload.collections[collectionSlug].config.admin.group = 'Admin/Host'
          }
        })
        
        // Hide globals from customer users
        const adminHostGlobals = ['header', 'footer']
        adminHostGlobals.forEach(globalSlug => {
          if (payload.globals[globalSlug]) {
            payload.globals[globalSlug].config.admin.hidden = ({ user }: { user: any }) => {
              if (!user) return true
              const roles = user.role || []
              return !roles.includes('admin') && !roles.includes('host')
            }
            payload.globals[globalSlug].config.admin.group = 'Admin/Host'
          }
        })
      }
      return config
    })(),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
  routes: {
    admin: '/host',
  },
})
