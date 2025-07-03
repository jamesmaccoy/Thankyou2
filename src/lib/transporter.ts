import nodemailer from 'nodemailer'

// Resend SMTP configuration
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Additional settings for Resend
  tls: {
    // Don't fail on invalid certs (useful for development)
    rejectUnauthorized: false,
  },
  debug: true, // Enable debug mode
  logger: true, // Enable logging
})

// Test the connection when the module loads
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('SMTP Connection Error:', error)
  } else {
    console.log('SMTP Server is ready to take our messages')
  }
})
