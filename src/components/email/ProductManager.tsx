import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Edit, Trash2, Link, Video, Percent, ExternalLink, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DealsManager } from './DealsManager';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  sku: string | null;
  tag: string | null;
  created_at: string;
}

interface ProductLink {
  id: string;
  tag_name: string;
  download_url: string;
  video_guide_url: string | null;
  description: string | null;
}

interface Deal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  original_price: number | null;
  discounted_price: number | null;
  buy_link: string | null;
  ad_image_url: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ProductManager: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    sku: '',
    tag: ''
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productLinks, setProductLinks] = useState<ProductLink[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [editingLinks, setEditingLinks] = useState({
    downloadUrl: '',
    videoGuideUrl: ''
  });
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    loadProducts();
    loadProductLinks();
    loadDeals();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadProductLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('product_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductLinks(data || []);
    } catch (error) {
      console.error('Error loading product links:', error);
      toast.error('Failed to load product links');
    }
  };

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast.error('Failed to load deals');
    }
  };

  const addProduct = async () => {
    if (!newProduct.name) {
      toast.error('Product name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          user_id: user?.id,
          name: newProduct.name,
          description: newProduct.description || null,
          price: newProduct.price ? parseFloat(newProduct.price) : null,
          category: newProduct.category || null,
          sku: newProduct.sku || null,
          tag: newProduct.tag || null
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [data, ...prev]);
      setNewProduct({ name: '', description: '', price: '', category: '', sku: '', tag: '' });
      setShowAddProduct(false);
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const updateProduct = async () => {
    if (!editingProduct || !editingProduct.name) {
      toast.error('Product name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          description: editingProduct.description || null,
          price: editingProduct.price,
          category: editingProduct.category || null,
          sku: editingProduct.sku || null,
          tag: editingProduct.tag || null
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      // Update product links if tag is provided
      if (editingProduct.tag) {
        console.log('Product has tag, updating links:', editingProduct.tag, editingLinks);
        await updateProductLinks(editingProduct.tag, editingLinks.downloadUrl, editingLinks.videoGuideUrl);
      } else {
        console.log('Product has no tag, skipping link update');
      }

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
      setEditingProduct(null);
      setEditingLinks({ downloadUrl: '', videoGuideUrl: '' });
      toast.success('Product and links updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const updateProductLinks = async (tagName: string, downloadUrl: string, videoGuideUrl: string) => {
    try {
      console.log('Updating product links for tag:', tagName, 'downloadUrl:', downloadUrl, 'videoGuideUrl:', videoGuideUrl);
      
      // Check if link already exists for this tag
      const { data: existingLink, error: fetchError } = await supabase
        .from('product_links')
        .select('*')
        .eq('tag_name', tagName)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing link:', fetchError);
        throw fetchError;
      }

      if (existingLink) {
        // Update existing link - use the actual values provided, not the || fallback
        const { data: updateData, error } = await supabase
          .from('product_links')
          .update({
            download_url: downloadUrl || null, // Use null if empty string
            video_guide_url: videoGuideUrl || null // Use null if empty string
          })
          .eq('id', existingLink.id)
          .select();

        if (error) {
          console.error('Error updating existing link:', error);
          throw error;
        }
        console.log('Successfully updated existing link:', updateData);
      } else {
        // Create new link
        const { data: insertData, error } = await supabase
          .from('product_links')
          .insert([{
            tag_name: tagName,
            download_url: downloadUrl || null,
            video_guide_url: videoGuideUrl || null
          }])
          .select();

        if (error) {
          console.error('Error creating new link:', error);
          throw error;
        }
        console.log('Successfully created new link:', insertData);
      }

      // Reload product links
      await loadProductLinks();
      console.log('Product links reloaded');
    } catch (error) {
      console.error('Error updating product links:', error);
      toast.error('Failed to update product links');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const loadExistingLinks = async (tagName: string) => {
    try {
      setLoadingLinks(true);
      // Fetch the latest link data from database
      const { data: existingLink, error } = await supabase
        .from('product_links')
        .select('*')
        .eq('tag_name', tagName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error loading existing links:', error);
        toast.error('Failed to load existing links');
        return;
      }

      if (existingLink) {
        console.log('Found existing link for tag:', tagName, existingLink);
        setEditingLinks({
          downloadUrl: existingLink.download_url || '',
          videoGuideUrl: existingLink.video_guide_url || ''
        });
      } else {
        console.log('No existing link found for tag:', tagName);
        setEditingLinks({ downloadUrl: '', videoGuideUrl: '' });
      }
    } catch (error) {
      console.error('Error loading existing links:', error);
      setEditingLinks({ downloadUrl: '', videoGuideUrl: '' });
    } finally {
      setLoadingLinks(false);
    }
  };

  const getDealsForProduct = (product: Product) => {
    if (!product.tag) return [];
    
    // Find deals that match the product tag or are general deals
    return deals.filter(deal => {
      // Check if deal title contains the product tag or vice versa
      const dealTitleLower = deal.title.toLowerCase();
      const productTagLower = product.tag.toLowerCase();
      
      return dealTitleLower.includes(productTagLower) || 
             productTagLower.includes(dealTitleLower) ||
             dealTitleLower.includes(product.name.toLowerCase()) ||
             product.name.toLowerCase().includes(dealTitleLower);
    });
  };

  // Calculate stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const productsWithDeals = products.filter(p => getDealsForProduct(p).length > 0).length;

  return (
    <div className="space-y-fluid-xl">
      {/* Enhanced Header with Stats */}
      <div className="bg-slate-50 rounded-fluid p-fluid-xl border-2 border-slate-200 theme-shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-fluid-lg mb-fluid-lg">
          <div>
            <h2 className="text-fluid-3xl font-extrabold text-slate-800 mb-fluid-xs">
              Product Management
            </h2>
            <p className="text-fluid-sm text-muted-foreground font-medium">
              Manage your products, deals, and customer links
            </p>
          </div>
          <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 theme-shadow-md hover:theme-shadow-lg text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Premium Widget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="99.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="WIDGET-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Electronics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  value={newProduct.tag}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="product-tag"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                  Cancel
                </Button>
                <Button onClick={addProduct}>
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards - Varied solid colors with rhythm */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-lg">
        <Card className="bg-blue-50 border-2 border-blue-200 theme-shadow-md hover:theme-shadow-lg transition-all duration-200 hover-lift hover:border-blue-300">
          <CardContent className="p-fluid-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fluid-sm text-blue-700 font-semibold mb-1">Total Products</p>
                <p className="text-fluid-3xl font-bold text-blue-600">{totalProducts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-fluid border border-blue-200">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-2 border-emerald-200 theme-shadow-md hover:theme-shadow-lg transition-all duration-200 hover-lift hover:border-emerald-300">
          <CardContent className="p-fluid-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fluid-sm text-emerald-700 font-semibold mb-1">Total Value</p>
                <p className="text-fluid-3xl font-bold text-emerald-600">${totalValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-fluid border border-emerald-200">
                <Percent className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-2 border-purple-200 theme-shadow-md hover:theme-shadow-lg transition-all duration-200 hover-lift hover:border-purple-300">
          <CardContent className="p-fluid-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fluid-sm text-purple-700 font-semibold mb-1">Categories</p>
                <p className="text-fluid-3xl font-bold text-purple-600">{categories.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-fluid border border-purple-200">
                <Tag className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-2 border-amber-200 theme-shadow-md hover:theme-shadow-lg transition-all duration-200 hover-lift hover:border-amber-300">
          <CardContent className="p-fluid-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fluid-sm text-amber-700 font-semibold mb-1">With Deals</p>
                <p className="text-fluid-3xl font-bold text-amber-600">{productsWithDeals}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-fluid border border-amber-200">
                <Percent className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="theme-shadow-lg bg-white border-2 border-slate-200">
        <CardHeader className="bg-slate-50 border-b-2 border-slate-200 p-fluid-lg">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500 rounded-fluid theme-shadow-md border border-blue-600">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-fluid-xl font-bold text-foreground">Products</span>
              <p className="text-fluid-sm text-muted-foreground font-medium mt-1">
                {products.length} {products.length === 1 ? 'product' : 'products'} in your catalog
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No products found. Add your first product above.
              </p>
            ) : (
              products.map((product) => {
                const productDeals = getDealsForProduct(product);
                return (
                  <div key={product.id} className="p-fluid-lg border-2 rounded-fluid hover:bg-muted/30 transition-all duration-200 border-border/50 hover:border-primary/30 theme-shadow-sm hover:theme-shadow-md hover-lift bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-email-accent/20 rounded-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-email-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-email-primary">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.category && `${product.category} • `}
                            {product.sku && `SKU: ${product.sku} • `}
                            {product.tag && `Tag: ${product.tag} • `}
                            {product.price ? `$${product.price}` : 'No price set'}
                          </div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setEditingProduct(product);
                        if (product.tag) {
                          await loadExistingLinks(product.tag);
                        }
                      }}
                      className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                    >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Deals Section */}
                    {productDeals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-email-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Percent className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Active Deals</span>
                        </div>
                        <div className="space-y-2">
                          {productDeals.map((deal) => (
                            <div key={deal.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <Percent className="h-3 w-3 text-green-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-green-800">{deal.title}</div>
                                  <div className="text-xs text-green-600">
                                    {deal.discount_percent && `${deal.discount_percent}% off • `}
                                    {deal.original_price && `$${deal.original_price} → `}
                                    {deal.discounted_price && `$${deal.discounted_price}`}
                                    {deal.expires_at && ` • Expires: ${new Date(deal.expires_at).toLocaleDateString()}`}
                                  </div>
                                </div>
                              </div>
                              {deal.buy_link && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(deal.buy_link!, '_blank')}
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Buy
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deals Management Section */}
      <div className="mt-8">
        <DealsManager />
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Premium Widget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) || null } : null)}
                    placeholder="99.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input
                    id="edit-sku"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, sku: e.target.value } : null)}
                    placeholder="WIDGET-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, category: e.target.value } : null)}
                  placeholder="Electronics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tag">Tag</Label>
                <Input
                  id="edit-tag"
                  value={editingProduct.tag || ''}
                  onChange={async (e) => {
                    setEditingProduct(prev => prev ? { ...prev, tag: e.target.value } : null);
                    if (e.target.value) {
                      await loadExistingLinks(e.target.value);
                    }
                  }}
                  placeholder="product-tag"
                />
              </div>
              {editingProduct.tag && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    Product Links
                    {loadingLinks && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    )}
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-download-url" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Download Link
                    </Label>
                    <Input
                      id="edit-download-url"
                      value={editingLinks.downloadUrl}
                      onChange={(e) => setEditingLinks(prev => ({ ...prev, downloadUrl: e.target.value }))}
                      placeholder="https://example.com/download"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-video-guide-url" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Guide Link
                    </Label>
                    <Input
                      id="edit-video-guide-url"
                      value={editingLinks.videoGuideUrl}
                      onChange={(e) => setEditingLinks(prev => ({ ...prev, videoGuideUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                  Cancel
                </Button>
                <Button onClick={updateProduct}>
                  Update Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};