import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagInput } from '@/components/ui/tag-input';
import { Plus, Edit, Trash2, ShoppingCart, User, Users, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EditContactDialog } from './EditContactDialog';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[] | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  sku: string | null;
}

interface EmailList {
  id: string;
  name: string;
  description: string | null;
}

interface ContactProduct {
  id: string;
  contact_id: string;
  product_id: string;
  purchased_at: string;
  price_paid: number | null;
  product: Product;
}

interface ContactList {
  id: string;
  contact_id: string;
  list_id: string;
  created_at: string;
  email_list: EmailList;
}

export const ContactManager: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactProducts, setContactProducts] = useState<ContactProduct[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [allContactProducts, setAllContactProducts] = useState<ContactProduct[]>([]);
  const [allContactLists, setAllContactLists] = useState<ContactList[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const [newContact, setNewContact] = useState({ email: '', first_name: '', last_name: '', tags: '' });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByProduct, setFilterByProduct] = useState<string>('');
  const [filterByList, setFilterByList] = useState<string>('');
  const [filterByPurchase, setFilterByPurchase] = useState<'all' | 'purchased' | 'not_purchased'>('all');
  const [bulkListId, setBulkListId] = useState<string>('');

  // Don't load data if user is not authenticated
  if (!user) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  // Load initial data when user is authenticated
  useEffect(() => {
    console.log('🔄 useEffect triggered, user:', user?.id);
    if (user?.id) {
      console.log('✅ User authenticated, loading data...');
      loadAllData();
    }
  }, [user?.id]); // Re-run when user.id changes

  // Load all data in parallel for better performance
  const loadAllData = async () => {
    try {
      console.log('🚀 Loading all data in parallel...');
      const startTime = performance.now();
      
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        loadContacts(),
        loadProducts(),
        loadEmailLists(),
        loadAllContactProducts(),
        loadAllContactLists(),
        loadAllTags()
      ]);
      
      // Log any failures but don't stop the entire process
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const functionNames = ['loadContacts', 'loadProducts', 'loadEmailLists', 'loadAllContactProducts', 'loadAllContactLists', 'loadAllTags'];
          console.error(`❌ ${functionNames[index]} failed:`, result.reason);
        }
      });
      
      const endTime = performance.now();
      console.log(`✅ All data loaded in ${Math.round(endTime - startTime)}ms`);
    } catch (error) {
      console.error('Error loading data in parallel:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    }
  };

  const loadContacts = async (page: number = 1, limit: number = 100) => {
    try {
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }

      console.log(`🔍 Loading contacts page ${page} for user:`, user.id);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count first
      const { count: totalCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'subscribed');

      // Load contacts with pagination
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'subscribed')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ Error loading contacts:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} contacts (page ${page}/${Math.ceil((totalCount || 0) / limit)})`);
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const loadProducts = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadEmailLists = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setEmailLists(data || []);
    } catch (error) {
      console.error('Error loading email lists:', error);
    }
  };

  const loadAllContactProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_products')
        .select(`
          *,
          product:products(*),
          contact:contacts(*)
        `);

      if (error) throw error;
      setAllContactProducts(data || []);
    } catch (error) {
      console.error('Error loading all contact products:', error);
    }
  };

  const loadAllContactLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          *,
          email_list:email_lists(*),
          contact:contacts(*)
        `);

      if (error) throw error;
      setAllContactLists(data || []);
    } catch (error) {
      console.error('Error loading all contact lists:', error);
    }
  };

  const loadAllTags = async () => {
    try {
      if (!user?.id) return;

      // Get tags from contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user.id);

      if (contactsError) throw contactsError;

      // Get tags from existing tag rules
      const { data: tagRules, error: rulesError } = await supabase
        .from('tag_rules')
        .select('trigger_tags, add_tags, remove_tags')
        .eq('user_id', user.id);

      if (rulesError) throw rulesError;

      // Combine all tags
      const allTagsSet = new Set<string>();
      
      // Add tags from contacts (normalized to lowercase)
      contacts?.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => allTagsSet.add(tag.toLowerCase().trim()));
        }
      });

      // Add tags from rules (normalized to lowercase)
      tagRules?.forEach(rule => {
        if (rule.trigger_tags) {
          rule.trigger_tags.forEach((tag: string) => allTagsSet.add(tag.toLowerCase().trim()));
        }
        if (rule.add_tags) {
          rule.add_tags.forEach((tag: string) => allTagsSet.add(tag.toLowerCase().trim()));
        }
        if (rule.remove_tags) {
          rule.remove_tags.forEach((tag: string) => allTagsSet.add(tag.toLowerCase().trim()));
        }
      });

      // Add product names as tag suggestions (normalized to lowercase)
      products.forEach(product => {
        allTagsSet.add(product.name.toLowerCase().trim());
        if (product.category) {
          allTagsSet.add(product.category.toLowerCase().trim());
        }
      });

      setAllTags(Array.from(allTagsSet).filter(Boolean).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadContactProducts = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('contact_products')
        .select(`
          *,
          product:products(*)
        `)
        .eq('contact_id', contactId);

      if (error) throw error;
      setContactProducts(data || []);
    } catch (error) {
      console.error('Error loading contact products:', error);
    }
  };

  const loadContactLists = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          *,
          email_list:email_lists(*)
        `)
        .eq('contact_id', contactId);

      if (error) throw error;
      setContactLists(data || []);
    } catch (error) {
      console.error('Error loading contact lists:', error);
    }
  };

  const addContact = async () => {
    if (!newContact.email) {
      toast.error('Email is required');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const tags = newContact.tags ? newContact.tags.split(',').map(t => t.toLowerCase().trim()).filter(t => t) : [];
      
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          user_id: user.id,
          email: newContact.email,
          first_name: newContact.first_name || null,
          last_name: newContact.last_name || null,
          tags: tags.length > 0 ? tags : null,
          status: 'subscribed'
        }])
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => [data, ...prev]);
      setNewContact({ email: '', first_name: '', last_name: '', tags: '' });
      setShowAddContact(false);
      loadAllTags(); // Refresh tags
      toast.success('Contact added successfully');
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    }
  };

  const addProductToContact = async (contactId: string, productId: string, pricePaid?: number) => {
    try {
      const { error } = await supabase
        .from('contact_products')
        .insert([{
          contact_id: contactId,
          product_id: productId,
          price_paid: pricePaid || null
        }]);

      if (error) throw error;

      await loadContactProducts(contactId);
      await loadAllContactProducts(); // Refresh global data
      toast.success('Product added to contact');
    } catch (error) {
      console.error('Error adding product to contact:', error);
      toast.error('Failed to add product to contact');
    }
  };

  const addContactToList = async (contactId: string, listId: string) => {
    try {
      const { error } = await supabase
        .from('contact_lists')
        .insert([{
          contact_id: contactId,
          list_id: listId
        }]);

      if (error) throw error;

      await loadContactLists(contactId);
      await loadAllContactLists(); // Refresh global data
      toast.success('Contact added to list');
    } catch (error) {
      console.error('Error adding contact to list:', error);
      toast.error('Failed to add contact to list');
    }
  };

  const removeProductFromContact = async (contactProductId: string) => {
    try {
      const { error } = await supabase
        .from('contact_products')
        .delete()
        .eq('id', contactProductId);

      if (error) throw error;

      setContactProducts(prev => prev.filter(cp => cp.id !== contactProductId));
      await loadAllContactProducts(); // Refresh global data
      toast.success('Product removed from contact');
    } catch (error) {
      console.error('Error removing product from contact:', error);
      toast.error('Failed to remove product from contact');
    }
  };

  const removeContactFromList = async (contactListId: string) => {
    try {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', contactListId);

      if (error) throw error;

      setContactLists(prev => prev.filter(cl => cl.id !== contactListId));
      await loadAllContactLists(); // Refresh global data
      toast.success('Contact removed from list');
    } catch (error) {
      console.error('Error removing contact from list:', error);
      toast.error('Failed to remove contact from list');
    }
  };

  const openContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    loadContactProducts(contact.id);
    loadContactLists(contact.id);
    setShowContactDetails(true);
  };

  // Filter contacts based on search query, product, list, and purchase status
  const filteredContacts = contacts.filter(contact => {
    // Search filter with improved tag matching
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      contact.email.toLowerCase().includes(searchLower) ||
      (contact.first_name && contact.first_name.toLowerCase().includes(searchLower)) ||
      (contact.last_name && contact.last_name.toLowerCase().includes(searchLower)) ||
      contact.tags?.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(searchLower) || 
               tagLower.split(' ').some(word => word.startsWith(searchLower)) ||
               tagLower.split(':').some(part => part.trim().startsWith(searchLower));
      });

    // Product filter
    const hasSpecificProduct = allContactProducts.some(cp => cp.contact_id === contact.id && cp.product_id === filterByProduct);
    const matchesProduct = filterByProduct === '' || hasSpecificProduct;

    // List filter
    const matchesList = filterByList === '' || 
      allContactLists.some(cl => cl.contact_id === contact.id && cl.list_id === filterByList);

    // Purchase status filter
    const hasAnyPurchase = allContactProducts.some(cp => cp.contact_id === contact.id);
    const matchesPurchase = filterByPurchase === 'all' ||
      (filterByPurchase === 'purchased' && hasAnyPurchase) ||
      (filterByPurchase === 'not_purchased' && !hasAnyPurchase);

    return matchesSearch && matchesProduct && matchesList && matchesPurchase;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Contact Management</h2>
        <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <TagInput
                  value={newContact.tags}
                  onChange={(value) => setNewContact(prev => ({ ...prev, tags: value }))}
                  suggestions={allTags}
                  placeholder="customer, premium, newsletter"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
                <Button onClick={addContact}>
                  Add Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Contacts</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-filter">Filter by Product</Label>
              <Select value={filterByProduct} onValueChange={setFilterByProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-filter">Filter by List</Label>
              <Select value={filterByList} onValueChange={setFilterByList}>
                <SelectTrigger>
                  <SelectValue placeholder="All Lists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Lists</SelectItem>
                  {emailLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-filter">Purchase Status</Label>
              <Select value={filterByPurchase} onValueChange={(v) => setFilterByPurchase(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="purchased">Has purchased</SelectItem>
                  <SelectItem value="not_purchased">Has not purchased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk add filtered to list */}
          <div className="mt-4 flex items-center gap-2">
            <Select value={bulkListId} onValueChange={setBulkListId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Select list to add filtered" />
              </SelectTrigger>
              <SelectContent>
                {emailLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={async () => {
                if (!bulkListId) return toast.error('Select a list first');
                const filteredIds = filteredContacts.map(c => c.id);
                const existingIds = allContactLists.filter(cl => cl.list_id === bulkListId).map(cl => cl.contact_id);
                const toAdd = filteredIds.filter(id => !existingIds.includes(id));
                if (toAdd.length === 0) return toast.error('No new contacts to add');
                try {
                  const rows = toAdd.map(id => ({ contact_id: id, list_id: bulkListId }));
                  const { error } = await supabase.from('contact_lists').insert(rows);
                  if (error) throw error;
                  await loadAllContactLists();
                  toast.success(`Added ${toAdd.length} contact(s) to list`);
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to add contacts');
                }
              }}
            >
              Add Filtered to List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Contacts ({filteredContacts.length} of {contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredContacts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {contacts.length === 0 ? 'No contacts found. Add your first contact above.' : 'No contacts match your current filters.'}
              </p>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => openContactDetails(contact)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {contact.first_name || contact.last_name 
                          ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                          : contact.email
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">{contact.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                     <Badge variant={contact.status === 'subscribed' ? 'default' : 'secondary'}>
                       {contact.status}
                     </Badge>
                     {contact.tags && contact.tags.length > 0 && (
                       <Badge variant="outline">
                         <Tag className="h-3 w-3 mr-1" />
                         {contact.tags.length}
                       </Badge>
                     )}
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         setEditingContact(contact);
                       }}
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
               ))
             )}
           </div>
         </CardContent>
       </Card>

      {/* Contact Details Dialog */}
      <Dialog open={showContactDetails} onOpenChange={setShowContactDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Contact Details: {selectedContact?.first_name || selectedContact?.last_name 
                ? `${selectedContact?.first_name || ''} ${selectedContact?.last_name || ''}`.trim()
                : selectedContact?.email
              }
            </DialogTitle>
          </DialogHeader>
          
          {selectedContact && (
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Products ({contactProducts.length})
                </TabsTrigger>
                <TabsTrigger value="lists">
                  <Users className="h-4 w-4 mr-2" />
                  Lists ({contactLists.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Purchased Products</h3>
                  <div className="flex space-x-2">
                    <Select onValueChange={(productId) => addProductToContact(selectedContact.id, productId)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(product => !contactProducts.some(cp => cp.product_id === product.id))
                          .map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${product.price || 0}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  {contactProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No products purchased yet. Add products to track this contact's purchase history.
                    </p>
                  ) : (
                    contactProducts.map((contactProduct) => (
                      <div key={contactProduct.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{contactProduct.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Purchased: {new Date(contactProduct.purchased_at).toLocaleDateString()}
                              {contactProduct.price_paid && ` • Paid: $${contactProduct.price_paid}`}
                              {contactProduct.product.category && ` • ${contactProduct.product.category}`}
                            </div>
                            {contactProduct.product.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {contactProduct.product.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductFromContact(contactProduct.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="lists" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Email Lists</h3>
                  <Select onValueChange={(listId) => addContactToList(selectedContact.id, listId)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add to List" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailLists
                        .filter(list => !contactLists.some(cl => cl.list_id === list.id))
                        .map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {contactLists.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Not in any email lists yet.
                    </p>
                  ) : (
                    contactLists.map((contactList) => (
                      <div key={contactList.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{contactList.email_list.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Added: {new Date(contactList.created_at).toLocaleDateString()}
                              {contactList.email_list.description && ` • ${contactList.email_list.description}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContactFromList(contactList.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <EditContactDialog
        contact={editingContact}
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        onContactUpdated={() => {
          loadContacts();
          loadAllContactProducts();
          if (selectedContact && editingContact?.id === selectedContact.id) {
            loadContactProducts(selectedContact.id);
          }
        }}
      />
    </div>
  );
};