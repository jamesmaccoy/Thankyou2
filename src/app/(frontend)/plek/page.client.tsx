"use client"

import { useState, useEffect } from "react"
import type { User } from "@/payload-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRevenueCat } from "@/providers/RevenueCat"
import { Purchases, type Package, type PurchasesError, ErrorCode, type Product } from "@revenuecat/purchases-js"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import AddPlekForm from '@/components/plek/AddPlekForm'

// Add type for RevenueCat error with code
interface RevenueCatError extends Error {
  code?: ErrorCode;
}

// Add type for RevenueCat product with additional properties
interface RevenueCatProduct extends Product {
  price?: number;
  priceString?: string;
  currencyCode?: string;
}

export default function PlekClient() {
  const { currentUser, isLoading: isUserLoading } = useUserContext()
  const [guests, setGuests] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!form.title || !form.description) {
      setFormError('Title and Description are required.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          layout: [{ blockType: 'Content', content: form.description }],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create page');
      }
      setForm({ title: '', description: '' });
      setFormSuccess(true);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <AddPlekForm onSuccess={() => {/* Optionally show a message or redirect */}} />
    </div>
  );
} 