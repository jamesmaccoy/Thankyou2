'use client'

import { useRouter } from 'next/navigation'
import { Link } from 'next/link'
import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { useUserContext } from '@/context/UserContext'

interface AdminLinkProps {
  children: React.ReactNode
  className?: string
}

export const AdminLink: React.FC<AdminLinkProps> = ({ children, className }) => {
  const router = useRouter()
  const { currentUser } = useUserContext()
  const { isSubscribed } = useSubscription()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    if (!isSubscribed) {
      router.push('/subscribe')
      return
    }

    router.push('/admin')
  }

  return (
    <Link href="/admin" onClick={handleClick} className={className}>
      {children}
    </Link>
  )
} 