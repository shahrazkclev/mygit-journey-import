import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  sku: string | null;
  created_at: string;
}

export const ProductManager: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    sku: ''
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
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
          sku: newProduct.sku || null
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [data, ...prev]);
      setNewProduct({ name: '', description: '', price: '', category: '', sku: '' });
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
          sku: editingProduct.sku || null
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
      setEditingProduct(null);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-email-primary">Product Management</h2>
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogTrigger asChild>
            <Button className="bg-email-primary hover:bg-email-primary/80">
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

      <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
        <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-email-secondary font-semibold">Products ({products.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No products found. Add your first product above.
              </p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-email-muted/20 transition-colors border-email-primary/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-email-accent/20 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-email-accent" />
                    </div>
                    <div>
                      <div className="font-medium text-email-primary">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.category && `${product.category} • `}
                        {product.sku && `SKU: ${product.sku} • `}
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
                      onClick={() => setEditingProduct(product)}
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
              ))
            )}
          </div>
        </CardContent>
      </Card>

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