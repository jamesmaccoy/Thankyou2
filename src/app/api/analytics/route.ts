import { google } from 'googleapis'
import { NextResponse } from 'next/server'

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']

export async function GET(request: Request) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set')
    }

    if (!process.env.GA4_PROPERTY_ID) {
      throw new Error('GA4_PROPERTY_ID environment variable is not set')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    // Parse the service account credentials from the environment variable
    let credentials
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      console.log('Service Account Email:', credentials.client_email)
    } catch (_e) {
      throw new Error(`Error parsing GOOGLE_SERVICE_ACCOUNT_JSON: ${_e instanceof Error ? _e.message : String(_e)}`)
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    })
    const authClient = (await auth.getClient()) as any
    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: authClient,
    })

    console.log('GA4 Property ID:', process.env.GA4_PROPERTY_ID)

    if (type === 'posts') {
      // Get post-specific analytics
      const response = await analyticsData.properties.runReport({
        property: `properties/${process.env.GA4_PROPERTY_ID}`,
        requestBody: {
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'averageSessionDuration' }
          ],
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'CONTAINS',
                value: '/posts/',
              },
            },
          },
          orderBys: [
            {
              metric: {
                metricName: 'screenPageViews',
              },
              desc: true,
            },
          ],
          limit: 50,
        },
      })

      // Transform the GA4 response to match the expected format
      const postAnalytics = (response.data.rows || []).map((row: any) => {
        const pagePath = row.dimensionValues?.[0]?.value || ''
        const views = Number(row.metricValues?.[0]?.value || 0)
        const users = Number(row.metricValues?.[1]?.value || 0)
        const sessions = Number(row.metricValues?.[2]?.value || 0)
        const avgSessionDuration = Number(row.metricValues?.[3]?.value || 0)
        
        // Extract slug from path (e.g., '/posts/my-post' -> 'my-post')
        const slug = pagePath.replace('/posts/', '').split('?')[0] // Remove query params
        
        return { 
          slug,
          pagePath,
          views, 
          users, 
          sessions,
          avgSessionDuration: Math.round(avgSessionDuration),
        }
      }).filter((item: any) => item.slug && item.slug !== '') // Filter out invalid slugs

      return NextResponse.json({
        postAnalytics,
        totalPosts: postAnalytics.length,
        totalViews: postAnalytics.reduce((sum: number, post: any) => sum + post.views, 0),
        totalUsers: postAnalytics.reduce((sum: number, post: any) => sum + post.users, 0),
      })
    }

    // Default overview analytics (existing functionality)
    // Get data for the last 30 days
    const response = await analyticsData.properties.runReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        dateRanges: [
          {
            startDate: '30daysAgo',
            endDate: 'today',
          },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: 'date',
            },
            desc: false,
          },
        ],
      },
    })

    // Fetch active users now using the Realtime API
    let activeUsersNow = 0
    try {
      const realtimeResponse = await analyticsData.properties.runRealtimeReport({
        property: `properties/${process.env.GA4_PROPERTY_ID}`,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
        },
      })
      activeUsersNow = Number(realtimeResponse.data.rows?.[0]?.metricValues?.[0]?.value || 0)
    } catch (e) {
      console.error('Error fetching active users now:', e)
    }

    // Transform the GA4 response to match the dashboard's expected format
    const historicalData = (response.data.rows || []).map((row: any) => {
      const date = row.dimensionValues?.[0]?.value || ''
      const users = Number(row.metricValues?.[0]?.value || 0)
      const views = Number(row.metricValues?.[1]?.value || 0)
      return { date, users, views }
    })

    const total30DayUsers = historicalData.reduce((sum, d) => sum + d.users, 0)
    const total30DayViews = historicalData.reduce((sum, d) => sum + d.views, 0)

    return NextResponse.json({
      activeUsersNow,
      total30DayUsers,
      total30DayViews,
      historicalData,
    })
  } catch (error) {
    console.error('Analytics Error Details:', error)
    return NextResponse.json(
      {
        error: 'Analytics error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
