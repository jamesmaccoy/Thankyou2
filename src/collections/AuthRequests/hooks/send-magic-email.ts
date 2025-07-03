import { CollectionAfterChangeHook } from 'payload'
import jwt from 'jsonwebtoken'
import { transporter } from '@/lib/transporter'
import MagicAuthEmail from '@/emails/MagicAuth'
import { render } from '@react-email/components'

export const sendMagicEmail: CollectionAfterChangeHook = async ({ req, doc, operation }) => {
  if (operation !== 'create') {
    return doc
  }

  try {
    const magicTokenPayload = {
      email: doc.email,
      authRequestId: doc.id,
    }

    const magicToken = jwt.sign(magicTokenPayload, req.payload.secret, {
      expiresIn: '15m', // Token valid for 15 minutes
    })

    const magicLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/authRequests/verify-magic-token?token=${magicToken}`

    const magicLinkEmailHtml = await render(
      MagicAuthEmail({
        magicLink,
        userName: 'User',
        code: doc.code,
        expiryTime: '15 minutes',
      }),
    )

    req.payload.logger.info(`Attempting to send magic link email to ${doc.email}`)
    req.payload.logger.info(`SMTP Config: host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT}, user=${process.env.SMTP_USER}`)
    req.payload.logger.info(`Email from: ${process.env.EMAIL_FROM}`)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: doc.email,
      subject: 'Your Magic Login Link',
      html: magicLinkEmailHtml,
    })

    req.payload.logger.info(`Magic link email sent successfully to ${doc.email}`)

    return doc
  } catch (error) {
    req.payload.logger.error(`Failed to send magic link email to ${doc.email}:`, error)
    
    // Log more details about the error
    if (error instanceof Error) {
      req.payload.logger.error(`Error name: ${error.name}`)
      req.payload.logger.error(`Error message: ${error.message}`)
      req.payload.logger.error(`Error stack: ${error.stack}`)
    }
    
    // Still return the doc so the auth request is created, but log the email failure
    return doc
  }
}
