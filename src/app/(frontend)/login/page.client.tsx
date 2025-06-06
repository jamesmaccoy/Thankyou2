'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserContext } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'
import { useForm } from 'react-hook-form'
import { useSubscription } from '@/hooks/useSubscription'
import { validateRedirect } from '@/utils/validateRedirect'

type FormValues = {
  email: string
  password: string
}

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}

function LoginForm() {
  const form = useForm<FormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [error, setError] = React.useState<string | null>(null)
  const { handleAuthChange } = useUserContext()
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription()

  const handleLogin = async (values: FormValues) => {
    try {
      const res = await fetch(`/api/users/login`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(values),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error('Invalid email or password')
      }

      handleAuthChange()

      const validatedNext = validateRedirect(next)

      if (validatedNext) {
        router.push(validatedNext)
        return
      }

      // After successful login, check subscription status
      if (!isSubscribed && !isSubscriptionLoading) {
        router.push('/subscribe')
      } else {
        router.push('/bookings')
      }
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="container my-20">
      <div className="border max-w-[450px] mx-auto p-10 rounded-md bg-card">
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md my-3">{error}</div>}
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">Login</h1>
          <p className="text-muted-foreground text-lg">Login as a customer</p>
        </div>
        <form onSubmit={form.handleSubmit(handleLogin)} className="mt-5 space-y-3">
          <Input
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            {...form.register('email')}
          />
          <Input
            type="password"
            placeholder="Password"
            autoComplete="password"
            {...form.register('password')}
          />

          <Button className="w-full" type="submit">
            Login
          </Button>
        </form>
        <div className="mt-5">
          <p className="text-center text-sm tracking-wide font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  )
}
