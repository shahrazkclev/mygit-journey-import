import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Trash2, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[] | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  sku: string | null;
}

interface ContactProduct {
  id: string;
  contact_id: string;
  product_id: string;
  purchased_at: string;
  price_paid: number | null;
  product: Product;
}

interface EditContactDialogProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export const EditContactDialog: React.FC<EditContactDialogProps> = ({
  contact,
  isOpen,
  onClose,
  onContactUpdated
}) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    tags: '',
    status: 'subscribed'
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [contactProducts, setContactProducts] = useState<ContactProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Load data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        email: contact.email,
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        tags: (contact.tags || []).join(', '),
        status: contact.status
      });
      loadContactProducts();
    }
  }, [contact]);

  // Load products and contact products
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadContactProducts = async () => {
    if (!contact) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_products')
        .select(`
          *,
          product:products(*)
        `)
        .eq('contact_id', contact.id);

      if (error) throw error;
      
      const contactProductData = data || [];
      setContactProducts(contactProductData);
      
      // Set selected products and prices
      const selected = new Set(contactProductData.map(cp => cp.product_id));
      const prices: Record<string, string> = {};
      contactProductData.forEach(cp => {
        prices[cp.product_id] = cp.price_paid?.toString() || '';
      });
      
      setSelectedProducts(selected);
      setProductPrices(prices);
    } catch (error) {
      console.error('Error loading contact products:', error);
      toast.error('Failed to load contact products');
    }
  };

  const handleProductToggle = (productId: string, product: Product) => {
    const newSelected = new Set(selectedProducts);
    const newPrices = { ...productPrices };
    
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      delete newPrices[productId];
    } else {
      newSelected.add(productId);
      newPrices[productId] = product.price?.toString() || '';
    }
    
    setSelectedProducts(newSelected);
    setProductPrices(newPrices);
  };

  const handlePriceChange = (productId: string, price: string) => {
    setProductPrices(prev => ({
      ...prev,
      [productId]: price
    }));
  };

  const addProductAsTag = (productName: string) => {
    const currentTags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (!currentTags.includes(productName)) {
      const newTags = [...currentTags, productName].join(', ');
      setFormData(prev => ({ ...prev, tags: newTags }));
    }
    setShowProductSuggestions(false);
  };

  const updateContact = async () => {
    if (!contact) return;
    
    setLoading(true);
    try {
      // Update contact info
      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          email: formData.email.trim(),
          first_name: formData.firstName.trim() || null,
          last_name: formData.lastName.trim() || null,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
          status: formData.status,
        })
        .eq('id', contact.id);

      if (contactError) throw contactError;

      // Update products
      // First, remove all existing contact products
      const { error: deleteError } = await supabase
        .from('contact_products')
        .delete()
        .eq('contact_id', contact.id);

      if (deleteError) throw deleteError;

      // Then add selected products
      if (selectedProducts.size > 0) {
        const productInserts = Array.from(selectedProducts).map(productId => ({
          contact_id: contact.id,
          product_id: productId,
          price_paid: productPrices[productId] ? parseFloat(productPrices[productId]) : null
        }));

        const { error: insertError } = await supabase
          .from('contact_products')
          .insert(productInserts);

        if (insertError) throw insertError;
      }

      toast.success('Contact updated successfully');
      onContactUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the contact information and product purchases below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="customer, premium, newsletter"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Product Purchases</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Select products this contact has purchased and optionally set the price paid:
            </p>

            <ScrollArea className="h-80 border rounded-lg p-4">
              <div className="space-y-3">
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No products available. Add products in the Product Manager first.
                  </p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex flex-col space-y-2 p-3 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => handleProductToggle(product.id, product)}
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`product-${product.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {product.name}
                          </label>
                          <div className="text-xs text-muted-foreground">
                            {product.description && <div>{product.description}</div>}
                            <div className="flex items-center space-x-2 mt-1">
                              {product.price && (
                                <Badge variant="outline" className="text-xs">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  ${product.price}
                                </Badge>
                              )}
                              {product.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.category}
                                </Badge>
                              )}
                              {product.sku && (
                                <Badge variant="outline" className="text-xs">
                                  SKU: {product.sku}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {selectedProducts.has(product.id) && (
                        <div className="ml-6 pt-2 border-t">
                          <Label htmlFor={`price-${product.id}`} className="text-xs">
                            Price Paid (optional)
                          </Label>
                          <Input
                            id={`price-${product.id}`}
                            type="number"
                            step="0.01"
                            placeholder={product.price?.toString() || "0.00"}
                            value={productPrices[product.id] || ''}
                            onChange={(e) => handlePriceChange(product.id, e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {selectedProducts.size > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={updateContact} disabled={loading || !formData.email.trim()}>
            {loading ? 'Updating...' : 'Update Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};