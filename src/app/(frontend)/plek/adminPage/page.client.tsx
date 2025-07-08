"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { User, Post, Category, Booking } from "@/payload-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Loader2, Plus, Edit, Trash2, Eye, Calendar, BarChart3, Settings, Upload, X, Package, DollarSign, ExternalLink, Code, Copy, ChevronDown, Check, MoreVertical, Users, Star, Shield, Zap, Crown, Heart, Target, Award, Sparkles, Rocket, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { toast } from 'sonner'
import { PACKAGE_TYPES, getPackageById, getPackageIconComponent, getPackageTemplateForUser, getUserTierFromEntitlements, getAvailablePackagesForUser, type BaseTemplate } from '@/lib/package-types'
import { RoleUpgrade } from '@/components/RoleUpgrade'
import { useSubscription } from '@/hooks/useSubscription'

interface PlekAdminClientProps {
  user: User
  initialPosts: Post[]
  categories: Category[]
  initialBookings: Booking[]
}

interface PackageType {
  name: string
  description: string
  price: number | ''
  multiplier: number
  features: string[]
  revenueCatId: string
}

interface PostFormData {
  title: string
  content: string
  categories: string[]
  heroImage?: string
  publishedAt?: string
  _status: 'draft' | 'published' | 'pending'
  packageTypes: PackageType[]
  baseRate: number | ''
  meta: {
    title: string
    description: string
    image: string
  }
}

interface UploadedFile {
  id: string
  url: string
  filename: string
}

interface PackageFormProps {
  packageTypes: PackageType[]
  onPackageChange: (idx: number, field: keyof PackageType, value: string | number | string[]) => void
  onAddPackageType: () => void
  onRemovePackageType: (idx: number) => void
  onAddPackageTemplate: (templateKey: string) => void
  isEditing?: boolean
}

// Package Mapping Visualization Component
function PackageMappingVisualization({ userEntitlements, packageTypes = [] }: { userEntitlements: string[]; packageTypes?: PackageType[] }) {
  const userTier = getUserTierFromEntitlements(userEntitlements)
  const availablePackages = getAvailablePackagesForUser(userEntitlements)
  const baseTemplates: BaseTemplate[] = ['per_night', 'per_hour', 'three_nights', 'weekly', 'monthly', 'wine_package']

  // Stats based on current packageTypes
  const totalAddons = packageTypes.length
  const freeAddons = packageTypes.filter(pkg => pkg.price === 0).length
  const paidAddons = packageTypes.filter(pkg => pkg.price !== 0 && pkg.price !== '').length
  const revenueCatAddons = packageTypes.filter(pkg => pkg.revenueCatId).length

  const tierColors = {
    guest: 'bg-gray-100 text-gray-800',
    standard: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    luxury: 'bg-amber-100 text-amber-800'
  }

  return (
    <>
      {/* Package Dashboard Stats (within mapping preview) */}
      <Card className="p-4 mb-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base">Package Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalAddons}</div>
              <div className="text-sm text-muted-foreground">Total Add-ons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{freeAddons}</div>
              <div className="text-sm text-muted-foreground">Free Add-ons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{paidAddons}</div>
              <div className="text-sm text-muted-foreground">Paid Add-ons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{revenueCatAddons}</div>
              <div className="text-sm text-muted-foreground">With RevenueCat</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Mapping for Your Tier
          </CardTitle>
          <CardDescription>
            Based on your entitlements: {userEntitlements.length > 0 ? userEntitlements.join(', ') : 'None'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Your Tier:</span>
              <Badge className={tierColors[userTier]}>{userTier.toUpperCase()}</Badge>
            </div>
            
            <div className="grid gap-3">
              {baseTemplates.map(baseTemplate => {
                const selectedPackage = getPackageTemplateForUser(baseTemplate, userEntitlements)
                const packageInfo = getPackageById(selectedPackage)
                
                return (
                  <div key={baseTemplate} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="font-medium capitalize">{baseTemplate.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">→</span>
                      <Badge variant="outline">{packageInfo?.name || selectedPackage}</Badge>
                      {packageInfo?.revenueCatId && (
                        <span className="text-xs text-gray-500">({packageInfo.revenueCatId})</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> When you add a template, the system automatically selects the best package variant for your subscription tier. 
                {userTier === 'guest' && ' Upgrade your subscription to access enhanced packages!'}
                {userTier === 'standard' && ' You have access to standard packages.'}
                {userTier === 'pro' && ' You have access to enhanced customer packages!'}
                {userTier === 'luxury' && ' You have access to all luxury packages!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function PlekAdminClient({ user, initialPosts, categories, initialBookings }: PlekAdminClientProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [totalVisitors, setTotalVisitors] = useState<number>(0)
  
  // Get user subscription status for package mapping
  const { entitlements, isLoading: isLoadingSubscription } = useSubscription()
  
  // Calculate booking statistics
  const bookingStats = useMemo(() => {
    const totalBookings = initialBookings.length
    const packageTypeStats: Record<string, number> = {}
    const categoryStats: Record<string, number> = {}
    
    initialBookings.forEach(booking => {
      // Count package types
      if (booking.packageType) {
        packageTypeStats[booking.packageType] = (packageTypeStats[booking.packageType] || 0) + 1
      }
      
      // Count package categories based on package details
      if (booking.packageDetails?.category) {
        categoryStats[booking.packageDetails.category] = (categoryStats[booking.packageDetails.category] || 0) + 1
      } else if (booking.packageType) {
        // Fallback: categorize based on package type
        const packageInfo = getPackageById(booking.packageType)
        if (packageInfo?.category) {
          categoryStats[packageInfo.category] = (categoryStats[packageInfo.category] || 0) + 1
        }
      }
    })
    
    return {
      totalBookings,
      packageTypeStats,
      categoryStats,
      mostPopularPackage: Object.entries(packageTypeStats).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      hostedBookings: Object.entries(categoryStats).filter(([category]) => category === 'hosted').reduce((sum, [,count]) => sum + count, 0)
    }
  }, [initialBookings])

  // Initialize package templates inside component to avoid React Context issues
  const packageTemplates = useMemo(() => {
    const allPackageTypes = PACKAGE_TYPES
    if (!allPackageTypes) return {}
    
    return Object.entries(allPackageTypes).reduce((acc: Record<string, any>, [key, pkg]) => {
      acc[key] = {
        name: pkg.name,
        description: pkg.description,
        multiplier: pkg.multiplier,
        features: pkg.features,
        revenueCatId: pkg.revenueCatId,
      }
      return acc
    }, {})
  }, [])

  const createPackageFromTemplate = useCallback((templateKey: string): PackageType => {
    const packageTemplate = getPackageById(templateKey)
    if (!packageTemplate) {
      throw new Error(`Package template not found: ${templateKey}`)
    }
    
    return {
      name: packageTemplate.name,
      description: packageTemplate.description,
      price: '',
      multiplier: packageTemplate.multiplier,
      features: packageTemplate.features,
      revenueCatId: packageTemplate.revenueCatId,
    }
  }, [])

  // Form state
  const [formData, setFormData] = useState<PostFormData>(() => ({
    title: '',
    content: '',
    categories: [],
    _status: 'draft',
    packageTypes: [],
    baseRate: '',
    meta: {
      title: '',
      description: '',
      image: ''
    }
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [packageMode, setPackageMode] = useState<'preview' | 'edit'>('preview')

  // Form states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingPost, setDeletingPost] = useState<Post | null>(null)
  const [isViewerDialogOpen, setIsViewerDialogOpen] = useState(false)
  const [copiedScript, setCopiedScript] = useState<string | null>(null)

  // Image upload
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)

  // Debounce timer ref to prevent excessive re-renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-generate SEO meta fields from form data
  const autoInferSEOMeta = useCallback((formData: PostFormData) => {
    // Extract text content properly from both string and Lexical content structure
    const extractTextContent = (content: any): string => {
      console.log('extractTextContent called with:', {
        content,
        type: typeof content,
        isArray: Array.isArray(content),
        hasRoot: content && typeof content === 'object' && !!content.root
      })
      
      if (!content) {
        console.log('extractTextContent: No content provided')
        return ''
      }
      
      // Handle string content (from textarea)
      if (typeof content === 'string') {
        console.log('extractTextContent: Processing string content')
        const cleanText = content
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        console.log('extractTextContent: String result before truncation:', cleanText)
        return cleanText
      }
      
      // Handle Lexical content structure (fallback for complex content)
      if (typeof content === 'object' && content.root) {
        console.log('extractTextContent: Processing Lexical content structure')
        const extractFromNode = (node: any): string => {
          if (!node) return ''
          
          // If it's a text node, return the text
          if (node.type === 'text' && node.text) {
            return node.text
          }
          
          // If it has children, recursively extract text from them
          if (Array.isArray(node.children)) {
            return node.children
              .map(extractFromNode)
              .filter((text: string) => text.trim()) // Remove empty strings
              .join(' ') // Add space between elements to prevent concatenation
          }
          
          return ''
        }
        
        const text = extractFromNode(content.root)
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        console.log('extractTextContent: Lexical result before truncation:', text)
        return text
      }
      
      // Handle array format (legacy Lexical format)
      if (Array.isArray(content)) {
        console.log('extractTextContent: Processing array format')
        const extractFromArray = (nodes: any[]): string => {
          return nodes
            .map(node => {
              if (node.text) return node.text
              if (node.children && Array.isArray(node.children)) {
                return extractFromArray(node.children)
              }
              return ''
            })
            .filter((text: string) => text.trim()) // Remove empty strings
            .join(' ') // Add space between elements to prevent concatenation
        }
        
        const text = extractFromArray(content)
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          
        console.log('extractTextContent: Array result before truncation:', text)
        return text
      }
      
      console.log('extractTextContent: No matching content type, returning empty string')
      return ''
    }
    
    // Extract the full text first, then truncate for description
    const fullText = extractTextContent(formData.content)
    const truncatedDescription = fullText.length > 155 
      ? `${fullText.slice(0, 155)}...` 
      : fullText
    
    const inferredMeta = {
      title: formData.title ? `${formData.title} | Stay at our self built plek` : '',
      description: truncatedDescription,
      image: uploadedImages.length > 0 && uploadedImages[0] ? uploadedImages[0].id : formData.meta.image
    }
    
    console.log('Auto-inferred SEO meta:', {
      title: inferredMeta.title,
      description: inferredMeta.description,
      originalContent: formData.content,
      contentType: typeof formData.content,
      contentStructure: formData.content && typeof formData.content === 'object' ? 'Lexical JSON' : 'String',
      fullTextExtracted: fullText,
      fullTextLength: fullText.length,
      truncatedDescription: truncatedDescription,
      truncatedLength: truncatedDescription.length
    })
    
    return inferredMeta
  }, [uploadedImages])

  // Auto-update SEO meta when title, content, or images change
  const updateSEOMetaAuto = useCallback((updates: Partial<PostFormData>) => {
    const updatedFormData = { ...formData, ...updates }
    const inferredMeta = autoInferSEOMeta(updatedFormData)
    
    // Only auto-update if SEO fields are empty (don't override manual changes)
    const shouldUpdateTitle = !formData.meta?.title && inferredMeta.title
    const shouldUpdateDescription = !formData.meta?.description && inferredMeta.description
    const shouldUpdateImage = !formData.meta?.image && inferredMeta.image

    if (shouldUpdateTitle || shouldUpdateDescription || shouldUpdateImage) {
      const metaUpdates = {
        ...updatedFormData.meta,
        ...(shouldUpdateTitle && { title: inferredMeta.title }),
        ...(shouldUpdateDescription && { description: inferredMeta.description }),
        ...(shouldUpdateImage && { image: inferredMeta.image })
      }
      
      console.log('Auto-updating SEO meta:', {
        shouldUpdateTitle,
        shouldUpdateDescription,
        shouldUpdateImage,
        metaUpdates
      })
      
      return { ...updates, meta: metaUpdates }
    }
    
    return updates
  }, [formData, autoInferSEOMeta])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const resetForm = useCallback(() => {
    const defaultPackage = createPackageFromTemplate('per_night')
    // Use empty string as default - let the system use baseRate from post
    defaultPackage.price = ''
    
    setFormData({
      title: '',
      content: '',
      categories: [],
      _status: 'draft',
      packageTypes: [defaultPackage],
      baseRate: '',
      meta: {
        title: '',
        description: '',
        image: ''
      }
    })
    setUploadedImages([])
  }, [createPackageFromTemplate])

  // Debounced form update function to improve performance
  const updateFormData = useCallback((updates: Partial<PostFormData>) => {
    // Simplified: Direct update without debouncing to avoid React Context issues
    const finalUpdates = updateSEOMetaAuto(updates)
    setFormData(prev => ({ ...prev, ...finalUpdates }))
  }, [updateSEOMetaAuto])

  // Immediate form update for critical fields
  const updateFormDataImmediate = useCallback((updates: Partial<PostFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handlePackageChange = useCallback((idx: number, field: keyof PackageType, value: string | number | string[]) => {
    console.log('handlePackageChange called:', { idx, field, value })
    const newPackageTypes = [...formData.packageTypes]
    newPackageTypes[idx] = { 
      ...newPackageTypes[idx], 
      [field]: value 
    } as PackageType
    console.log('New packageTypes after change:', newPackageTypes)
    updateFormDataImmediate({ packageTypes: newPackageTypes })
  }, [formData.packageTypes, updateFormDataImmediate])

  const addPackageType = useCallback(() => {
    console.log('addPackageType called, current packages:', formData.packageTypes)
    const newPackage = createPackageFromTemplate('per_night')
    // Use empty string as default - let the system use baseRate from post
    newPackage.price = ''
    console.log('Adding new package:', newPackage)
    const newPackageTypes = [...formData.packageTypes, newPackage]
    console.log('New packageTypes array:', newPackageTypes)
    updateFormDataImmediate({ 
      packageTypes: newPackageTypes
    })
  }, [formData.packageTypes, updateFormDataImmediate])

  const removePackageType = useCallback((idx: number) => {
    console.log('removePackageType called:', { idx, currentLength: formData.packageTypes.length })
    if (formData.packageTypes.length === 1) return // Keep at least one package
    const newPackageTypes = formData.packageTypes.filter((_, i) => i !== idx)
    console.log('New packageTypes after removal:', newPackageTypes)
    updateFormDataImmediate({ packageTypes: newPackageTypes })
  }, [formData.packageTypes, updateFormDataImmediate])

  const addPackageTemplate = useCallback((templateKey: string) => {
    console.log('addPackageTemplate called:', { templateKey, currentPackages: formData.packageTypes })
    
    // Determine the appropriate package based on user entitlements
    const appropriatePackageKey = getPackageTemplateForUser(templateKey as BaseTemplate, entitlements)
    console.log('Package mapping:', { 
      baseTemplate: templateKey, 
      userEntitlements: entitlements, 
      selectedPackage: appropriatePackageKey 
    })
    
    if (appropriatePackageKey in packageTemplates) {
      const newPackage = createPackageFromTemplate(appropriatePackageKey)
      // Use empty string as default - let the system use baseRate from post
      newPackage.price = ''
      console.log('Adding subscription-appropriate package:', newPackage)
      const newPackageTypes = [...formData.packageTypes, newPackage]
      console.log('New packageTypes with template:', newPackageTypes)
      updateFormDataImmediate({ 
        packageTypes: newPackageTypes
      })
      
      // Show success message indicating which package was added
      const packageTemplate = getPackageById(appropriatePackageKey)
      if (packageTemplate) {
        toast.success(`Added ${packageTemplate.name} package template`)
      }
    } else {
      console.error('Package template not found:', appropriatePackageKey)
      toast.error('Package template not found. Please try again.')
    }
  }, [formData.packageTypes, updateFormDataImmediate, entitlements, packageTemplates, createPackageFromTemplate])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include authentication cookies
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const result = await response.json()
        return {
          id: result.doc.id,
          url: result.doc.url,
          filename: result.doc.filename,
        }
      })

      const results = await Promise.all(uploadPromises)
      setUploadedImages(prev => [...prev, ...results])
      setSuccess('Images uploaded successfully!')
    } catch (err) {
      setError('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handleCreatePost = async () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      // Debug: Log the complete formData state before processing
      console.log('=== FORM SUBMISSION DEBUG ===')
      console.log('Complete formData state:', JSON.stringify(formData, null, 2))
      console.log('formData.packageTypes length:', formData.packageTypes.length)
      console.log('formData.packageTypes:', formData.packageTypes)
      
      // Debug: Log the packageTypes before processing
      console.log('Raw formData.packageTypes:', formData.packageTypes)
      
      // Filter and process packageTypes
      const rawPackageTypes = formData.packageTypes.filter(pkg => 
        pkg.name && pkg.name.trim() !== ''
      )
      
      const processedPackageTypes = rawPackageTypes.map(pkg => ({
        name: pkg.name,
        description: pkg.description,
        price: pkg.price === '' ? 0 : Number(pkg.price),
        multiplier: pkg.multiplier,
        features: pkg.features.filter(f => f && f.trim()),
        revenueCatId: pkg.revenueCatId,
      }))

      console.log('Package Types Processing:', {
        originalFormDataPackageTypes: formData.packageTypes,
        filteredRawPackageTypes: rawPackageTypes,
        processedPackageTypes: processedPackageTypes,
        packageTypesLength: processedPackageTypes.length
      })

      // Get auto-inferred meta to use for fallbacks
      const inferredMeta = autoInferSEOMeta(formData)
      
      console.log('=== META DEBUG ===')
      console.log('Current formData.meta:', formData.meta)
      console.log('Inferred meta:', inferredMeta)
      console.log('formData.title:', formData.title)
      console.log('formData.content:', formData.content)
      console.log('typeof formData.content:', typeof formData.content)

      // Create both post and estimate
      const postData: any = {
        title: formData.title,
        authors: [user.id],
        categories: formData.categories,
        heroImage: uploadedImages.length > 0 ? uploadedImages[0]?.id : undefined,
        publishedAt: formData._status === 'published' ? new Date().toISOString() : undefined,
        _status: formData._status,
        ...(formData.baseRate !== '' && { baseRate: Number(formData.baseRate) }),
        // Add packageTypes to the post data
        packageTypes: processedPackageTypes,
        meta: {
          title: inferredMeta.title,
          description: inferredMeta.description,
          image: inferredMeta.image
        },
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    text: formData.content || ''
                  }
                ]
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1
          }
        }
      }

      // Debug: Log the complete postData being sent
      console.log('Complete postData being sent:', JSON.stringify(postData, null, 2))

      // Comprehensive validation of all form data
      console.log('Full form data:', formData)
      
      // Clean and validate all string fields
      const cleanTitle = (formData.title || '').trim()
      const cleanContent = (formData.content || '').trim()
      const cleanMetaTitle = (formData.meta.title || '').trim()
      const cleanMetaDescription = (formData.meta.description || '').trim()
      const cleanMetaImage = (formData.meta.image || '').trim()
      
      // Validate all fields for potential JSON issues
      const validateField = (value: any, fieldName: string) => {
        if (typeof value === 'string' && (value === '-' || value.match(/^-+$/))) {
          throw new Error(`Invalid value "${value}" in field ${fieldName}`)
        }
      }
      
      validateField(cleanTitle, 'title')
      validateField(cleanContent, 'content')
      validateField(cleanMetaTitle, 'meta.title')
      validateField(cleanMetaDescription, 'meta.description')
      validateField(cleanMetaImage, 'meta.image')
      
      // Validate data before sending
      if (!cleanTitle) {
        throw new Error('Title cannot be empty')
      }

      if (formData.categories.some(catId => !catId || typeof catId !== 'string')) {
        throw new Error('Invalid category IDs detected')
      }

      // Validate JSON structure before sending
      try {
        JSON.stringify(postData)
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError)
        throw new Error('Invalid data format - please check your input values')
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create post')
      }

      const result = await response.json()

      // Remove automatic estimate creation - estimates should be user-initiated
      // Previously this would auto-create estimates for posts with package types
      
      setPosts(prev => [result.doc, ...prev])
      setSuccess('Plek created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to create plek')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPost = async () => {
    if (!editingPost?.id || !formData.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      // Comprehensive validation of all form data
      console.log('Full form data:', formData)
      
      // Clean and validate all string fields
      const cleanTitle = (formData.title || '').trim()
      const cleanContent = (formData.content || '').trim()
      const cleanMetaTitle = (formData.meta.title || '').trim()
      const cleanMetaDescription = (formData.meta.description || '').trim()
      const cleanMetaImage = (formData.meta.image || '').trim()
      
      // Validate all fields for potential JSON issues
      const validateField = (value: any, fieldName: string) => {
        if (typeof value === 'string' && (value === '-' || value.match(/^-+$/))) {
          throw new Error(`Invalid value "${value}" in field ${fieldName}`)
        }
      }
      
      validateField(cleanTitle, 'title')
      validateField(cleanContent, 'content')
      validateField(cleanMetaTitle, 'meta.title')
      validateField(cleanMetaDescription, 'meta.description')
      validateField(cleanMetaImage, 'meta.image')
      
      // Validate data before sending
      if (!cleanTitle) {
        throw new Error('Title cannot be empty')
      }

      if (formData.categories.some(catId => !catId || typeof catId !== 'string')) {
        throw new Error('Invalid category IDs detected')
      }

      // Safely extract hero image ID
      const getImageId = (image: any): string | undefined => {
        if (!image) return undefined
        if (typeof image === 'string') return image
        if (typeof image === 'object' && image.id) return image.id
        return undefined
      }

      // Safely handle published date
      const getPublishedAt = (): string | undefined => {
        if (formData._status === 'published' && !editingPost.publishedAt) {
          return new Date().toISOString()
        }
        if (editingPost.publishedAt) {
          // Ensure it's a valid date string
          const date = new Date(editingPost.publishedAt)
          return isNaN(date.getTime()) ? undefined : date.toISOString()
        }
        return undefined
      }

      const heroImageId = uploadedImages.length > 0 && uploadedImages[0] 
        ? uploadedImages[0].id 
        : getImageId(editingPost.heroImage)

      const metaImageId = formData.meta.image || 
        (uploadedImages.length > 0 && uploadedImages[0] ? uploadedImages[0].id : getImageId(editingPost.heroImage))

      // Safely handle baseRate to prevent JSON parsing errors
      const getValidBaseRate = (): number | undefined => {
        if (formData.baseRate === '' || formData.baseRate === null || formData.baseRate === undefined) {
          return undefined
        }
        const numValue = Number(formData.baseRate)
        return !isNaN(numValue) && numValue >= 0 ? numValue : undefined
      }

      // Debug hero image handling
      console.log('Hero Image Debug:', {
        uploadedImages,
        uploadedImagesLength: uploadedImages.length,
        firstUploadedImage: uploadedImages[0],
        editingPostHeroImage: editingPost.heroImage,
        computedHeroImageId: heroImageId,
        formDataMetaImage: formData.meta.image,
        computedMetaImageId: metaImageId
      })

      // Add packageTypes to the post data
      const rawPackageTypes = formData.packageTypes.filter(pkg => 
        pkg.name && pkg.name.trim() !== ''
      )
      
      const processedPackageTypes = rawPackageTypes.map(pkg => ({
        name: pkg.name,
        description: pkg.description,
        price: pkg.price === '' ? 0 : Number(pkg.price),
        multiplier: pkg.multiplier,
        features: pkg.features.filter(f => f && f.trim()),
        revenueCatId: pkg.revenueCatId,
      }))

      const postData: any = {
        title: cleanTitle,
        content: [
          {
            children: [
              {
                text: cleanContent
              }
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
          }
        ],
        meta: {
          title: cleanMetaTitle,
          description: cleanMetaDescription,
          image: metaImageId || '' // Use the computed meta image ID
        },
        categories: formData.categories.filter(cat => cat && typeof cat === 'string'),
        _status: formData._status,
        packageTypes: processedPackageTypes
      }

      // Only add baseRate if it's a valid number
      const validBaseRate = getValidBaseRate()
      if (validBaseRate !== undefined) {
        postData.baseRate = validBaseRate
      }

      // Add hero image - ensure it's always included if we have one
      if (heroImageId) {
        postData.heroImage = heroImageId
        console.log('Adding hero image to post data:', heroImageId)
      } else {
        console.log('No hero image to add to post data')
      }

      const publishedAt = getPublishedAt()
      if (publishedAt) {
        postData.publishedAt = publishedAt
      }

      // Validate JSON structure before sending
      try {
        JSON.stringify(postData)
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError)
        throw new Error('Invalid data format - please check your input values')
      }

      // Log the data being sent for debugging
      console.log('Sending PATCH data:', JSON.stringify(postData, null, 2))
      
      // Debug: Log the raw JSON string that will be sent
      const jsonString = JSON.stringify(postData)
      console.log('Raw JSON string:', jsonString)
      console.log('JSON string length:', jsonString.length)
      console.log('First 50 characters:', jsonString.substring(0, 50))
      
      // Check for potential problematic values
      console.log('Form data baseRate:', formData.baseRate, typeof formData.baseRate)
      console.log('Computed baseRate:', getValidBaseRate())

      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server response error:', errorData)
        throw new Error(errorData.error || errorData.message || `Server returned ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Payload 3.39 returns the updated doc directly; older versions wrap it in { doc }
      const updatedDoc = result?.doc || result

      if (!updatedDoc || typeof updatedDoc !== 'object') {
        console.error('Invalid API response structure:', result)
        throw new Error('Invalid server response - missing or malformed post data')
      }
      
      // Enhanced debugging for API response
      console.log('Full API response:', result)
      console.log('Result.doc exists:', !!result.doc)
      console.log('Result.doc type:', typeof result.doc)
      console.log('Result.doc.heroImage:', result.doc?.heroImage)
      console.log('Result.doc.meta:', result.doc?.meta)
      
      // Validate and clean the response
      // (Redundant check removed - already validated above)
      // if (!result.doc || typeof result.doc !== 'object') {
      //   console.error('Invalid API response structure:', result)
      //   throw new Error('Invalid server response - missing or malformed post data')
      // }
      
      // Ensure heroImage field is properly structured
      if (updatedDoc.heroImage && typeof updatedDoc.heroImage === 'object') {
        console.log('Hero image object detected:', updatedDoc.heroImage)
        // Make sure it has proper image structure
        if (!updatedDoc.heroImage.id || !updatedDoc.heroImage.url) {
          console.warn('Hero image object missing required fields:', updatedDoc.heroImage)
          // Try to use the ID we sent if the response is corrupted
          if (heroImageId) {
            updatedDoc.heroImage = heroImageId
            console.log('Fallback: Using sent hero image ID:', heroImageId)
          }
        }
      } else if (updatedDoc.heroImage && typeof updatedDoc.heroImage === 'string') {
        console.log('Hero image string detected:', updatedDoc.heroImage)
        // Check if it's a weird webpack response
        if (updatedDoc.heroImage.includes('webpack') || updatedDoc.heroImage.includes('"c":')) {
          console.error('Webpack corruption detected in hero image field:', updatedDoc.heroImage)
          // Use the fallback image ID we calculated
          if (heroImageId) {
            updatedDoc.heroImage = heroImageId
            console.log('Fallback: Replacing corrupted hero image with:', heroImageId)
          } else {
            updatedDoc.heroImage = null
            console.log('Fallback: Clearing corrupted hero image field')
          }
        }
      }
      
      // Ensure meta.image field is properly structured
      if (updatedDoc.meta?.image && typeof updatedDoc.meta.image === 'object') {
        console.log('Meta image object detected:', updatedDoc.meta.image)
        if (!updatedDoc.meta.image.id || !updatedDoc.meta.image.url) {
          console.warn('Meta image object missing required fields:', updatedDoc.meta.image)
          if (metaImageId) {
            updatedDoc.meta.image = metaImageId
            console.log('Fallback: Using sent meta image ID:', metaImageId)
          }
        }
      } else if (updatedDoc.meta?.image && typeof updatedDoc.meta.image === 'string') {
        console.log('Meta image string detected:', updatedDoc.meta.image)
        if (updatedDoc.meta.image.includes('webpack') || updatedDoc.meta.image.includes('"c":')) {
          console.error('Webpack corruption detected in meta image field:', updatedDoc.meta.image)
          if (metaImageId) {
            updatedDoc.meta.image = metaImageId
            console.log('Fallback: Replacing corrupted meta image with:', metaImageId)
          } else {
            updatedDoc.meta.image = null
            console.log('Fallback: Clearing corrupted meta image field')
          }
        }
      }
      
      console.log('Final cleaned post data:', {
        id: updatedDoc.id,
        title: updatedDoc.title,
        heroImage: updatedDoc.heroImage,
        meta: updatedDoc.meta
      })
      
      setPosts(prev => prev.map(post => post.id === editingPost.id ? updatedDoc : post))
      setSuccess('Plek updated successfully!')
      setIsEditDialogOpen(false)
      setEditingPost(null)
      resetForm()
    } catch (err: any) {
      console.error('Edit post error:', err)
      setError(err.message || 'Failed to update plek')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async () => {
    if (!deletingPost?.id) return

    setLoading(true)
    clearMessages()

    try {
      const response = await fetch(`/api/posts/${deletingPost.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      setPosts(prev => prev.filter(post => post.id !== deletingPost.id))
      setSuccess('Plek deleted successfully!')
      setIsDeleteDialogOpen(false)
      setDeletingPost(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete plek')
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (post: Post) => {
    setEditingPost(post)
    
    // Safely extract base rate
    const getBaseRate = (): number | '' => {
      if (typeof post.baseRate === 'number' && !isNaN(post.baseRate)) {
        return post.baseRate
      }
      return ''
    }

    // Safely extract hero image ID and set up uploaded images for editing
    const getHeroImageId = (): string => {
      if (post.heroImage) {
        if (typeof post.heroImage === 'string') {
          return post.heroImage
        }
        if (typeof post.heroImage === 'object' && post.heroImage.id) {
          return post.heroImage.id
        }
      }
      return ''
    }

    // Set up existing hero image for display in the form
    const setupExistingHeroImage = () => {
      if (post.heroImage && typeof post.heroImage === 'object' && post.heroImage.id) {
        const existingImage = {
          id: post.heroImage.id,
          url: post.heroImage.url || '',
          filename: post.heroImage.filename || 'existing-hero-image'
        }
        setUploadedImages([existingImage])
      } else {
        setUploadedImages([])
      }
    }

    // Safely extract package types from post or use default
    const getPackageTypes = (): PackageType[] => {
      if (post.packageTypes && Array.isArray(post.packageTypes) && post.packageTypes.length > 0) {
        return post.packageTypes.map((pkg: any) => ({
          name: pkg.name || '',
          description: pkg.description || '',
          price: pkg.price || 0,
          multiplier: pkg.multiplier || 1,
          features: Array.isArray(pkg.features) 
            ? pkg.features.map((f: any) => typeof f === 'string' ? f : f.feature || '').filter((f: string) => f.trim())
            : [],
          revenueCatId: pkg.revenueCatId || '',
        }))
      }
      return [createPackageFromTemplate('per_night')]
    }

    setFormData({
      title: post.title || '',
      content: extractTextFromContent(post.content),
      categories: post.categories?.map(cat => typeof cat === 'string' ? cat : cat.id) || [],
      heroImage: getHeroImageId(),
      _status: post._status as 'draft' | 'published' || 'draft',
      packageTypes: getPackageTypes(),
      baseRate: getBaseRate(),
      meta: {
        title: post.meta?.title || '',
        description: post.meta?.description || '',
        image: typeof post.meta?.image === 'string' ? post.meta.image : post.meta?.image?.id || ''
      }
    })
    
    // Set up existing hero image for display
    setupExistingHeroImage()
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (post: Post) => {
    setDeletingPost(post)
    setIsDeleteDialogOpen(true)
  }

  // Helper function to extract text from rich text content
  const extractTextFromContent = (content: any): string => {
    if (!content) return ''
    if (typeof content === 'string') return content
    
    try {
      const traverse = (node: any): string => {
        if (!node) return ''
        if (typeof node === 'string') return node
        if (node.text) return node.text
        if (node.children && Array.isArray(node.children)) {
          return node.children.map(traverse).join('')
        }
        return ''
      }
      
      if (content.root) {
        return traverse(content.root)
      }
      return traverse(content)
    } catch {
      return ''
    }
  }

  const getPostStatusBadge = (post: Post) => {
    const status = post._status as 'draft' | 'published' | 'pending' | null
    const isPublished = status === 'published' && post.publishedAt
    
    if (isPublished) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>
    } else if (status === 'pending') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending Approval</Badge>
    } else {
      return <Badge variant="secondary">Draft</Badge>
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Memoized filtered posts for performance
  const publishedPosts = useMemo(() => 
    posts.filter(post => post._status === 'published' && post.publishedAt), 
    [posts]
  )
  
  const draftPosts = useMemo(() => 
    posts.filter(post => post._status !== 'published' || !post.publishedAt), 
    [posts]
  )

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedScript(type)
      setTimeout(() => setCopiedScript(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Fetch total visitors on component mount
  useEffect(() => {
    fetch('/api/analytics/posts')
      .then(res => res.json())
      .then(data => {
        setTotalVisitors(data.totalUsers || 0)
      })
      .catch(err => console.error('Failed to fetch total visitors:', err))
  }, [])

  // Check if user is admin for approval permissions
  const isAdmin = user.role?.includes('admin') || false

  return (
    <div className="container max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Plek Dashboard</h1>
          <p className="text-muted-foreground">Manage your posts and content</p>
        </div>
        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Actions
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-1">
                <div 
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer transition-colors"
                  onClick={openCreateDialog}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Create New Plek</span>
                </div>
                <div 
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer transition-colors"
                  onClick={() => setIsViewerDialogOpen(true)}
                >
                  <Code className="h-4 w-4" />
                  <span className="text-sm">Browse Pleks Embed</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Role Upgrade Section for customers who need to upgrade */}
      <div className="mb-8">
        <RoleUpgrade />
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-auto">
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
          <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-auto">
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {bookingStats.hostedBookings > 0 ? `${bookingStats.hostedBookings} hosted bookings` : 'All self-service bookings'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular Package</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookingStats.mostPopularPackage ? 
                getPackageById(bookingStats.mostPopularPackage)?.name || bookingStats.mostPopularPackage.replace(/_/g, ' ') : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {bookingStats.mostPopularPackage ? 
                `${bookingStats.packageTypeStats[bookingStats.mostPopularPackage]} bookings` : 
                'No bookings yet'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Pleks</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedPosts.length}</div>
            <p className="text-xs text-muted-foreground">
              {draftPosts.length} drafts remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Management */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedPosts.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftPosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <PostsList 
            posts={posts} 
            onEdit={openEditDialog} 
            onDelete={openDeleteDialog}
            onCreateNew={openCreateDialog}
            getPostStatusBadge={getPostStatusBadge}
            formatDate={formatDate}
            extractTextFromContent={extractTextFromContent}
          />
        </TabsContent>
        
        <TabsContent value="published" className="space-y-4">
          <PostsList 
            posts={publishedPosts} 
            onEdit={openEditDialog} 
            onDelete={openDeleteDialog}
            onCreateNew={openCreateDialog}
            getPostStatusBadge={getPostStatusBadge}
            formatDate={formatDate}
            extractTextFromContent={extractTextFromContent}
          />
        </TabsContent>
        
        <TabsContent value="drafts" className="space-y-4">
          <PostsList 
            posts={draftPosts} 
            onEdit={openEditDialog} 
            onDelete={openDeleteDialog}
            onCreateNew={openCreateDialog}
            getPostStatusBadge={getPostStatusBadge}
            formatDate={formatDate}
            extractTextFromContent={extractTextFromContent}
          />
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Plek</DialogTitle>
            <DialogDescription>
              Create a new post and configure package options for bookings.
            </DialogDescription>
          </DialogHeader>
          
          <PostForm 
            formData={formData}
            setFormData={updateFormDataImmediate}
            updateFormData={updateFormData}
            categories={categories}
            uploadedImages={uploadedImages}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onPackageChange={handlePackageChange}
            onAddPackageType={addPackageType}
            onRemovePackageType={removePackageType}
            onAddPackageTemplate={addPackageTemplate}
            isAdmin={isAdmin}
            userEntitlements={entitlements}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Plek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plek</DialogTitle>
            <DialogDescription>
              Update your post content and package settings.
            </DialogDescription>
          </DialogHeader>
          
          <PostForm 
            formData={formData}
            setFormData={updateFormDataImmediate}
            updateFormData={updateFormData}
            categories={categories}
            uploadedImages={uploadedImages}
            uploading={uploading}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onPackageChange={handlePackageChange}
            onAddPackageType={addPackageType}
            onRemovePackageType={removePackageType}
            onAddPackageTemplate={addPackageTemplate}
            isEditing={true}
            isAdmin={isAdmin}
            userEntitlements={entitlements}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPost} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Plek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingPost?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Browse Pleks Embed Code Dialog */}
      <Dialog open={isViewerDialogOpen} onOpenChange={setIsViewerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Browse Pleks - Embed Code
            </DialogTitle>
            <DialogDescription>
              Copy these code snippets to embed the Plek viewer in third-party websites.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Iframe */}
            <div className="space-y-3">
              <h4 className="font-semibold">Basic iframe Embed</h4>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<iframe 
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/embed/plek-viewer" 
  width="100%" 
  height="700"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;">
</iframe>`}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/embed/plek-viewer" width="100%" height="700" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`, 'viewer-basic')}
                >
                  {copiedScript === 'viewer-basic' ? 'Copied!' : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Responsive Iframe */}
            <div className="space-y-3">
              <h4 className="font-semibold">Responsive iframe Embed</h4>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<div style="position: relative; width: 100%; height: 700px;">
  <iframe 
    src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/embed/plek-viewer"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: 8px;"
    frameborder="0">
  </iframe>
</div>`}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`<div style="position: relative; width: 100%; height: 700px;"><iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/embed/plek-viewer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: 8px;" frameborder="0"></iframe></div>`, 'viewer-responsive')}
                >
                  {copiedScript === 'viewer-responsive' ? 'Copied!' : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* JSON Data Structure */}
            <div className="space-y-3">
              <h4 className="font-semibold">Plek JSON Data Structure</h4>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  &quot;title&quot;: &quot;Knysna Beach House&quot;,
  &quot;heroImage&quot;: &quot;68551f42433af111fcd627fc&quot;,
  &quot;content&quot;: {
    &quot;root&quot;: {
      &quot;children&quot;: [
        {
          &quot;type&quot;: &quot;paragraph&quot;,
          &quot;children&quot;: [
            {
              &quot;type&quot;: &quot;text&quot;,
              &quot;text&quot;: &quot;Beautiful beachfront property...&quot;
            }
          ]
        }
      ],
      &quot;format&quot;: &quot;&quot;,
      &quot;type&quot;: &quot;root&quot;,
      &quot;version&quot;: 1
    }
  },
  &quot;categories&quot;: [&quot;684aca2d59ac17af425eb5f7&quot;],
  &quot;meta&quot;: {},
  &quot;publishedAt&quot;: &quot;2025-06-20T06:55:45.508Z&quot;,
  &quot;authors&quot;: [&quot;684ac67759ac17af425eaf63&quot;],
  &quot;baseRate&quot;: 8000,
  &quot;slug&quot;: &quot;knysna-beach-house&quot;,
  &quot;slugLock&quot;: true,
  &quot;_status&quot;: &quot;published&quot;,
  &quot;id&quot;: &quot;6855052c80b3955db58780ec&quot;
}`}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`{
  &quot;title&quot;: &quot;Knysna Beach House&quot;,
  &quot;heroImage&quot;: &quot;68551f42433af111fcd627fc&quot;,
  &quot;content&quot;: {
    &quot;root&quot;: {
      &quot;children&quot;: [
        {
          &quot;type&quot;: &quot;paragraph&quot;,
          &quot;children&quot;: [
            {
              &quot;type&quot;: &quot;text&quot;,
              &quot;text&quot;: &quot;Beautiful beachfront property...&quot;
            }
          ]
        }
      ],
      &quot;format&quot;: &quot;&quot;,
      &quot;type&quot;: &quot;root&quot;,
      &quot;version&quot;: 1
    }
  },
  &quot;categories&quot;: [&quot;684aca2d59ac17af425eb5f7&quot;],
  &quot;meta&quot;: {},
  &quot;publishedAt&quot;: &quot;2025-06-20T06:55:45.508Z&quot;,
  &quot;authors&quot;: [&quot;684ac67759ac17af425eaf63&quot;],
  &quot;baseRate&quot;: 8000,
  &quot;slug&quot;: &quot;knysna-beach-house&quot;,
  &quot;slugLock&quot;: true,
  &quot;_status&quot;: &quot;published&quot;,
  &quot;id&quot;: &quot;6855052c80b3955db58780ec&quot;
}`, 'viewer-json')}
                >
                  {copiedScript === 'viewer-json' ? 'Copied!' : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewerDialogOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link href="/embed/plek-viewer" target="_blank">
                Preview Embed
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Enhanced PostsList with analytics
function PostsList({ 
  posts, 
  onEdit, 
  onDelete,
  onCreateNew,
  getPostStatusBadge,
  formatDate,
  extractTextFromContent
}: {
  posts: Post[]
  onEdit: (post: Post) => void
  onDelete: (post: Post) => void
  onCreateNew: () => void
  getPostStatusBadge: (post: Post) => React.JSX.Element
  formatDate: (dateString: string | undefined) => string
  extractTextFromContent: (content: any) => string
}) {
  const [analyticsData, setAnalyticsData] = useState<Record<string, { views: number; users: number; sessions: number }>>({})

  useEffect(() => {
    // Fetch analytics data for inline display
    fetch('/api/analytics/posts')
      .then(res => res.json())
      .then(data => {
        const analyticsMap: Record<string, { views: number; users: number; sessions: number }> = {}
        data.postAnalytics?.forEach((item: any) => {
          analyticsMap[item.slug] = {
            views: item.views,
            users: item.users,
            sessions: item.sessions
          }
        })
        setAnalyticsData(analyticsMap)
      })
      .catch(err => console.error('Failed to fetch inline analytics:', err))
  }, [])

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-muted-foreground mb-4">No posts found</div>
          <Button onClick={onCreateNew} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first plek
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => {
        const analytics = analyticsData[post.slug || '']
        return (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{post.title}</h3>
                    {getPostStatusBadge(post)}
                    {analytics && post._status === 'published' && (
                      <Badge variant="outline" className="gap-1">
                        <Eye className="h-3 w-3" />
                        {analytics.views} views
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {formatDate(post.createdAt)}
                      </span>
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Published: {formatDate(post.publishedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {post.categories && post.categories.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-4">
                      {post.categories.map((category) => (
                        <Badge key={typeof category === 'string' ? category : category.id} variant="outline" className="text-xs">
                          {typeof category === 'string' ? category : category.title}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    {extractTextFromContent(post.content).slice(0, 150)}
                    {extractTextFromContent(post.content).length > 150 && '...'}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Mobile: Sheet with actions */}
                  <div className="md:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-auto">
                        <SheetHeader>
                          <SheetTitle>{post.title}</SheetTitle>
                          <SheetDescription>
                            Choose an action for this plek
                          </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-3 py-4">
                          {post.slug && (
                            <Button variant="outline" className="justify-start gap-2" asChild>
                              <Link href={`/posts/${post.slug}`} target="_blank">
                                <Eye className="h-4 w-4" />
                                View Post
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" className="justify-start gap-2" onClick={() => onEdit(post)}>
                            <Edit className="h-4 w-4" />
                            Edit Post
                          </Button>
                          <Button variant="destructive" className="justify-start gap-2" onClick={() => onDelete(post)}>
                            <Trash2 className="h-4 w-4" />
                            Delete Post
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>

                  {/* Desktop: Inline actions */}
                  <div className="hidden md:flex items-center gap-2">
                    {post.slug && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/posts/${post.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onEdit(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(post)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function PostForm({ 
  formData, 
  setFormData,
  updateFormData,
  categories, 
  uploadedImages, 
  uploading, 
  onImageUpload, 
  onRemoveImage,
  onPackageChange,
  onAddPackageType,
  onRemovePackageType,
  onAddPackageTemplate,
  isEditing = false,
  isAdmin = false,
  userEntitlements = []
}: {
  formData: PostFormData
  setFormData: (data: PostFormData) => void
  updateFormData: (updates: Partial<PostFormData>) => void
  categories: Category[]
  uploadedImages: UploadedFile[]
  uploading: boolean
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (imageId: string) => void
  onPackageChange: (idx: number, field: keyof PackageType, value: string | number | string[]) => void
  onAddPackageType: () => void
  onRemovePackageType: (idx: number) => void
  onAddPackageTemplate: (templateKey: string) => void
  isEditing?: boolean
  isAdmin?: boolean
  userEntitlements?: string[]
}) {
  // Package mode state for combobox
  const [packageMode, setPackageMode] = useState<'preview' | 'edit'>('preview')
  // Preview sub-mode state for combobox (within Preview mode)
  const [previewMode, setPreviewMode] = useState<'mapping' | 'templates'>('mapping')
  
  // Only show the templates that the current user can actually add, based on their entitlements
  const availablePackageTemplates = useMemo(
    () => getAvailablePackagesForUser(userEntitlements || []),
    [userEntitlements]
  )

  // Helper function to remove package by RevenueCat ID
  const removePackageByRevenueCatId = (revenueCatId: string) => {
    const newPackageTypes = formData.packageTypes.filter(pkg => pkg.revenueCatId !== revenueCatId)
    updateFormData({ packageTypes: newPackageTypes })
  }

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details">Plek Details</TabsTrigger>
        <TabsTrigger value="packages">Package Setup</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Enter plek title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseRate">Base Rate (per night) *</Label>
              <Input
                id="baseRate"
                type="number"
                min={0}
                value={formData.baseRate}
                onChange={(e) => updateFormData({ baseRate: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Enter base rate..."
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      formData.categories.length === 0 && "text-muted-foreground"
                    )}
                  >
                    <div className="flex flex-wrap gap-1 max-w-full">
                      {formData.categories.length === 0 ? (
                        "Select categories..."
                      ) : formData.categories.length <= 2 ? (
                        formData.categories.map((categoryId) => {
                          const category = categories.find(c => c.id === categoryId)
                          return category ? (
                            <Badge key={categoryId} variant="secondary" className="text-xs">
                              {category.title}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {categories.find(c => c.id === formData.categories[0])?.title}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            +{formData.categories.length - 1} more
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-3 border-b">
                    <h4 className="font-medium text-sm">Select categories</h4>
                    <p className="text-xs text-muted-foreground">Choose one or more categories for your plek</p>
                  </div>
                  <div className="p-1">
                    {categories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No categories available
                      </div>
                    ) : (
                      categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={formData.categories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFormData({ 
                                  categories: [...formData.categories, category.id] 
                                })
                              } else {
                                updateFormData({ 
                                  categories: formData.categories.filter(id => id !== category.id) 
                                })
                              }
                            }}
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {category.title}
                          </label>
                          {formData.categories.includes(category.id) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {formData.categories.length > 0 && (
                    <div className="p-3 border-t bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {formData.categories.length} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFormData({ categories: [] })}
                          className="h-6 text-xs"
                        >
                          Clear all
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              {/* Enhanced publish controls based on user role */}
              {isAdmin ? (
                // Admin: Full control over status
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="publish"
                      checked={formData._status === 'published'}
                      onCheckedChange={(checked) => 
                        updateFormData({ _status: checked ? 'published' : 'draft' })
                      }
                    />
                    <Label htmlFor="publish">
                      {formData._status === 'published' ? 'Published (Live)' : 'Save as draft'}
                    </Label>
                  </div>
                  {formData._status === 'published' && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      ✓ This post will be immediately visible to visitors
                    </p>
                  )}
                </div>
              ) : (
                // Non-admin: Request approval workflow
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requestApproval"
                      checked={formData._status === 'pending'}
                      onCheckedChange={(checked) => 
                        updateFormData({ _status: checked ? 'pending' : 'draft' })
                      }
                    />
                    <Label htmlFor="requestApproval">
                      {formData._status === 'pending' ? 'Submitted for approval' : 'Save as draft'}
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formData._status === 'pending' ? (
                      <p className="text-amber-600 flex items-center gap-1">
                        ⏳ Waiting for admin approval before publishing
                      </p>
                    ) : formData._status === 'published' ? (
                      <p className="text-green-600 flex items-center gap-1">
                        ✓ This post is live and approved
                      </p>
                    ) : (
                      <p>
                        Submit for approval when ready to publish. Admins will review before making it live.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => updateFormData({ content: e.target.value })}
                placeholder="Write your plek description..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Hero Image</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  disabled={uploading}
                  className="mb-2"
                  multiple
                />
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading images...
                  </div>
                )}
                {uploadedImages && uploadedImages.length > 0 && uploadedImages[0] && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img 
                          src={image.url} 
                          alt={image.filename}
                          className="w-full h-16 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => onRemoveImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings Section - Moved back here as collapsible */}
        <div className="space-y-4 mt-8">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto justify-start">
                <Settings className="h-5 w-5" />
                <h3 className="text-lg font-medium">Advanced Settings</h3>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-4xl p-6" align="start" side="bottom">
              {/* SEO Meta Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-medium">SEO Meta Fields</h4>
                  <Badge variant="secondary" className="text-xs">Auto-inferred</Badge>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-sm">
                    SEO fields are automatically generated from your title, content, and hero image. 
                    You can override them by editing the fields below.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metaTitle">SEO Title</Label>
                    <Input
                      id="metaTitle"
                      value={formData.meta.title}
                      onChange={(e) => updateFormData({ meta: { ...formData.meta, title: e.target.value } })}
                      placeholder={formData.title ? `${formData.title} | Stay at our self built plek` : "Will be auto-generated from title..."}
                    />
                    {!formData.meta.title && formData.title && (
                      <p className="text-xs text-muted-foreground">
                        Auto-generated: &quot;{formData.title} | Stay at our self built plek&quot;
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">SEO Description</Label>
                    <Textarea
                      id="metaDescription"
                      value={formData.meta.description}
                      onChange={(e) => updateFormData({ meta: { ...formData.meta, description: e.target.value } })}
                      placeholder={formData.content ? formData.content.slice(0, 155) + (formData.content.length > 155 ? '...' : '') : "Will be auto-generated from content..."}
                      rows={3}
                      maxLength={160}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {!formData.meta.description && formData.content && (
                          <>Auto-generated from content (first 155 characters)</>
                        )}
                      </span>
                      <span>{formData.meta.description.length}/160</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SEO Image</Label>
                    <div className="text-sm text-muted-foreground">
                      {uploadedImages && uploadedImages.length > 0 && uploadedImages[0] ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={uploadedImages[0].url} 
                            alt="SEO preview"
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <span>Using hero image as SEO image</span>
                        </div>
                      ) : formData.meta.image ? (
                        <span>Custom SEO image set</span>
                      ) : (
                        <span>No SEO image - will use hero image when uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* SEO Preview */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Search Engine Preview</h4>
                    <div className="space-y-1">
                      <div className="text-blue-600 text-sm font-medium">
                        {formData.meta.title || (formData.title ? `${formData.title} | Stay at our self built plek` : 'Your plek title | Stay at our self built plek')}
                      </div>
                      <div className="text-green-700 text-xs">
                        yoursite.com/posts/{formData.title ? formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'your-plek-slug'}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {formData.meta.description || (formData.content ? (typeof formData.content === 'string' ? formData.content.slice(0, 155) + (formData.content.length > 155 ? '...' : '') : 'Content preview...') : 'Your plek description will appear here...')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TabsContent>

      <TabsContent value="packages" className="space-y-6 mt-6">
        {/* Unified Package Dashboard */}
        <div className="space-y-6">
          {/* Package Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Package Dashboard</h2>
              <p className="text-muted-foreground">Manage your add-ons and package configuration</p>
            </div>
          </div>


          {/* Toggle Group for Preview/Edit Modes */}
          <div className="flex flex-col space-y-4">
            {/* Preview Mode (Quick Templates) */}
            <div className={cn("space-y-4", packageMode !== 'preview' && "hidden")}>
              {/* Preview sub-mode Combobox centered */}
              <div className="flex items-center justify-center mb-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[250px] justify-between"
                    >
                      {previewMode === 'mapping' ? (
                        <>
                          <Package className="mr-2 h-4 w-4" />
                          Package 
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Add-on
                        </>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command>
                      <CommandList>
                        <CommandEmpty>No options found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="mapping"
                            onSelect={() => {
                              setPreviewMode('mapping')
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                previewMode === 'mapping' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Package className="mr-2 h-4 w-4" />
                            Package Mapping for Your Tier
                          </CommandItem>
                          <CommandItem
                            value="templates"
                            onSelect={() => {
                              setPreviewMode('templates')
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                previewMode === 'templates' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Sparkles className="mr-2 h-4 w-4" />
                            Preview Add-on Templates
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
 {/* Preview Add-on Options header simplified */}
 <div className="space-y-4 mb-6 text-center">
                <h3 className="text-xl font-semibold">Preview Add-on Options</h3>
                <p className="text-muted-foreground">
                  View your tier mappings or browse available add-on templates.
                </p>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPackageMode('edit')}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Add-ons
                  </Button>
                </div>
              </div>


             

              {/* Package Mapping Section */}
              <div className={cn("space-y-4", previewMode !== 'mapping' && "hidden")}>
                <PackageMappingVisualization userEntitlements={userEntitlements} packageTypes={formData.packageTypes} />
              </div>

              {/* Templates Section */}
              <div className={cn("space-y-4", previewMode !== 'templates' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {Object.entries(availablePackageTemplates).map(([key, template]) => {
                    const PackageIcon = getPackageIconComponent(key)
                    const isAdded = formData.packageTypes.some(pkg => pkg.revenueCatId === key)
                    
                    return (
                      <Card key={key} className={cn(
                        "p-4 cursor-pointer transition-all hover:shadow-md",
                        isAdded ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                      )}>
                        <CardHeader className="p-0 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <PackageIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {template.description.slice(0, 50)}...
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Multiplier:</span>
                              <span className="font-medium">{template.multiplier}x</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Features:</span>
                              <span className="font-medium">{template.features.length} included</span>
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant={isAdded ? "destructive" : "default"}
                            size="sm"
                            onClick={() => {
                              if (isAdded) {
                                // Unselect - remove the package
                                removePackageByRevenueCatId(key)
                                toast.success(`Removed ${template.name} add-on`)
                              } else {
                                // Select - add the package
                                onAddPackageTemplate(key)
                              }
                            }}
                            className="w-full"
                          >
                            {isAdded ? (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Template
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {formData.packageTypes.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">
                        {formData.packageTypes.length} Add-on{formData.packageTypes.length > 1 ? 's' : ''} Added
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Your add-ons have been added with a price of 0 (free). Switch to "Edit Add-ons" to configure pricing and details.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.packageTypes.map((pkg, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          {pkg.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Add-ons Mode (Configure Packages) */}
            <div className={cn("space-y-4", packageMode !== 'edit' && "hidden")}>
              {/* Back to Preview Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPackageMode('preview')}
                  className="gap-2 mb-4"
                >
                  <Eye className="h-4 w-4" />
                  Back to Preview
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Configure Your Add-ons</h3>
                    <p className="text-sm text-muted-foreground">
                      Set pricing, features, and details for your add-on types. Drag to reorder.
                    </p>
                  </div>
                  <Button type="button" onClick={onAddPackageType} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom Add-on
                  </Button>
                </div>

                {formData.packageTypes.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">No Add-ons Yet</h4>
                    <p className="text-muted-foreground mb-4">
                      Start by adding some quick templates or create a custom add-on.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => {
                        // Switch to preview mode
                        setPackageMode('preview')
                      }}>
                        Browse Templates
                      </Button>
                      <Button onClick={onAddPackageType}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Custom
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {formData.packageTypes.map((pkg, idx) => (
                      <Card key={idx} className="p-4 group hover:shadow-md transition-shadow">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Drag handle */}
                              <div className="flex flex-col gap-1 cursor-move opacity-30 group-hover:opacity-60 transition-opacity">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                              </div>
                              <Label className="text-base font-medium">Add-on {idx + 1}</Label>
                              {pkg.price === 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Free Add-on
                                </Badge>
                              )}
                            </div>
                            {/* Remove button (smaller, less prominent) */}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => onRemovePackageType(idx)} 
                              disabled={formData.packageTypes.length === 1}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Add-on Name</Label>
                                <Input
                                  placeholder="Add-on name"
                                  value={pkg.name}
                                  onChange={(e) => onPackageChange(idx, 'name', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Description</Label>
                                <Input
                                  placeholder="Add-on description"
                                  value={pkg.description}
                                  onChange={(e) => onPackageChange(idx, 'description', e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-sm font-medium">Price</Label>
                                  <Input
                                    placeholder={`Base rate: ${formData.baseRate || 'not set'}`}
                                    type="number"
                                    min={0}
                                    value={pkg.price}
                                    onChange={(e) => onPackageChange(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {pkg.price === 0 ? 'Free add-on' : 
                                     pkg.price === '' ? `Will use base rate` : 
                                     'Custom price set'}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium">Multiplier</Label>
                                  <Input
                                    placeholder="1.0"
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={pkg.multiplier}
                                    onChange={(e) => onPackageChange(idx, 'multiplier', Number(e.target.value))}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">RevenueCat ID</Label>
                                <Input
                                  placeholder="RevenueCat product identifier"
                                  value={pkg.revenueCatId}
                                  onChange={(e) => onPackageChange(idx, 'revenueCatId', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Features</Label>
                            <Textarea
                              placeholder="Enter features (one per line)"
                              value={pkg.features.join('\n')}
                              onChange={(e) => onPackageChange(idx, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          {pkg.price === 0 && (
                            <Alert className="border-amber-200 bg-amber-50">
                              <AlertDescription className="text-sm text-amber-800">
                                💡 This is a free add-on. Set a price above 0 to enable paid bookings, or keep it free for promotional offers.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </Card>
                    ))}
                    
                    {formData.packageTypes.length > 1 && (
                      <div className="text-center p-4 text-sm text-muted-foreground">
                        💡 Tip: Hover over add-ons to see drag handles and remove options
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Operations */}
                <Card className="p-4 mt-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-base">Bulk Operations</CardTitle>
                    <CardDescription>
                      Apply changes to multiple add-ons at once.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Set all packages to use base rate
                          formData.packageTypes.forEach((_, idx) => {
                            onPackageChange(idx, 'price', '')
                          })
                        }}
                        disabled={formData.packageTypes.length === 0}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Use Base Rate for All
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Set all packages to free
                          formData.packageTypes.forEach((_, idx) => {
                            onPackageChange(idx, 'price', 0)
                          })
                        }}
                        disabled={formData.packageTypes.length === 0}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Make All Free
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          const config = JSON.stringify(formData.packageTypes, null, 2)
                          navigator.clipboard.writeText(config)
                          toast.success('Add-on configuration copied to clipboard')
                        }}
                        disabled={formData.packageTypes.length === 0}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Export Config
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Warning for Free Packages */}
                {formData.packageTypes.some(pkg => pkg.price === 0) && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertDescription className="text-amber-800">
                      ⚠️ You have {formData.packageTypes.filter(pkg => pkg.price === 0).length} free add-on(s). 
                      Free add-ons act as promotional offers and won't generate revenue. 
                      Consider setting prices for add-ons you want to monetize.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
} 