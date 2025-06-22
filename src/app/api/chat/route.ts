import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getMeUser } from '@/utilities/getMeUser'

// Use the GEMINI_API_KEY environment variable defined in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    const { user } = await getMeUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's bookings and estimates
    const payload = await getPayload({ config: configPromise })

    const [bookings, estimates] = await Promise.all([
      payload.find({
        collection: 'bookings',
        where: {
          customer: { equals: user.id },
        },
        depth: 2,
        sort: '-fromDate',
      }),
      payload.find({
        collection: 'estimates',
        where: {
          customer: { equals: user.id },
        },
        depth: 2,
        sort: '-createdAt',
      }),
    ])

    // Format bookings and estimates data for the AI
    const bookingsInfo = bookings.docs.map((booking) => ({
      id: booking.id,
      title: booking.title,
      fromDate: new Date(booking.fromDate).toLocaleDateString(),
      toDate: new Date(booking.toDate).toLocaleDateString(),
      status: booking.paymentStatus,
      post: typeof booking.post === 'string' ? booking.post : booking.post.title,
    }))

    const estimatesInfo = estimates.docs.map((estimate) => ({
      id: estimate.id,
      title: estimate.title,
      total: estimate.total,
      fromDate: new Date(estimate.fromDate).toLocaleDateString(),
      toDate: new Date(estimate.toDate).toLocaleDateString(),
      status: estimate.paymentStatus,
      packageType: estimate.packageType,
      post: typeof estimate.post === 'string' ? estimate.post : estimate.post.title,
    }))

    // Create a context with the user's data
    const context = {
      bookings: bookingsInfo,
      estimates: estimatesInfo,
      user: {
        id: user.id,
        email: user.email,
      },
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Create a chat context with the user's data
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a helpful AI assistant for a booking and estimates system. Here is the user's data:
              
              Bookings:
              ${JSON.stringify(context.bookings, null, 2)}
              
              Estimates:
              ${JSON.stringify(context.estimates, null, 2)}
              
              Help users with their bookings and provide information about estimates based on their actual data, but il never read out the booking or estimate IDs, but remain knowlagable about the package types and features.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'I understand. I will help users with their bookings and provide information about estimates based on their actual data. I can assist with checking booking status, viewing estimates, and answering related questions. I will never read out the booking or estimate IDs, but rather use the title, fromDate, toDate, and status to assume an action like "Update booking" or "Update estimate". I will also know the package types and features the user has selected and purchased, and intuativly compare the different package types and features they could still purchase, further improving their bookings experience.',
            },
          ],
        },
      ],
    })

    // Generate response
    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ error: 'Failed to process your request' }, { status: 500 })
  }
}
