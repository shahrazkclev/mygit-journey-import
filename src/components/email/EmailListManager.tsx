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
import { Plus, Upload, Edit, Trash2, Users, Package, List, Search, Filter, Download, UserPlus, UserMinus, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContactFilter } from "./ContactFilter";

type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  sku?: string;
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
  contact_count?: number;
};

type ContactList = {
  id: string;
  contact_id: string;
  list_id: string;
  created_at: string;
};

export const EmailListManager = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<EmailList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contactProductMap, setContactProductMap] = useState<Record<string, string[]>>({});
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  
  // UI state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filteredContactIds, setFilteredContactIds] = useState<string[]>([]);
  
  // Form state
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
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
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;
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

      // Load contact-list relationships
      const { data: contactListsData, error: contactListsError } = await supabase
        .from('contact_lists')
        .select('*');

      if (contactListsError) throw contactListsError;

      // Calculate contact count for each list by querying database directly
      const listsWithCounts = await Promise.all((listsData || []).map(async (list) => {
        const { count } = await supabase
          .from('contact_lists')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);
        
        return {
          ...list,
          contact_count: count || 0
        };
      }));

      setLists(listsWithCounts);
      setContacts(contactsData || []);
      setContactLists(contactListsData || []);
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
              user_id: user?.id,
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

  const handleEditList = (list: EmailList) => {
    setEditingList(list);
    setNewListName(list.name);
    setNewListDescription(list.description || "");
  };

  const handleUpdateList = async () => {
    if (!editingList || !newListName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('email_lists')
        .update({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        })
        .eq('id', editingList.id)
        .select()
        .single();

      if (error) throw error;

      setLists(lists.map(l => l.id === editingList.id ? { ...data, contact_count: l.contact_count } : l));
      setEditingList(null);
      setNewListName("");
      setNewListDescription("");
      toast({
        title: "List updated",
        description: "Email list has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating list",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddContact = async () => {
    if (newContact.email.trim()) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert([
            {
              user_id: user?.id,
              email: newContact.email.trim(),
              first_name: newContact.firstName.trim() || null,
              last_name: newContact.lastName.trim() || null,
              tags: newContact.tags.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0),
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

  const handleEditContact = async (contact: Contact) => {
    setEditingContact(contact);
    setNewContact({
      email: contact.email,
      firstName: contact.first_name || "",
      lastName: contact.last_name || "",
      tags: (contact.tags || []).join(", "),
      status: contact.status,
    });
    
    // Load contact's products
    try {
      const { data, error } = await supabase
        .from('contact_products')
        .select('product_id')
        .eq('contact_id', contact.id);
      
      if (error) throw error;
      setSelectedProducts(data?.map(cp => cp.product_id) || []);
    } catch (error) {
      console.error('Error loading contact products:', error);
      setSelectedProducts([]);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      // Update contact info
      const { data, error } = await supabase
        .from('contacts')
        .update({
          email: newContact.email.trim(),
          first_name: newContact.firstName.trim() || null,
          last_name: newContact.lastName.trim() || null,
          tags: newContact.tags.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0),
          status: newContact.status,
        })
        .eq('id', editingContact.id)
        .select()
        .single();

      if (error) throw error;

      // Update contact products
      // First, remove all existing contact products
      const { error: deleteError } = await supabase
        .from('contact_products')
        .delete()
        .eq('contact_id', editingContact.id);

      if (deleteError) throw deleteError;

      // Then add selected products
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map(productId => ({
          contact_id: editingContact.id,
          product_id: productId,
        }));

        const { error: insertError } = await supabase
          .from('contact_products')
          .insert(productInserts);

        if (insertError) throw insertError;
      }

      setContacts(contacts.map(c => c.id === editingContact.id ? data : c));
      setEditingContact(null);
      setNewContact({ email: "", firstName: "", lastName: "", tags: "", status: "subscribed" });
      setSelectedProducts([]);
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


  // Contact list management functions
  const addContactsToList = async (contactIds: string[], listId: string) => {
    try {
      const newContactLists = contactIds.map(contactId => ({
        contact_id: contactId,
        list_id: listId,
      }));

      const { data, error } = await supabase
        .from('contact_lists')
        .insert(newContactLists)
        .select();

      if (error) throw error;

      setContactLists([...contactLists, ...data]);
      toast({
        title: "Contacts added to list",
        description: `Added ${contactIds.length} contact(s) to the list.`,
      });
      loadData(); // Refresh to update counts
    } catch (error: any) {
      toast({
        title: "Error adding contacts to list",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeContactFromList = async (contactId: string, listId: string) => {
    try {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('contact_id', contactId)
        .eq('list_id', listId);

      if (error) throw error;

      setContactLists(contactLists.filter(
        cl => !(cl.contact_id === contactId && cl.list_id === listId)
      ));
      toast({
        title: "Contact removed from list",
        description: "Contact has been removed from the list.",
      });
      loadData(); // Refresh to update counts
    } catch (error: any) {
      toast({
        title: "Error removing contact from list",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkAddToList = async () => {
    if (selectedContacts.length === 0 || !selectedList) return;
    
    // Filter out contacts that are already in the list
    const existingContactIds = contactLists
      .filter(cl => cl.list_id === selectedList.id)
      .map(cl => cl.contact_id);
    
    const newContactIds = selectedContacts.filter(id => !existingContactIds.includes(id));
    
    if (newContactIds.length === 0) {
      toast({
        title: "No new contacts to add",
        description: "All selected contacts are already in this list.",
        variant: "destructive",
      });
      return;
    }

    await addContactsToList(newContactIds, selectedList.id);
    setSelectedContacts([]);
    setSelectedList(null);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to delete.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedContacts.length} contact(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete contacts from the database
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', selectedContacts);

      if (error) {
        console.error('Error deleting contacts:', error);
        toast({
          title: "Error deleting contacts",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Also remove from contact_lists if they exist
      await supabase
        .from('contact_lists')
        .delete()
        .in('contact_id', selectedContacts);

      toast({
        title: "Contacts deleted successfully",
        description: `Successfully deleted ${selectedContacts.length} contact(s).`,
      });
      
      setSelectedContacts([]);
      loadData(); // Refresh the data
    } catch (error: any) {
      console.error('Error deleting contacts:', error);
      toast({
        title: "Error deleting contacts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const isContactInList = (contactId: string, listId: string) => {
    return contactLists.some(cl => cl.contact_id === contactId && cl.list_id === listId);
  };

  const getContactsInList = (listId: string) => {
    const contactIdsInList = contactLists
      .filter(cl => cl.list_id === listId)
      .map(cl => cl.contact_id);
    
    return contacts.filter(contact => contactIdsInList.includes(contact.id));
  };

  const getListContactsFiltered = (listId: string) => {
    const listContacts = getContactsInList(listId);
    return listContacts.filter(contact => {
      const matchesSearch = !listSearchQuery || 
        contact.email.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        contact.first_name?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(listSearchQuery.toLowerCase());
      
      return matchesSearch;
    });
  };

  // Filter contacts based on search, tag filters, and advanced filters
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      contact.email.toLowerCase().includes(searchLower) ||
      contact.first_name?.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.tags?.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(searchLower) || 
               tagLower.split(' ').some(word => word.startsWith(searchLower)) ||
               tagLower.split(':').some(part => part.trim().startsWith(searchLower));
      });
    
    const matchesTag = filterTag === "all" || 
      (contact.tags && contact.tags.includes(filterTag));
    
    const matchesAdvancedFilter = filteredContactIds.length === 0 || 
      filteredContactIds.includes(contact.id);
    
    return matchesSearch && matchesTag && matchesAdvancedFilter;
  });

  // Get lists that a contact belongs to
  const getContactLists = (contactId: string) => {
    const contactListIds = contactLists
      .filter(cl => cl.contact_id === contactId)
      .map(cl => cl.list_id);
    
    return lists.filter(list => contactListIds.includes(list.id));
  };

  // Get unique tags for filter
  const uniqueTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Lists</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-6">
          <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
            <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-email-secondary font-semibold">Contact Management</span>
                  </CardTitle>
                  <p className="text-sm text-email-secondary/80 mt-2">
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
                        <Button onClick={handleAddContact} disabled={!newContact.email.trim()}>
                          Add Contact
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Bulk Operations */}
              {selectedContacts.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 rounded-xl p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {selectedContacts.length} selected
                      </Badge>
                      <span className="text-sm font-medium text-blue-900">
                        Bulk Actions
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Select value={selectedList?.id || ""} onValueChange={(value) => {
                        const list = lists.find(l => l.id === value);
                        setSelectedList(list || null);
                      }}>
                        <SelectTrigger className="w-48 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm transition-all duration-200 hover:border-blue-300">
                          <SelectValue placeholder="Select list to add to" />
                        </SelectTrigger>
                        <SelectContent>
                          {lists.map(list => (
                            <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={handleBulkAddToList}
                        disabled={!selectedList}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBulkDelete}
                        className="border-red-300 text-red-700 hover:bg-red-50 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedContacts([])}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search and Filter Section */}
              <div className="bg-gradient-to-br from-email-background via-white to-email-muted/30 rounded-xl p-6 border border-email-primary/20 shadow-lg shadow-email-primary/10 mt-4">
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-email-primary to-email-accent rounded-full"></div>
                    <h3 className="text-lg font-semibold text-email-primary">Search & Filter</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="search-contacts" className="text-sm font-medium text-email-secondary flex items-center space-x-2">
                        <div className="w-2 h-2 bg-email-accent rounded-full"></div>
                        <span>Search Contacts</span>
                      </Label>
                      <Input
                        id="search-contacts"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="filter-tags" className="text-sm font-medium text-email-secondary flex items-center space-x-2">
                        <div className="w-2 h-2 bg-email-accent rounded-full"></div>
                        <span>Filter by Tag</span>
                      </Label>
                      <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger className="border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
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
                  </div>
                </div>
              </div>
                <ContactFilter
                  onFilterChange={setFilteredContactIds}
                  availableTags={uniqueTags}
                  availableLists={lists.map(l => ({ id: l.id, name: l.name }))}
                  allContacts={contacts.map(c => ({ id: c.id, tags: c.tags }))}
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedContacts.length === filteredContacts.length) {
                              setSelectedContacts([]);
                            } else {
                              setSelectedContacts(filteredContacts.map(c => c.id));
                            }
                          }}
                        >
                          {selectedContacts.length === filteredContacts.length && filteredContacts.length > 0 ? 
                            <CheckSquare className="h-4 w-4" /> : 
                            <Square className="h-4 w-4" />
                          }
                        </Button>
                      </TableHead>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleContactSelection(contact.id)}
                          >
                            {selectedContacts.includes(contact.id) ? 
                              <CheckSquare className="h-4 w-4" /> : 
                              <Square className="h-4 w-4" />
                            }
                          </Button>
                        </TableCell>
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
                          <div className="space-y-1">
                            <Badge variant={contact.status === 'subscribed' ? 'default' : 'secondary'}>
                              {contact.status}
                            </Badge>
                            <div className="flex flex-wrap gap-1">
                              {getContactLists(contact.id).map(list => (
                                <Badge key={list.id} variant="outline" className="text-xs">
                                  📋 {list.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
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


        <TabsContent value="lists" className="space-y-6">
          <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
            <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
                      <List className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-email-secondary font-semibold">Email Lists</span>
                  </CardTitle>
                  <p className="text-sm text-email-secondary/80 mt-2">
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
                  <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
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
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="link" className="p-0">
                                {list.contact_count || 0} contacts
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Manage Contacts in "{list.name}"</DialogTitle>
                                <DialogDescription>
                                  Add or remove contacts from this list.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="flex space-x-4">
                                  <Input
                                    placeholder="Search contacts in this list..."
                                    value={listSearchQuery}
                                    onChange={(e) => setListSearchQuery(e.target.value)}
                                    className="flex-1"
                                  />
                                </div>
                                
                                <div className="border rounded-lg max-h-96 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {getListContactsFiltered(list.id).map(contact => (
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
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => removeContactFromList(contact.id, list.id)}
                                            >
                                              <UserMinus className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {getListContactsFiltered(list.id).length === 0 && (
                                        <TableRow>
                                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No contacts in this list
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                                
                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-2">Add Contacts to List</h4>
                                   <div className="mb-4 p-3 bg-muted rounded-lg">
                                     <h5 className="text-sm font-medium mb-2">Smart Filtering</h5>
                                     <div className="grid grid-cols-3 gap-2">
                                       <Select>
                                         <SelectTrigger>
                                           <SelectValue placeholder="Product condition" />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="any">Any product</SelectItem>
                                           <SelectItem value="none">No products purchased</SelectItem>
                                           <SelectItem value="has_products">Has purchased products</SelectItem>
                                         </SelectContent>
                                       </Select>
                                       <Select>
                                         <SelectTrigger>
                                           <SelectValue placeholder="Status filter" />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="all">All statuses</SelectItem>
                                           <SelectItem value="subscribed">Subscribed only</SelectItem>
                                           <SelectItem value="unsubscribed">Unsubscribed only</SelectItem>
                                         </SelectContent>
                                       </Select>
                                       <Button 
                                         variant="outline" 
                                         size="sm"
                                         onClick={() => {
                                           // Add all filtered contacts to list
                                           const eligibleContacts = contacts
                                             .filter(contact => !isContactInList(contact.id, list.id))
                                             .slice(0, 50); // Limit for performance
                                           if (eligibleContacts.length > 0) {
                                             addContactsToList(eligibleContacts.map(c => c.id), list.id);
                                           }
                                         }}
                                       >
                                         <UserPlus className="h-4 w-4 mr-1" />
                                         Add Filtered
                                       </Button>
                                     </div>
                                     <p className="text-xs text-muted-foreground mt-2">
                                       Filter contacts by purchase history, status, or use "Add Filtered" to bulk add
                                     </p>
                                   </div>
                                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12"></TableHead>
                                          <TableHead>Contact</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Products</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {contacts
                                          .filter(contact => !isContactInList(contact.id, list.id))
                                          .slice(0, 10)
                                          .map(contact => (
                                          <TableRow key={contact.id}>
                                            <TableCell>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addContactsToList([contact.id], list.id)}
                                              >
                                                <UserPlus className="h-4 w-4" />
                                              </Button>
                                            </TableCell>
                                            <TableCell>
                                              <div>
                                                <div className="font-medium">{contact.email}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {contact.first_name} {contact.last_name}
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant={contact.status === 'subscribed' ? 'default' : 'secondary'}>
                                                {contact.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              <div className="text-xs text-muted-foreground">
                                                Products: {contactProductMap[contact.id]?.length || 0}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{list.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditList(list)}>
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
            
            <div className="border-t pt-4">
              <Label>Purchased Products</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select products this contact has purchased:
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No products available
                  </p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`product-${product.id}`} className="text-sm flex-1 cursor-pointer">
                        {product.name}
                        {product.price && (
                          <span className="text-muted-foreground ml-2">${product.price}</span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
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

      {/* Edit List Dialog */}
      <Dialog open={editingList !== null} onOpenChange={(open) => !open && setEditingList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email List</DialogTitle>
            <DialogDescription>
              Update the list information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editListName">List Name</Label>
              <Input
                id="editListName"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Newsletter Subscribers"
              />
            </div>
            <div>
              <Label htmlFor="editListDescription">Description</Label>
              <Textarea
                id="editListDescription"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="List description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingList(null);
              setNewListName("");
              setNewListDescription("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateList} disabled={!newListName.trim()}>
              Update List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};