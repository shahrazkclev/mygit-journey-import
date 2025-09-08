/**
 * Console script to test reviews functionality
 * Run this in the browser console on the reviews page
 */

// Test function to create sample reviews
async function createSampleReviews() {
  console.log('Creating sample reviews...');
  
  const sampleReviews = [
    {
      user_email: 'test1@example.com',
      user_name: 'John Doe',
      user_instagram_handle: '@johndoe',
      rating: 5,
      description: 'Amazing product! The quality exceeded my expectations. Fast delivery and great customer service.',
      user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      media_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      media_type: 'image',
      is_active: false, // Pending
      sort_order: 0
    },
    {
      user_email: 'test2@example.com',
      user_name: 'Jane Smith',
      user_instagram_handle: '@janesmith',
      rating: 4,
      description: 'Great product overall. Good quality and fast shipping. Would recommend to others.',
      user_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      media_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
      media_type: 'image',
      is_active: false, // Pending
      sort_order: 0
    },
    {
      user_email: 'test3@example.com',
      user_name: 'Mike Johnson',
      user_instagram_handle: '@mikejohnson',
      rating: 3,
      description: 'Decent product but could be better. Delivery was slow but quality is okay.',
      user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      media_url: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop',
      media_type: 'image',
      is_active: true, // Published
      sort_order: 1
    }
  ];
  
  try {
    // Get the supabase client from the page
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    // You'll need to get these values from your environment or the page
    const supabaseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321' 
      : 'your-production-supabase-url';
    const supabaseKey = 'your-supabase-anon-key';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('reviews')
      .insert(sampleReviews)
      .select();
    
    if (error) {
      console.error('Error creating sample reviews:', error);
      return;
    }
    
    console.log('Successfully created sample reviews:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test function to check existing reviews
async function checkExistingReviews() {
  console.log('Checking existing reviews...');
  
  try {
    // Get the supabase client from the page
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321' 
      : 'your-production-supabase-url';
    const supabaseKey = 'your-supabase-anon-key';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }
    
    console.log('Existing reviews:', data);
    
    const pendingCount = data.filter(r => !r.is_active).length;
    const publishedCount = data.filter(r => r.is_active).length;
    
    console.log(`Summary: ${data.length} total, ${pendingCount} pending, ${publishedCount} published`);
    
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test function to debug the fetchReviews function
function debugFetchReviews() {
  console.log('Debugging fetchReviews function...');
  
  // This function should be run in the context of the ReviewsManager component
  if (typeof window !== 'undefined' && window.testPendingReviews) {
    window.testPendingReviews();
  } else {
    console.log('testPendingReviews function not found. Make sure you are on the reviews page.');
  }
}

// Export functions for use in console
window.createSampleReviews = createSampleReviews;
window.checkExistingReviews = checkExistingReviews;
window.debugFetchReviews = debugFetchReviews;

console.log('Review testing functions loaded. Use:');
console.log('- createSampleReviews() to create test data');
console.log('- checkExistingReviews() to check current data');
console.log('- debugFetchReviews() to debug the fetch function');
