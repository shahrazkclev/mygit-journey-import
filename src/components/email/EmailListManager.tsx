import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Edit, Trash2, Users, Package, List, Search, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

// Data types matching our Supabase schema
type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
};

type Contact = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  tags?: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

type EmailList = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export const EmailListManager = () => {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // UI state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  
  // Form state
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    category: "",
    description: ""
  });
  const [newContact, setNewContact] = useState({
    email: "",
    firstName: "",
    lastName: "",
    tags: "",
    status: "subscribed"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load email lists
      const { data: listsData, error: listsError } = await supabase
        .from('email_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      setLists(listsData || []);
      setContacts(contactsData || []);
      setProducts(productsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        });
        return;
      }
      handleUploadCSV(file);
    }
  };

  const handleUploadCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
        const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first'));
        const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('last'));
        
        if (emailIndex === -1) {
          toast({
            title: "Invalid CSV",
            description: "CSV must contain an email column.",
            variant: "destructive",
          });
          return;
        }

        const newContacts = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= headers.length && values[emailIndex]) {
            newContacts.push({
              email: values[emailIndex],
              first_name: firstNameIndex >= 0 ? values[firstNameIndex] : null,
              last_name: lastNameIndex >= 0 ? values[lastNameIndex] : null,
              status: 'subscribed',
            });
          }
        }

        if (newContacts.length > 0) {
          const { data, error } = await supabase
            .from('contacts')
            .insert(newContacts)
            .select();

          if (error) throw error;

          setContacts([...contacts, ...data]);
          toast({
            title: "CSV Import Successful",
            description: `Imported ${data.length} contacts.`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleCreateList = async () => {
    if (newListName.trim()) {
      try {
        const { data, error } = await supabase
          .from('email_lists')
          .insert([
            {
              user_id: DEMO_USER_ID,
              name: newListName.trim(),
              description: newListDescription.trim() || null,
            }
          ])
          .select()
          .single();

        if (error) throw error;

        setLists([...lists, data]);
        setNewListName("");
        setNewListDescription("");
        toast({
          title: "List created",
          description: `"${data.name}" has been created successfully.`,
        });
      } catch (error: any) {
        toast({
          title: "Error creating list",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('email_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      setLists(lists.filter(list => list.id !== listId));
      
      // Remove contact-list relationships
      await supabase
        .from('contact_lists')
        .delete()
        .eq('list_id', listId);

      toast({
        title: "List deleted",
        description: "The list has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting list",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = async () => {
    if (newProduct.name.trim()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([
            {
              user_id: DEMO_USER_ID,
              name: newProduct.name.trim(),
              price: newProduct.price || null,
              category: newProduct.category.trim() || null,
              description: newProduct.description.trim() || null,
            }
          ])
          .select()
          .single();

        if (error) throw error;

        setProducts([...products, data]);
        setNewProduct({ name: "", price: 0, category: "", description: "" });
        setIsAddingProduct(false);
        toast({
          title: "Product added",
          description: `"${data.name}" has been added to your catalog.`,
        });
      } catch (error: any) {
        toast({
          title: "Error adding product",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleAddContact = async () => {
    if (newContact.email.trim()) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert([
            {
              user_id: DEMO_USER_ID,
              email: newContact.email.trim(),
              first_name: newContact.firstName.trim() || null,
              last_name: newContact.lastName.trim() || null,
              tags: newContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
              status: newContact.status,
            }
          ])
          .select()
          .single();

        if (error) throw error;

        setContacts([...contacts, data]);
        setNewContact({ email: "", firstName: "", lastName: "", tags: "", status: "subscribed" });
        setIsAddingContact(false);
        toast({
          title: "Contact added",
          description: `"${data.email}" has been added to your contacts.`,
        });
      } catch (error: any) {
        toast({
          title: "Error adding contact",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setNewContact({
      email: contact.email,
      firstName: contact.first_name || "",
      lastName: contact.last_name || "",
      tags: (contact.tags || []).join(", "),
      status: contact.status,
    });
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          email: newContact.email.trim(),
          first_name: newContact.firstName.trim() || null,
          last_name: newContact.lastName.trim() || null,
          tags: newContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
          status: newContact.status,
        })
        .eq('id', editingContact.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(contacts.map(c => c.id === editingContact.id ? data : c));
      setEditingContact(null);
      setNewContact({ email: "", firstName: "", lastName: "", tags: "", status: "subscribed" });
      toast({
        title: "Contact updated",
        description: "Contact has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating contact",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setContacts(contacts.filter(c => c.id !== contactId));
      toast({
        title: "Contact deleted",
        description: "Contact has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting contact",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description || "",
    });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: newProduct.name.trim(),
          price: newProduct.price || null,
          category: newProduct.category.trim() || null,
          description: newProduct.description.trim() || null,
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      setProducts(products.map(p => p.id === editingProduct.id ? data : p));
      setEditingProduct(null);
      setNewProduct({ name: "", price: 0, category: "", description: "" });
      toast({
        title: "Product updated",
        description: "Product has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: "Product deleted",
        description: "Product has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter contacts based on search and filters
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery || 
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = filterTag === "all" || 
      (contact.tags && contact.tags.includes(filterTag));
    
    return matchesSearch && matchesTag;
  });

  // Get unique tags for filter
  const uniqueTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Lists</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Contact Management</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {contacts.length} total contacts
                  </p>
                </div>
                <div className="flex space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
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
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                            placeholder="contact@example.com"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={newContact.firstName}
                              onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                              placeholder="John"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={newContact.lastName}
                              onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                              placeholder="Doe"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="tags">Tags (comma-separated)</Label>
                          <Input
                            id="tags"
                            value={newContact.tags}
                            onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                            placeholder="customer, premium, newsletter"
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={newContact.status} onValueChange={(value) => setNewContact({...newContact, status: value})}>
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
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingContact(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddContact}>
                          Add Contact
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {uniqueTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contact.email}</div>
                            <div className="text-sm text-muted-foreground">
                              {contact.first_name} {contact.last_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(contact.tags || []).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.status === 'subscribed' ? 'default' : 'secondary'}>
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(contact.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditContact(contact)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Catalog</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {products.length} products in catalog
                  </p>
                </div>
                <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="productName">Product Name</Label>
                        <Input
                          id="productName"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="Premium Course"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                          placeholder="299"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          placeholder="Education"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          placeholder="Product description..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddProduct}>
                        Add Product
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>${product.price}</TableCell>
                        <TableCell className="text-muted-foreground">{product.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Email Lists</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lists.length} email lists
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="w-48"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    className="w-48"
                  />
                  <Button onClick={handleCreateList}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lists.map(list => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell className="text-muted-foreground">{list.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteList(list.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Contact Dialog */}
      <Dialog open={editingContact !== null} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the contact information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                placeholder="contact@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editTags">Tags (comma-separated)</Label>
              <Input
                id="editTags"
                value={newContact.tags}
                onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                placeholder="customer, premium, newsletter"
              />
            </div>
            <div>
              <Label htmlFor="editStatus">Status</Label>
              <Select value={newContact.status} onValueChange={(value) => setNewContact({...newContact, status: value})}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContact}>
              Update Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editProductName">Product Name</Label>
              <Input
                id="editProductName"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="Premium Course"
              />
            </div>
            <div>
              <Label htmlFor="editPrice">Price</Label>
              <Input
                id="editPrice"
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                placeholder="299"
              />
            </div>
            <div>
              <Label htmlFor="editCategory">Category</Label>
              <Input
                id="editCategory"
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                placeholder="Education"
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                placeholder="Product description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct}>
              Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};