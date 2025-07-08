// src/pages/api/estimates.ts (or /app/api/estimates/route.ts for app router)
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { calculateTotal } from '@/lib/calculateTotal'

export async function POST(request: Request) {
  console.log('=== ESTIMATES API POST REQUEST STARTED ===')
  try {
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { postId, fromDate, toDate, guests, title, customer, packageType, total, duration: requestDuration, startTime, endTime, hours, units } = body;

    console.log('Destructured body fields:', { postId, fromDate, toDate, guests, title, customer, packageType, total, requestDuration, startTime, endTime, hours, units });

    // Validate required fields
    if (!postId) {
      console.error('Validation Error: postId is required');
      return new Response(JSON.stringify({ error: 'postId is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!customer) {
      console.error('Validation Error: customer is required');
      return new Response(JSON.stringify({ error: 'customer is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!fromDate || !toDate) {
      console.error('Validation Error: fromDate and toDate are required');
      return new Response(JSON.stringify({ error: 'fromDate and toDate are required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const payload = await getPayload({ config: configPromise });

    let postRef = postId;
    let baseRate = 150; // Default fallback
    let postData = null; // To store the fetched post object

    // If postId is not a valid ObjectId, look up the post by slug
    if (!/^[a-f\d]{24}$/i.test(postId)) {
      console.log('Attempting to find post by slug:', postId);
      try {
        const post = await payload.find({
          collection: 'posts',
          where: { slug: { equals: postId } },
          limit: 1,
        });
        if (!post.docs.length) {
          console.error('Post not found by slug:', postId);
          return new Response(JSON.stringify({ error: 'Post not found' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        postData = post.docs[0];
        if (postData) {
          postRef = postData.id;
          // Use proper fallback logic - only use 150 if baseRate is null, undefined, or NaN
          baseRate = (typeof postData.baseRate === 'number' && !isNaN(postData.baseRate)) 
            ? postData.baseRate 
            : 150;
          console.log('Found post by slug, baseRate:', baseRate, 'from postData.baseRate:', postData.baseRate);
        }
      } catch (postError) {
        console.error('Error finding post by slug:', postError);
        return new Response(JSON.stringify({ error: 'Error finding post' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    } else {
      // If postId is an ObjectId, fetch the post to get baseRate
      console.log('Attempting to find post by ID:', postId);
      try {
        const post = await payload.findByID({ collection: 'posts', id: postId });
        if (post) {
          postData = post;
          // Use proper fallback logic - only use 150 if baseRate is null, undefined, or NaN
          baseRate = (typeof postData.baseRate === 'number' && !isNaN(postData.baseRate)) 
            ? postData.baseRate 
            : 150;
          console.log('Found post by ID, baseRate:', baseRate, 'from postData.baseRate:', postData.baseRate);
        } else {
          console.error('Post not found by ID:', postId);
          return new Response(JSON.stringify({ error: 'Post not found' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      } catch (postError) {
        console.error('Error finding post by ID:', postError);
        return new Response(JSON.stringify({ error: 'Error finding post' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    let duration = requestDuration || 1;
    let packageMultiplier = 1;

    // Find the selected package type from the post's packageTypes array
    console.log('Post data packageTypes:', postData?.packageTypes);
    console.log('Requested packageType:', packageType);

    const selectedPackage = postData?.packageTypes?.find(pkg => pkg.id === packageType);
    if (selectedPackage) {
      packageMultiplier = selectedPackage.multiplier || 1;
      console.log('Found selected package:', selectedPackage);
      console.log('Package multiplier:', packageMultiplier);

      // If it's an hourly package, ensure duration is from requestDuration
      if (selectedPackage.name.toLowerCase().includes('hour')) {
        duration = requestDuration || 1; // Use requestDuration for hourly
        console.log('Hourly package detected, using requestDuration:', duration);
      }
    } else {
      console.warn('Selected package not found in postData.packageTypes. Using default multiplier.');
    }

    // Calculate total (use provided total if available, otherwise calculate)
    const calculatedTotal = total !== undefined ? Number(total) : calculateTotal(baseRate, duration, packageMultiplier);
    console.log('Calculated total:', calculatedTotal);
    
    if (isNaN(calculatedTotal)) {
      console.error('Validation Error: Invalid total amount', calculatedTotal);
      return new Response(JSON.stringify({ error: 'Invalid total amount' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Ensure customer is just the ID
    const customerId = typeof customer === 'object' && customer !== null ? customer.id : customer;
    console.log('Customer ID:', customerId);

    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      console.error('Validation Error: Invalid customer ID', customerId);
      return new Response(JSON.stringify({ error: 'Invalid customer ID' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Check for existing estimate for this post/customer/dates
    try {
      console.log('Checking for existing estimate...');
      const existing = await payload.find({
        collection: 'estimates',
        where: {
          post: { equals: postRef },
          customer: { equals: customerId },
          fromDate: { equals: fromDate },
          toDate: { equals: toDate }
        },
        limit: 1,
      });
      
      if (existing.docs.length && existing.docs[0]) {
        console.log('Existing estimate found, updating:', existing.docs[0].id);
        // Update the existing estimate with the new total and other fields
        const updated = await payload.update({
          collection: 'estimates',
          id: existing.docs[0]!.id,
          data: {
            total: calculatedTotal,
            guests: Array.isArray(guests) ? guests : [],
            fromDate,
            toDate,
            customer: customerId,
            packageType: packageType || 'standard',
            ...(startTime && { startTime }),
            ...(endTime && { endTime }),
            ...(duration !== undefined && { duration }),
            ...(units && { units }),
          },
        });
        console.log('Estimate updated successfully:', updated.id);
        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.log('No existing estimate found.');
    } catch (existingError) {
      console.error('Error checking existing estimates:', existingError);
      // Continue to create new estimate
    }

    // Create new estimate
    try {
      console.log('Creating new estimate...');
      const estimate = await payload.create({
        collection: 'estimates',
        data: {
          title: title || `Estimate for ${postData?.title || postRef}`,
          post: postRef,
          fromDate,
          toDate,
          guests: Array.isArray(guests) ? guests : [],
          total: calculatedTotal,
          customer: customerId,
          packageType: packageType || 'standard',
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(duration !== undefined && { duration }),
          ...(units && { units }),
        },
      });

      console.log('Estimate created successfully:', estimate.id);
      return new Response(JSON.stringify(estimate), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (createError) {
      console.error('Error creating estimate:', createError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create estimate', 
        details: createError instanceof Error ? createError.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (err) {
    console.error('Estimates API outer error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } finally {
    console.log('=== ESTIMATES API POST REQUEST FINISHED ===');
  }
}

export async function DELETE(req: Request) {
  console.log('=== ESTIMATES API DELETE REQUEST STARTED ===')
  
  try {
    const payload = await getPayload({ config: configPromise })
    const url = new URL(req.url)
    
    // Log request details
    console.log('DELETE Request URL:', req.url)
    console.log('URL search params:', url.searchParams.toString())
    
    // Get the authenticated user
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      console.log('DELETE request: No authenticated user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
    
    console.log('DELETE request user:', { id: user.id, role: user.role })
    
    // Parse the estimate IDs from the query parameters
    // URL format: ?limit=0&where[id][in][0]=estimateId1&where[id][in][1]=estimateId2
    const estimateIds: string[] = []
    
    // Extract estimate IDs from query parameters
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('where[id][in][') && key.endsWith(']')) {
        estimateIds.push(value)
      }
    })
    
    console.log('Estimate IDs to delete:', estimateIds)
    
    if (estimateIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No estimate IDs provided' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
    
    // Delete each estimate
    const deleteResults = []
    const errors = []
    
    for (const estimateId of estimateIds) {
      try {
        console.log(`Attempting to delete estimate: ${estimateId}`)
        
        // Check if user has permission to delete this estimate
        if (!user.role?.includes('admin')) {
          // For non-admin users, check if they own the estimate
          const estimate = await payload.findByID({
            collection: 'estimates',
            id: estimateId,
            depth: 0,
          })
          
          const estimateCustomerId = typeof estimate.customer === 'string' 
            ? estimate.customer 
            : estimate.customer?.id;
          
          if (!estimate || estimateCustomerId !== user.id) {
            console.log(`User ${user.id} cannot delete estimate ${estimateId} - not owner`)
            errors.push(`Cannot delete estimate ${estimateId}: Access denied`)
            continue
          }
        }
        
        await payload.delete({
          collection: 'estimates',
          id: estimateId,
          user,
        })
        
        console.log(`Successfully deleted estimate: ${estimateId}`)
        deleteResults.push(estimateId)
      } catch (deleteError) {
        console.error(`Error deleting estimate ${estimateId}:`, deleteError)
        const errorMessage = deleteError instanceof Error ? deleteError.message : 'Unknown error'
        errors.push(`Failed to delete estimate ${estimateId}: ${errorMessage}`)
      }
    }
    
    console.log('Delete results:', { deleted: deleteResults, errors })
    
    if (errors.length > 0 && deleteResults.length === 0) {
      // All deletions failed
      return new Response(JSON.stringify({ 
        error: 'Failed to delete estimates',
        details: errors 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
    
    // Return success response
    return new Response(JSON.stringify({ 
      message: `Successfully deleted ${deleteResults.length} estimate(s)`,
      deleted: deleteResults,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('=== ESTIMATES DELETE ERROR ===')
    console.error('Delete error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error during estimate deletion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    console.log('=== ESTIMATES API DELETE REQUEST FINISHED ===');
  }
}