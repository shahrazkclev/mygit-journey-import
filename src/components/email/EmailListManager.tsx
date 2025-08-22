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
import { DEMO_USER_ID } from "@/lib/demo-auth";

// Data types matching our Supabase schema

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
  const [lists, setLists] = useState<EmailList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  
  // UI state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  
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

      // Calculate contact count for each list
      const listsWithCounts = (listsData || []).map(list => ({
        ...list,
        contact_count: (contactListsData || []).filter(cl => cl.list_id === list.id).length
      }));

      setLists(listsWithCounts);
      setContacts(contactsData || []);
      setContactLists(contactListsData || []);
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
                        <Button onClick={handleAddContact} disabled={!newContact.email.trim()}>
                          Add Contact
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Bulk Operations */}
              {selectedContacts.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedContacts.length} contact(s) selected
                    </span>
                    <div className="flex space-x-2">
                      <Select value={selectedList?.id || ""} onValueChange={(value) => {
                        const list = lists.find(l => l.id === value);
                        setSelectedList(list || null);
                      }}>
                        <SelectTrigger className="w-48">
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
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedContacts([])}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  <Button onClick={handleCreateList} disabled={!newListName.trim()}>
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
                                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12"></TableHead>
                                          <TableHead>Contact</TableHead>
                                          <TableHead>Status</TableHead>
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