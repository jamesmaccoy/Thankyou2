import { getPayload } from 'payload'
import React from 'react'
import configPromise from '@/payload.config'
import { getMeUser } from '@/utilities/getMeUser'
import { notFound, redirect } from 'next/navigation'
import EstimateDetailsClientPage from './page.client'

type Params = Promise<{
  estimateId: string
}>

export default async function EstimateDetails({ params }: { params: Params }) {
  const { estimateId } = await params

  let user
  try {
    const userData = await getMeUser()
    user = userData.user
  } catch (error) {
    console.error('Failed to get user in EstimateDetails:', error)
    // Redirect to login if user authentication fails
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  const data = await fetchEstimateDetails(estimateId, user.id)

  if (!data) {
    notFound()
  }

  return <EstimateDetailsClientPage data={data} user={user} />
}

const fetchEstimateDetails = async (estimateId: string, currentUserId: string) => {
  const payload = await getPayload({ config: configPromise })

  const estimate = await payload.find({
    collection: 'estimates',
    where: {
      and: [
        {
          id: {
            equals: estimateId,
          },
        },
        {
          or: [
            {
              customer: {
                equals: currentUserId,
              },
            },
            {
              guests: {
                contains: currentUserId,
              },
            },
          ],
        },
      ],
    },
    depth: 2,
    pagination: false,
    limit: 1,
  })

  if (estimate.docs.length === 0) {
    return null
  }

  return estimate.docs[0]
} 