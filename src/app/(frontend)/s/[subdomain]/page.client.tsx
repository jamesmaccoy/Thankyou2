'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import AddPlekForm from '@/components/plek/AddPlekForm'

export default function SubdomainPlekClient() {
  // ...other logic
  return (
    <div className="container py-10">
      <AddPlekForm onSuccess={() => {/* Optionally show a message or redirect */}} />
    </div>
  )
}