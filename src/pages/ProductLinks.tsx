import React, { useState } from 'react';
import { ProductLinksDisplay } from '@/components/ProductLinksDisplay';
import { useProductLinks } from '@/hooks/useProductLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Package } from 'lucide-react';

const ProductLinks = () => {
  const { productLinks, loading } = useProductLinks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const filteredLinks = productLinks.filter(link =>
    link.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Product Links</h1>
        <p className="text-muted-foreground">Access download links and video guides for all products</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search by product name or tag</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type product name or tag..."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Links Grid */}
      {loading ? (
        <div className="text-center py-8">Loading product links...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map((link) => (
            <div key={link.id}>
              <ProductLinksDisplay
                productTag={link.tag_name}
                showTitle={true}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && filteredLinks.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'No product links available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductLinks;
