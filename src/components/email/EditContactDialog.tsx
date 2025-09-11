import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TagInput } from '@/components/ui/tag-input';
import { ShoppingCart, Trash2, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
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
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (isOpen && user?.id) {
      loadProducts();
      loadAllTags();
    }
  }, [isOpen, user?.id]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };

    if (showProductSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProductSuggestions]);

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

  const loadAllTags = async () => {
    try {
      // Get tags from contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user?.id);
      if (contactsError) throw contactsError;

      // Get tags from existing tag rules
      const { data: tagRules, error: rulesError } = await supabase
        .from('tag_rules')
        .select('trigger_tags, add_tags, remove_tags')
        .eq('user_id', user?.id);

      if (rulesError) throw rulesError;

      // Combine all tags
      const allTagsSet = new Set<string>();
      
      // Add tags from contacts
      contacts?.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
        }
      });

      // Add tags from rules
      tagRules?.forEach(rule => {
        if (rule.trigger_tags) {
          rule.trigger_tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
        }
        if (rule.add_tags) {
          rule.add_tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
        }
        if (rule.remove_tags) {
          rule.remove_tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
        }
      });

      // Get products for tag suggestions
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('name, category')
        .eq('user_id', user?.id);
      if (productsError) throw productsError;
      
      // Add product names as tag suggestions
      productsData?.forEach(product => {
        allTagsSet.add(product.name.trim());
        if (product.category) {
          allTagsSet.add(product.category.trim());
        }
      });

      const finalTags = Array.from(allTagsSet).filter(Boolean).sort();
      setAllTags(finalTags);
    } catch (error) {
      console.error('Error loading tags:', error);
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
          tags: formData.tags.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the contact information and product purchases below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6">
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
              <Label htmlFor="tags">Tags</Label>
              <TagInput
                value={formData.tags}
                onChange={(value) => setFormData({ ...formData, tags: value })}
                suggestions={allTags}
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