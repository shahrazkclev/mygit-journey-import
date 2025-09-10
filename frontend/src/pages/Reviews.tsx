import React from 'react';
import { ReviewsManager } from '@/components/reviews/ReviewsManager';

const Reviews: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Reviews Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage and view customer reviews for your products
          </p>
        </div>
        <ReviewsManager />
      </div>
    </div>
  );
};

export default Reviews;
