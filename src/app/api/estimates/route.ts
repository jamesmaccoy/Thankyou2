// src/pages/api/estimates.ts (or /app/api/estimates/route.ts for app router)
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { calculateTotal } from '@/lib/calculateTotal'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, fromDate, toDate, guests, title, customer, packageType } = body;
    // You may want to get the user from the session/auth

    const payload = await getPayload({ config: configPromise });

    let postRef = postId;
    let baseRate = 150;
    let multiplier = 1;

    // If postId is not a valid ObjectId, look up the post by slug
    if (!/^[a-f\d]{24}$/i.test(postId)) {
      const post = await payload.find({
        collection: 'posts',
        where: { slug: { equals: postId } },
        limit: 1,
      });
      if (!post.docs.length) {
        return new Response(JSON.stringify({ error: 'Post not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      postRef = post.docs[0]?.id;
      baseRate = typeof post.docs[0]?.baseRate === 'number' ? post.docs[0]?.baseRate : 150;
    } else {
      // If postId is an ObjectId, fetch the post to get baseRate
      const post = await payload.findByID({ collection: 'posts', id: postId });
      if (post && typeof post.baseRate === 'number') {
        baseRate = post.baseRate;
      }
    }

    // Calculate duration
    let duration = 1;
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) duration = diffDays;
    }

    // Determine multiplier based on packageType
    if (packageType === 'wine') {
      multiplier = 1.5;
    } else {
      multiplier = 1;
    }

    const total = calculateTotal(baseRate, duration, multiplier);

    // Ensure customer is just the ID
    const customerId = typeof customer === 'object' && customer !== null ? customer.id : customer;

    // Check for existing estimate for this post/customer/dates
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
          total,
          guests,
          fromDate,
          toDate,
          customer: customerId, // <-- just the ID
          packageType,
        },
      });
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new estimate
    const estimate = await payload.create({
      collection: 'estimates',
      data: {
        title: title || `Estimate for ${postRef}`,
        post: postRef,
        fromDate,
        toDate,
        guests,
        total,
        customer: customerId, // <-- just the ID
        packageType,
      },
    });

    return new Response(JSON.stringify(estimate), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : 'Unknown error') }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}