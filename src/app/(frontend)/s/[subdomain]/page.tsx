// src/app/s/[subdomain]/page.tsx
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import InviteUrlDialog from './_components/invite-url-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
//import { EstimateBlock } from '@/blocks/EstimateBlock/Component'

async function getPlekBySubdomain(subdomain: string) {
  // Replace with your actual API or DB call
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pages?where[subdomain][equals]=${subdomain}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.docs?.[0] || null;
}

export default async function TenantPlekPage({ params }: { params: { subdomain: string } }) {
  const plek = await getPlekBySubdomain(params.subdomain);
  if (!plek) return notFound();

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-4">{plek.title}</h1>
      {plek.description && <p className="mb-6">{plek.description}</p>}
      <h2 className="text-2xl font-semibold mb-2">Packages Offered</h2>
      <ul>
        {(plek.packages ?? []).length > 0
          ? plek.packages.map((pkg: string) => <li key={pkg}>{pkg}</li>)
          : <li>No packages offered for this plek.</li>
        }
      </ul>
      {/* Add more public info as needed */}
    </div>
  );
}