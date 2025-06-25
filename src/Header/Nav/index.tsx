'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useUserContext } from '@/context/UserContext'
import { AdminLink } from '@/components/AdminLink'
import { cn } from '@/lib/utils'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  const { currentUser } = useUserContext()

  // Check if user is a customer or host
  const isCustomerOrHost = currentUser?.role?.includes('customer') || currentUser?.role?.includes('host')

  return (
    <nav className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        if (link.url === '/host') {
          return (
            <AdminLink key={i} className={buttonVariants({ variant: "link" })}>
              {link.label}
            </AdminLink>
          )
        }
        return <CMSLink key={i} {...link} appearance="link" />
      })}
      
      {/* Add Plek Management link for customers and hosts */}
      {isCustomerOrHost && (
        <Link 
          href="/plek/adminPage" 
          className={buttonVariants({ variant: "link" })}
        >
          Manage Pleks
        </Link>
      )}
      
      <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link>
      {!currentUser ? (
        <Link className={buttonVariants({})} href={'/login'}>
          Login
        </Link>
      ) : (
        <Link 
          href="/account" 
          className="font-medium text-sm text-primary hover:underline"
        >
          Hello, {currentUser.name}
        </Link>
      )}
    </nav>
  )
}
