// src/pages/api/pleks.ts (or /app/api/pleks/route.ts for app router)
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { calculateTotal } from '@/lib/calculateTotal'
import { NextRequest } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fromDate, toDate, guests, title, customer, packageType,
      meta, layout, hero, publishedAt, slug, ...rest
    } = body;

    const payload = await getPayload({ config: configPromise });

    let baseRate = 150;
    let multiplier = 1;

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

    // Check for existing plek for this customer/dates
    const existing = await payload.find({
      collection: 'pages',
      where: {
        customer: { equals: customerId },
        fromDate: { equals: fromDate },
        toDate: { equals: toDate }
      },
      limit: 1,
    });
    if (existing.docs.length) {
      // Update the existing plek with the new total and other fields
      const updated = await payload.update({
        collection: 'pages',
        id: existing.docs[0]!.id,
        data: {
          total,
          guests,
          fromDate,
          toDate,
          customer: customerId, // <-- just the ID
          packageType,
          meta,
          layout,
          hero,
          publishedAt,
          slug,
          ...rest
        },
      });
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new plek
    const plek = await payload.create({
      collection: 'pages',
      data: {
        title: title || `plek`,
        fromDate,
        toDate,
        guests,
        total,
        customer: customerId, // <-- just the ID
        packageType,
        meta,
        layout,
        hero,
        publishedAt,
        slug,
        ...rest
      },
    });

    return new Response(JSON.stringify(plek), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : 'Unknown error') }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 100;

    const pages = await payload.find({
      collection: 'pages',
      limit,
      sort: '-createdAt',
    });

    return new Response(JSON.stringify(pages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : 'Unknown error') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}