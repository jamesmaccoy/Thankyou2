// src/pages/api/estimates.ts (or /app/api/estimates/route.ts for app router)
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { calculateTotal } from '@/lib/calculateTotal'

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { postId, fromDate, toDate, guests, title, customer, packageType, total } = body;

    // Validate required fields
    if (!postId) {
      return new Response(JSON.stringify({ error: 'postId is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!customer) {
      return new Response(JSON.stringify({ error: 'customer is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!fromDate || !toDate) {
      return new Response(JSON.stringify({ error: 'fromDate and toDate are required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const payload = await getPayload({ config: configPromise });

    let postRef = postId;
    let baseRate = 150;
    let multiplier = 1;

    // If postId is not a valid ObjectId, look up the post by slug
    if (!/^[a-f\d]{24}$/i.test(postId)) {
      try {
        const post = await payload.find({
          collection: 'posts',
          where: { slug: { equals: postId } },
          limit: 1,
        });
        if (!post.docs.length) {
          return new Response(JSON.stringify({ error: 'Post not found' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        postRef = post.docs[0]?.id;
        baseRate = typeof post.docs[0]?.baseRate === 'number' ? post.docs[0]?.baseRate : 150;
      } catch (postError) {
        console.error('Error finding post by slug:', postError);
        return new Response(JSON.stringify({ error: 'Error finding post' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    } else {
      // If postId is an ObjectId, fetch the post to get baseRate
      try {
        const post = await payload.findByID({ collection: 'posts', id: postId });
        if (post && typeof post.baseRate === 'number') {
          baseRate = post.baseRate;
        }
      } catch (postError) {
        console.error('Error finding post by ID:', postError);
        return new Response(JSON.stringify({ error: 'Error finding post' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // Calculate duration
    let duration = 1;
    if (fromDate && toDate) {
      try {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) duration = diffDays;
      } catch (dateError) {
        console.error('Error parsing dates:', dateError);
        return new Response(JSON.stringify({ error: 'Invalid date format' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // Determine multiplier based on packageType
    if (packageType === 'wine') {
      multiplier = 1.5;
    } else if (packageType === 'hiking') {
      multiplier = 1.2;
    } else if (packageType === 'film') {
      multiplier = 2;
    } else {
      multiplier = 1; // standard package
    }

    // Calculate total (use provided total if available, otherwise calculate)
    const calculatedTotal = total !== undefined ? Number(total) : calculateTotal(baseRate, duration, multiplier);
    
    if (isNaN(calculatedTotal)) {
      return new Response(JSON.stringify({ error: 'Invalid total amount' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Ensure customer is just the ID
    const customerId = typeof customer === 'object' && customer !== null ? customer.id : customer;

    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid customer ID' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Check for existing estimate for this post/customer/dates
    try {
      const existing = await payload.find({
        collection: 'estimates',
        where: {
          post: { equals: postRef },
          customer: { equals: customerId },
          fromDate: { equals: fromDate },
          toDate: { equals: toDate }
        },
        limit: 1,
      });
      
      if (existing.docs.length) {
        // Update the existing estimate with the new total and other fields
        const updated = await payload.update({
          collection: 'estimates',
          id: existing.docs[0]!.id,
          data: {
            total: calculatedTotal,
            guests: Array.isArray(guests) ? guests : [],
            fromDate,
            toDate,
            customer: customerId,
            packageType: packageType || 'standard',
          },
        });
        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (existingError) {
      console.error('Error checking existing estimates:', existingError);
      // Continue to create new estimate
    }

    // Create new estimate
    try {
      const estimate = await payload.create({
        collection: 'estimates',
        data: {
          title: title || `Estimate for ${postRef}`,
          post: postRef,
          fromDate,
          toDate,
          guests: Array.isArray(guests) ? guests : [],
          total: calculatedTotal,
          customer: customerId,
          packageType: packageType || 'standard',
        },
      });

      return new Response(JSON.stringify(estimate), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (createError) {
      console.error('Error creating estimate:', createError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create estimate', 
        details: createError instanceof Error ? createError.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (err) {
    console.error('Estimates API error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}