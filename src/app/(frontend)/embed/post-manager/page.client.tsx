'use client'

import React, { useState } from 'react'
import type { User } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'

interface EmbedPostManagerProps {
  user: User
}

export default function EmbedPostManager({ user }: EmbedPostManagerProps) {
  const [postId, setPostId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const updatePost = async () => {
    if (!postId.trim()) {
      showMessage('error', 'Post ID is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          _status: 'published'
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        showMessage('success', 'Post updated successfully!')
      } else {
        showMessage('error', result.error || 'Failed to update post')
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async () => {
    if (!postId.trim()) {
      showMessage('error', 'Post ID is required')
      return
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        showMessage('success', 'Post deleted successfully!')
        // Clear form after successful deletion
        setPostId('')
        setTitle('')
        setContent('')
      } else {
        showMessage('error', result.error || 'Failed to delete post')
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Post Manager
            </CardTitle>
            <CardDescription>
              Manage your posts from this embedded interface. Logged in as: {user.email}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="postId" className="block text-sm font-medium mb-2">
                  Post ID *
                </label>
                <Input
                  id="postId"
                  type="text"
                  placeholder="Enter post ID"
                  value={postId}
                  onChange={(e) => setPostId(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium mb-2">
                  Content
                </label>
                <Textarea
                  id="content"
                  placeholder="Post content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={loading}
                  rows={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={updatePost} 
                  disabled={loading || !postId.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Update Post
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={deletePost} 
                  disabled={loading || !postId.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 pt-4 border-t">
              <p>• Enter a Post ID to update or delete a post</p>
              <p>• Title and Content are optional for updates</p>
              <p>• Deletion requires confirmation and cannot be undone</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 