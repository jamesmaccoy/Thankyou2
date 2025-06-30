'use client'

import React, { useState } from 'react'
import type { Post } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Eye, Calendar, MapPin, Star, Package } from 'lucide-react'

interface EmbedPlekViewerProps {
  posts: Post[]
}

export default function EmbedPlekViewer({ posts }: EmbedPlekViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Filter posts based on search term
  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    extractTextFromContent(post.content).toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const openPostDetail = (post: Post) => {
    setSelectedPost(post)
    setIsDetailDialogOpen(true)
  }

  const getHeroImage = (post: Post) => {
    if (post.heroImage && typeof post.heroImage === 'object') {
      return post.heroImage.url
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Pleks</h1>
          <p className="text-gray-600">Discover amazing places and experiences</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search pleks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredPosts.length} of {posts.length} pleks
          </p>
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500 mb-4">
                {searchTerm ? 'No pleks found matching your search.' : 'No pleks available.'}
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                {/* Hero Image */}
                {getHeroImage(post) && (
                  <div className="h-48 bg-gray-200">
                    <img 
                      src={getHeroImage(post)!} 
                      alt={post.title || 'Plek image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-lg line-clamp-2">{post.title}</h3>
                    
                    {/* Content Preview */}
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {extractTextFromContent(post.content)}
                    </p>
                    
                    {/* Categories */}
                    {post.categories && post.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.categories.slice(0, 2).map((category) => (
                          <Badge key={typeof category === 'string' ? category : category.id} variant="secondary" className="text-xs">
                            {typeof category === 'string' ? category : category.title}
                          </Badge>
                        ))}
                        {post.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.categories.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt || undefined)}
                      </span>
                    </div>
                    
                    {/* View Button */}
                    <Button 
                      onClick={() => openPostDetail(post)}
                      className="w-full mt-3"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Post Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPost && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedPost.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Published: {formatDate(selectedPost.publishedAt || undefined)}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Hero Image */}
                  {getHeroImage(selectedPost) && (
                    <div className="h-64 bg-gray-200 rounded-lg overflow-hidden">
                      <img 
                        src={getHeroImage(selectedPost)!} 
                        alt={selectedPost.title || 'Plek image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Categories */}
                  {selectedPost.categories && selectedPost.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.categories.map((category) => (
                        <Badge key={typeof category === 'string' ? category : category.id} variant="secondary">
                          {typeof category === 'string' ? category : category.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {extractTextFromContent(selectedPost.content)}
                    </div>
                  </div>
                  
                  {/* Call to Action */}
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <h4 className="font-semibold text-blue-900 mb-2">Interested in this Plek?</h4>
                    <p className="text-sm text-blue-700 mb-3">Contact us to learn more or make a booking</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Package className="h-4 w-4 mr-2" />
                      Get Quote
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 