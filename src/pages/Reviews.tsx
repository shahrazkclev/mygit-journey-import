import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Review {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  review_text: string;
  product_name: string;
  created_at: string;
  status: string;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, filter]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = reviews;
    
    if (filter === '5-star') {
      filtered = reviews.filter(review => review.rating === 5);
    } else if (filter === '4-star') {
      filtered = reviews.filter(review => review.rating === 4);
    } else if (filter === '3-star') {
      filtered = reviews.filter(review => review.rating === 3);
    } else if (filter === '2-star') {
      filtered = reviews.filter(review => review.rating === 2);
    } else if (filter === '1-star') {
      filtered = reviews.filter(review => review.rating === 1);
    }
    
    setFilteredReviews(filtered);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
            </div>
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <a href="/submitreview">Share Your Review</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">{reviews.length}</div>
              <div className="text-gray-600">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">{getAverageRating()}</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center space-x-1 mb-2">
                {renderStars(Math.round(parseFloat(getAverageRating())))}
              </div>
              <div className="text-gray-600">Overall Rating</div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5-star">5 stars</SelectItem>
                <SelectItem value="4-star">4 stars</SelectItem>
                <SelectItem value="3-star">3 stars</SelectItem>
                <SelectItem value="2-star">2 stars</SelectItem>
                <SelectItem value="1-star">1 star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews Grid */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? "Be the first to share your experience!" 
                : `No ${filter.replace('-star', ' star')} reviews found.`
              }
            </p>
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <a href="/submitreview">Write a Review</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{review.customer_name}</h3>
                <p className="text-sm text-gray-600 mb-3">{review.product_name}</p>
                <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">© 2024 Pixel Puff Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
