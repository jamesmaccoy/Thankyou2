declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URI: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string

      SMTP_HOST: string
      SMTP_PORT: string
      SMTP_USER: string
      SMTP_PASS: string

      EMAIL_FROM: string

      NEXT_PUBLIC_BASE_URL: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
