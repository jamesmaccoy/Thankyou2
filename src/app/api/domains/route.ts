// src/app/api/domains/route.ts
import { NextRequest } from "next/server";

console.log('Vercel Token:', process.env.VERCEL_TOKEN)

export async function POST(request: NextRequest) {
  const { domain, projectName, teamId } = await request.json();

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectName}/domains?teamId=${teamId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}

export async function DELETE(request: NextRequest) {
  const { domain, projectName, teamId } = await request.json();

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectName}/domains/${domain}?teamId=${teamId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}

// Add verification endpoint as needed