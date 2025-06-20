import AddPlekForm from '@/components/plek/AddPlekForm'

// This is a server component
export default async function PlekPage({ params }: { params: { subdomain?: string } }) {
  // If you want to fetch a plek by subdomain, you can do so here:
  // const plek = params?.subdomain ? await getPlekBySubdomain(params.subdomain) : null;
  // You can pass plek as a prop to a client component if needed

  return (
    <div className="container py-10">
      <AddPlekForm />
    </div>
  )
}

// If you need getPlekBySubdomain, keep it here as a helper:
// async function getPlekBySubdomain(subdomain: string) {
//   const baseUrl =
//     process.env.NEXT_PUBLIC_API_URL ||
//     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
//   const url = `${baseUrl}/api/pages?where[subdomain][equals]=${encodeURIComponent(subdomain)}`;
//   const res = await fetch(url, { cache: "no-store" });
//   if (!res.ok) return null;
//   const data = await res.json();
//   return data.docs?.[0] || null;
// }