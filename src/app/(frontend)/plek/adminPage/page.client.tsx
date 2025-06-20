"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import type { User, Post, Category, Media } from "@/payload-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Edit, Trash2, Eye, Calendar, Users, BarChart3, Settings, Upload, X, Package, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface PlekAdminClientProps {
  user: User
  initialPosts: Post[]
  categories: Category[]
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
  _status: 'draft' | 'published'
  packageTypes: PackageType[]
  baseRate: number | ''
}

interface UploadedFile {
  id: string
  url: string
  filename: string
}

// Predefined package templates for easy selection
const packageTemplates = {
  per_night: {
    name: "Per Night",
    description: "Standard nightly rate",
    multiplier: 1.0,
    features: ["Standard accommodation", "Basic amenities"] as string[],
    revenueCatId: "pn"
  },
  per_night_luxury: {
    name: "Luxury Night",
    description: "Premium nightly rate",
    multiplier: 1.5,
    features: ["Premium accommodation", "Enhanced amenities", "Priority service"] as string[],
    revenueCatId: "per_night_luxury"
  },
  three_nights: {
    name: "3 Nights Package",
    description: "Three night stay",
    multiplier: 0.95,
    features: ["Standard accommodation", "5% discount"] as string[],
    revenueCatId: "3nights"
  },
  hosted3nights: {
    name: "Hosted 3 Nights",
    description: "Premium 3-night experience",
    multiplier: 1.4,
    features: ["Premium accommodation", "Dedicated host", "Enhanced amenities", "Priority service"] as string[],
    revenueCatId: "hosted3nights"
  },
  weekly: {
    name: "Weekly Package",
    description: "Seven night stay",
    multiplier: 0.85,
    features: ["Standard accommodation", "15% discount on total"] as string[],
    revenueCatId: "Weekly"
  },
  hosted7nights: {
    name: "Hosted Weekly",
    description: "Premium week-long experience",
    multiplier: 1.3,
    features: ["Premium accommodation", "Dedicated host", "Enhanced amenities", "Priority service", "15% discount on total"] as string[],
    revenueCatId: "hosted7nights"
  },
  monthly: {
    name: "Monthly Package",
    description: "Extended month-long stay",
    multiplier: 0.7,
    features: ["Standard accommodation", "30% discount", "Extended stay perks"] as string[],
    revenueCatId: "monthly"
  },
  wine: {
    name: "Wine Package",
    description: "Includes wine tasting and selection platters",
    multiplier: 1.5,
    features: ["Standard accommodation", "Wine tasting experience", "Curated wine selection", "Sommelier consultation"] as string[],
    revenueCatId: "Bottle_wine"
  }
} as const

const createPackageFromTemplate = (templateKey: keyof typeof packageTemplates): PackageType => {
  const template = packageTemplates[templateKey]
  return {
    ...template,
    price: '' as number | ''
  }
}

interface PackageFormProps {
  packageTypes: PackageType[]
  onPackageChange: (idx: number, field: keyof PackageType, value: string | number | string[]) => void
  onAddPackageType: () => void
  onRemovePackageType: (idx: number) => void
  onAddPackageTemplate: (templateKey: string) => void
  isEditing?: boolean
}

export default function PlekAdminClient({ user, initialPosts, categories }: PlekAdminClientProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingPost, setDeletingPost] = useState<Post | null>(null)
  
  // Form data with debounced updates
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    categories: [],
    _status: 'draft',
    packageTypes: [createPackageFromTemplate('per_night')],
    baseRate: ''
  })
  
  // Image upload
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)

  // Debounce timer ref to prevent excessive re-renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      content: '',
      categories: [],
      _status: 'draft',
      packageTypes: [createPackageFromTemplate('per_night')],
      baseRate: ''
    })
    setUploadedImages([])
  }, [])

  // Debounced form update function to improve performance
  const updateFormData = useCallback((updates: Partial<PostFormData>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, ...updates }))
    }, 100) // 100ms debounce
  }, [])

  // Immediate form update for critical fields
  const updateFormDataImmediate = useCallback((updates: Partial<PostFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handlePackageChange = useCallback((idx: number, field: keyof PackageType, value: string | number | string[]) => {
    const newPackageTypes = [...formData.packageTypes]
    newPackageTypes[idx] = { 
      ...newPackageTypes[idx], 
      [field]: value 
    } as PackageType
    updateFormDataImmediate({ packageTypes: newPackageTypes })
  }, [formData.packageTypes, updateFormDataImmediate])

  const addPackageType = useCallback(() => {
    const newPackage = createPackageFromTemplate('per_night')
    updateFormDataImmediate({ 
      packageTypes: [...formData.packageTypes, newPackage] 
    })
  }, [formData.packageTypes, updateFormDataImmediate])

  const removePackageType = useCallback((idx: number) => {
    if (formData.packageTypes.length === 1) return // Keep at least one package
    const newPackageTypes = formData.packageTypes.filter((_, i) => i !== idx)
    updateFormDataImmediate({ packageTypes: newPackageTypes })
  }, [formData.packageTypes, updateFormDataImmediate])

  const addPackageTemplate = useCallback((templateKey: string) => {
    if (templateKey in packageTemplates) {
      const newPackage = createPackageFromTemplate(templateKey as keyof typeof packageTemplates)
      updateFormDataImmediate({ 
        packageTypes: [...formData.packageTypes, newPackage] 
      })
    }
  }, [formData.packageTypes, updateFormDataImmediate])

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
      // Create both post and estimate
      const postData = {
        title: formData.title,
        authors: [user.id],
        categories: formData.categories,
        heroImage: uploadedImages.length > 0 ? uploadedImages[0]?.id : undefined,
        publishedAt: formData._status === 'published' ? new Date().toISOString() : undefined,
        _status: formData._status,
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    text: formData.content
                  }
                ]
              }
            ]
          }
        }
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

      // Create associated estimate with package types
      if (formData.packageTypes.length > 0) {
        try {
          const validPackageTypes = formData.packageTypes.filter(pkg => 
            pkg.name && pkg.price !== ''
          ).map(pkg => ({
            ...pkg,
            price: Number(pkg.price)
          }))

          if (validPackageTypes.length > 0) {
            const estimateData = {
              customer: user.id,
              post: result.doc.id,
              baseRate: Number(formData.baseRate) || 0,
              packageTypes: validPackageTypes,
              title: `${formData.title} - Package Options`
            }

            await fetch('/api/estimates', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(estimateData),
            })
          }
        } catch (estimateError) {
          console.warn('Failed to create estimate, but post was created successfully:', estimateError)
        }
      }

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
      const postData = {
        title: formData.title,
        categories: formData.categories,
        heroImage: uploadedImages.length > 0 ? uploadedImages[0]?.id : editingPost.heroImage,
        publishedAt: formData._status === 'published' && !editingPost.publishedAt ? new Date().toISOString() : editingPost.publishedAt,
        _status: formData._status,
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    text: formData.content
                  }
                ]
              }
            ]
          }
        }
      }

      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update post')
      }

      const result = await response.json()
      setPosts(prev => prev.map(post => post.id === editingPost.id ? result.doc : post))
      setSuccess('Plek updated successfully!')
      setIsEditDialogOpen(false)
      setEditingPost(null)
      resetForm()
    } catch (err: any) {
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
    setFormData({
      title: post.title || '',
      content: extractTextFromContent(post.content),
      categories: post.categories?.map(cat => typeof cat === 'string' ? cat : cat.id) || [],
      _status: post._status as 'draft' | 'published' || 'draft',
      packageTypes: [{ ...packageTemplates.per_night, price: '' }],
      baseRate: ''
    })
    setUploadedImages([])
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
    const status = post._status
    const isPublished = status === 'published' && post.publishedAt
    
    if (isPublished) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>
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

  return (
    <div className="container max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Plek Dashboard</h1>
          <p className="text-muted-foreground">Manage your posts and content</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Plek
        </Button>
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
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedPosts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftPosts.length}</div>
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
          <PostsList posts={posts} onEdit={openEditDialog} onDelete={openDeleteDialog} />
        </TabsContent>
        
        <TabsContent value="published" className="space-y-4">
          <PostsList posts={publishedPosts} onEdit={openEditDialog} onDelete={openDeleteDialog} />
        </TabsContent>
        
        <TabsContent value="drafts" className="space-y-4">
          <PostsList posts={draftPosts} onEdit={openEditDialog} onDelete={openDeleteDialog} />
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
            packageTemplates={packageTemplates}
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
            packageTemplates={packageTemplates}
            isEditing={true}
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
              Are you sure you want to delete "{deletingPost?.title}"? This action cannot be undone.
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
    </div>
  )

  function PostsList({ posts, onEdit, onDelete }: { posts: Post[], onEdit: (post: Post) => void, onDelete: (post: Post) => void }) {
    if (posts.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">No posts found</div>
            <Button onClick={openCreateDialog} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first plek
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{post.title}</h3>
                    {getPostStatusBadge(post)}
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
            </CardContent>
          </Card>
        ))}
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
    packageTemplates,
    isEditing = false 
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
    packageTemplates: typeof packageTemplates
    isEditing?: boolean
  }) {
    return (
      <div className="space-y-6">
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
              <Select 
                value={formData.categories.length > 0 ? formData.categories[0] : ''} 
                onValueChange={(value) => updateFormData({ categories: value ? [value] : [] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="publish"
                checked={formData._status === 'published'}
                onCheckedChange={(checked) => 
                  updateFormData({ _status: checked ? 'published' : 'draft' })
                }
              />
              <Label htmlFor="publish">
                {formData._status === 'published' ? 'Publish immediately' : 'Save as draft'}
              </Label>
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
                {uploadedImages.length > 0 && (
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

        {/* Package Types Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Package Types</h3>
            <Button type="button" onClick={onAddPackageType} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Package
            </Button>
          </div>
          
          {/* Package Template Quick Add */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Quick Add Templates:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(packageTemplates).map(([key, template]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => onAddPackageTemplate(key)}
                  className="gap-1"
                >
                  <Package className="h-3 w-3" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {formData.packageTypes.map((pkg, idx) => (
            <Card key={idx} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Package {idx + 1}</Label>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onRemovePackageType(idx)} 
                    disabled={formData.packageTypes.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Package name"
                    value={pkg.name}
                    onChange={(e) => onPackageChange(idx, 'name', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Price"
                        type="number"
                        min={0}
                        value={pkg.price}
                        onChange={(e) => onPackageChange(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Multiplier"
                        type="number"
                        min={0}
                        step={0.1}
                        value={pkg.multiplier}
                        onChange={(e) => onPackageChange(idx, 'multiplier', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <Input
                    placeholder="RevenueCat ID"
                    value={pkg.revenueCatId}
                    onChange={(e) => onPackageChange(idx, 'revenueCatId', e.target.value)}
                  />
                </div>
                
                <Textarea
                  placeholder="Package description"
                  value={pkg.description}
                  onChange={(e) => onPackageChange(idx, 'description', e.target.value)}
                  rows={2}
                />
                
                <div className="space-y-2">
                  <Label className="text-sm">Features</Label>
                  <Textarea
                    placeholder="Enter features (one per line)"
                    value={pkg.features.join('\n')}
                    onChange={(e) => onPackageChange(idx, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }
} 