#!/usr/bin/env node

/**
 * Script to create test reviews in the Supabase database
 * This will help test the pending reviews functionality
 */

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

const testReviews = [
  {
    user_email: 'test1@example.com',
    user_name: 'John Doe',
    user_instagram_handle: '@johndoe',
    rating: 5,
    description: 'Amazing product! The quality exceeded my expectations. Fast delivery and great customer service.',
    user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    media_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    media_type: 'image',
    is_active: false, // This should show as pending
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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
    is_active: false, // This should show as pending
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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
    is_active: true, // This should show as published
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function createTestReviews() {
  console.log('Creating test reviews...');
  
  try {
    // First, let's check if there are any existing reviews
    const { data: existingReviews, error: fetchError } = await supabase
      .from('reviews')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching existing reviews:', fetchError);
      return;
    }
    
    console.log(`Found ${existingReviews.length} existing reviews`);
    
    // Insert test reviews
    const { data, error } = await supabase
      .from('reviews')
      .insert(testReviews)
      .select();
    
    if (error) {
      console.error('Error inserting test reviews:', error);
      return;
    }
    
    console.log('Successfully created test reviews:');
    data.forEach((review, index) => {
      console.log(`${index + 1}. ${review.user_name} (${review.user_email}) - ${review.is_active ? 'Published' : 'Pending'}`);
    });
    
    // Verify the data was inserted correctly
    const { data: allReviews, error: verifyError } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('Error verifying reviews:', verifyError);
      return;
    }
    
    console.log('\nAll reviews in database:');
    allReviews.forEach((review, index) => {
      console.log(`${index + 1}. ${review.user_name} - ${review.is_active ? 'Published' : 'Pending'} - Rating: ${review.rating}`);
    });
    
    const pendingCount = allReviews.filter(r => !r.is_active).length;
    const publishedCount = allReviews.filter(r => r.is_active).length;
    
    console.log(`\nSummary:`);
    console.log(`- Total reviews: ${allReviews.length}`);
    console.log(`- Pending reviews: ${pendingCount}`);
    console.log(`- Published reviews: ${publishedCount}`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
createTestReviews();
