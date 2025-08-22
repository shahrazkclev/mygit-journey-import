import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Tag, Users, Link, ChevronDown, ChevronRight, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { EditContactDialog } from "./EditContactDialog";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  created_at: string;
}

// Match DB schema for contacts
interface DbContact {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[] | null;
}

export const SimpleContactManager = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isMakeIntegrationOpen, setIsMakeIntegrationOpen] = useState(false);
  
  // Bulk operations state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const [showBulkListDialog, setShowBulkListDialog] = useState(false);
  const [bulkTags, setBulkTags] = useState('');
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState('');
  const [emailLists, setEmailLists] = useState<any[]>([]);
  const [selectedBulkLists, setSelectedBulkLists] = useState<string[]>([]);
  const [selectedBulkListsToRemove, setSelectedBulkListsToRemove] = useState<string[]>([]);
  const [bulkTagOperation, setBulkTagOperation] = useState<'add' | 'remove'>('add');
  const [bulkListOperation, setBulkListOperation] = useState<'add' | 'remove'>('add');

  // Edit contact state
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Contact lists tracking
  const [contactLists, setContactLists] = useState<Record<string, any[]>>({});

  // Add contact form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    tags: ""
  });

  // Make.com webhook URL
  const [webhookUrl] = useState(() => 
    `https://mixifcnokcmxarpzwfiy.supabase.co/functions/v1/sync-contacts`
  );

  useEffect(() => {
    loadContacts();
    loadEmailLists();
    loadContactLists();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, tagFilter]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, user_id, created_at, updated_at, email, first_name, last_name, status, tags')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        toast.error("Failed to load contacts");
        return;
      }

      const dbContacts: DbContact[] = data || [];
      // Map DB rows to UI shape
      const uiContacts: Contact[] = dbContacts.map(c => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
        email: c.email,
        phone: "", // No phone column in DB; keep UI consistent
        tags: c.tags ?? [],
        created_at: c.created_at,
      }));

      setContacts(uiContacts);
      
      // Extract all unique tags from DB rows
      const tags = new Set<string>();
      dbContacts.forEach(contact => {
        contact.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailLists = async () => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading email lists:', error);
        return;
      }

      setEmailLists(data || []);
    } catch (error) {
      console.error('Error loading email lists:', error);
    }
  };

  const loadContactLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          contact_id,
          email_lists!inner(id, name, list_type)
        `);

      if (error) {
        console.error('Error loading contact lists:', error);
        return;
      }

      // Group lists by contact ID
      const contactListsMap: Record<string, any[]> = {};
      data?.forEach((item: any) => {
        if (!contactListsMap[item.contact_id]) {
          contactListsMap[item.contact_id] = [];
        }
        contactListsMap[item.contact_id].push(item.email_lists);
      });

      setContactLists(contactListsMap);
    } catch (error) {
      console.error('Error loading contact lists:', error);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm)
      );
    }

    if (tagFilter) {
      filtered = filtered.filter(contact =>
        contact.tags?.some(tag => 
          tag.toLowerCase().includes(tagFilter.toLowerCase())
        )
      );
    }

    setFilteredContacts(filtered);
  };

  const handleAddContact = async () => {
    if (!newContact.email) {
      toast.error("Email is required");
      return;
    }

    try {
      const tags = newContact.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Split name into first_name and last_name
      const nameTrimmed = (newContact.name || "").trim();
      const [firstName, ...rest] = nameTrimmed.split(/\s+/);
      const lastName = rest.join(" ");

      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: DEMO_USER_ID,
          email: newContact.email,
          first_name: firstName || null,
          last_name: lastName || null,
          // status will default to 'subscribed' on DB
          tags: tags.length ? tags : null
        });

      if (error) {
        console.error('Error adding contact:', error);
        toast.error("Failed to add contact");
        return;
      }

      toast.success("Contact added successfully!");
      setNewContact({ name: "", email: "", phone: "", tags: "" });
      setIsAddDialogOpen(false);
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error("Failed to add contact");
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Error deleting contact:', error);
        toast.error("Failed to delete contact");
        return;
      }

      toast.success("Contact deleted successfully!");
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error("Failed to delete contact");
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard!");
  };

  const handleSelectContact = (contactId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (isSelected) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Please select contacts");
      return;
    }

    if (bulkTagOperation === 'add' && !bulkTags.trim()) {
      toast.error("Please enter tags to add");
      return;
    }

    if (bulkTagOperation === 'remove' && !bulkTagsToRemove.trim()) {
      toast.error("Please enter tags to remove");
      return;
    }

    try {
      if (bulkTagOperation === 'add') {
        const tagsToAdd = bulkTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        for (const contactId of selectedContacts) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            const existingTags = contact.tags || [];
            const newTags = [...new Set([...existingTags, ...tagsToAdd])];
            
            const { error } = await supabase
              .from('contacts')
              .update({ tags: newTags })
              .eq('id', contactId);

            if (error) throw error;
          }
        }
        toast.success(`Added tags to ${selectedContacts.size} contacts`);
      } else {
        const tagsToRemove = bulkTagsToRemove.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        for (const contactId of selectedContacts) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            const existingTags = contact.tags || [];
            const newTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
            
            const { error } = await supabase
              .from('contacts')
              .update({ tags: newTags })
              .eq('id', contactId);

            if (error) throw error;
          }
        }
        toast.success(`Removed tags from ${selectedContacts.size} contacts`);
      }

      setBulkTags('');
      setBulkTagsToRemove('');
      setSelectedContacts(new Set());
      setShowBulkTagDialog(false);
      loadContacts();
    } catch (error) {
      console.error('Error managing bulk tags:', error);
      toast.error("Failed to manage tags");
    }
  };

  const handleBulkAddToLists = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Please select contacts");
      return;
    }

    const listsToProcess = bulkListOperation === 'add' ? selectedBulkLists : selectedBulkListsToRemove;
    
    if (listsToProcess.length === 0) {
      toast.error(`Please select lists to ${bulkListOperation}`);
      return;
    }

    try {
      if (bulkListOperation === 'add') {
        const memberships = [];
        for (const contactId of selectedContacts) {
          for (const listId of selectedBulkLists) {
            memberships.push({
              contact_id: contactId,
              list_id: listId
            });
          }
        }

        const { error } = await supabase
          .from('contact_lists')
          .upsert(memberships, { onConflict: 'contact_id,list_id' });

        if (error) throw error;
        toast.success(`Added ${selectedContacts.size} contacts to ${selectedBulkLists.length} lists`);
      } else {
        // Remove from lists
        for (const contactId of selectedContacts) {
          for (const listId of selectedBulkListsToRemove) {
            const { error } = await supabase
              .from('contact_lists')
              .delete()
              .eq('contact_id', contactId)
              .eq('list_id', listId);

            if (error) throw error;
          }
        }
        toast.success(`Removed ${selectedContacts.size} contacts from ${selectedBulkListsToRemove.length} lists`);
      }

      setSelectedBulkLists([]);
      setSelectedBulkListsToRemove([]);
      setSelectedContacts(new Set());
      setShowBulkListDialog(false);
    } catch (error) {
      console.error('Error managing contacts in lists:', error);
      toast.error("Failed to manage contacts in lists");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Make.com Integration Info */}
      <Card className="shadow-soft border-email-primary/20 bg-gradient-to-br from-email-background to-background">
        <Collapsible open={isMakeIntegrationOpen} onOpenChange={setIsMakeIntegrationOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-email-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Link className="h-5 w-5 text-email-primary" />
                  <span className="text-email-primary">Make.com Integration</span>
                </div>
                {isMakeIntegrationOpen ? (
                  <ChevronDown className="h-4 w-4 text-email-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-email-primary" />
                )}
              </CardTitle>
              <CardDescription>
                Use this webhook URL in Make.com to automatically sync contacts from Google Sheets
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="border-email-primary/30"
                />
                <Button
                  onClick={copyWebhookUrl}
                  variant="outline"
                  className="border-email-primary hover:bg-email-primary/10 text-email-primary"
                >
                  Copy
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Expected JSON format:</strong></p>
                <pre className="bg-email-muted/30 p-2 rounded text-xs mt-2 border border-email-primary/10">
{`{
  "email": "customer@example.com",
  "name": "John Doe",
  "phone": "+1234567890", 
  "tags": ["customer", "premium", "lazy-motion-library"],
  "action": "create"
}`}
                </pre>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Contacts Management */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-email-secondary" />
                <span className="text-email-secondary">Contacts ({filteredContacts.length})</span>
                {selectedContacts.size > 0 && (
                  <Badge variant="secondary" className="bg-email-accent/20 text-email-accent">
                    {selectedContacts.size} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your contacts with tag-based organization
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {selectedContacts.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkTagDialog(true)}
                    className="border-email-accent text-email-accent hover:bg-email-accent/10"
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    Manage Tags
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkListDialog(true)}
                    className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Manage Lists
                  </Button>
                </>
              )}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-email-primary hover:bg-email-primary/80">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Add a new contact with tags for better organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={newContact.tags}
                        onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                        placeholder="customer, premium, lazy-motion-library"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleAddContact} className="flex-1">
                        Add Contact
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Available Tags */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Tags:</Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-email-accent/10"
                    onClick={() => setTagFilter(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="space-y-2">
            {filteredContacts.length > 0 && (
              <div className="flex items-center p-3 bg-email-muted/30 rounded-lg border border-email-primary/10">
                <input
                  type="checkbox"
                  checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                />
                <Label className="ml-3 text-sm font-medium text-email-primary cursor-pointer">
                  Select All ({filteredContacts.length})
                </Label>
              </div>
            )}
            
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-email-muted/20 transition-colors ${
                  selectedContacts.has(contact.id) ? 'bg-email-primary/10 border-email-primary/30' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                    className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{contact.name || 'No name'}</p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                        {contact.phone && (
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        )}
                      </div>
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-email-accent/20 text-email-accent">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {contactLists[contact.id] && contactLists[contact.id].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-gray-500 mr-1">Lists:</span>
                        {contactLists[contact.id].map(list => (
                          <Badge key={list.id} variant="outline" className="text-xs border-email-secondary/30 text-email-secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {list.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingContact(contact);
                      setShowEditContactDialog(true);
                    }}
                    className="text-email-primary hover:text-email-primary/80 hover:bg-email-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No contacts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Add Tags Dialog */}
      <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags for Selected Contacts</DialogTitle>
            <DialogDescription>
              Add or remove tags for {selectedContacts.size} selected contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Operation</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="add-tags"
                    name="tagOperation"
                    checked={bulkTagOperation === 'add'}
                    onChange={() => setBulkTagOperation('add')}
                  />
                  <Label htmlFor="add-tags">Add Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="remove-tags"
                    name="tagOperation"
                    checked={bulkTagOperation === 'remove'}
                    onChange={() => setBulkTagOperation('remove')}
                  />
                  <Label htmlFor="remove-tags">Remove Tags</Label>
                </div>
              </div>
            </div>
            
            {bulkTagOperation === 'add' ? (
              <div className="space-y-2">
                <Label htmlFor="bulkTags">Tags to Add (comma-separated)</Label>
                <Input
                  id="bulkTags"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  placeholder="premium, newsletter, product-customer"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bulkTagsRemove">Tags to Remove (comma-separated)</Label>
                <Input
                  id="bulkTagsRemove"
                  value={bulkTagsToRemove}
                  onChange={(e) => setBulkTagsToRemove(e.target.value)}
                  placeholder="premium, newsletter, product-customer"
                />
              </div>
            )}
            
            {allTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Available Tags:</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-email-accent/10 border-email-accent/30"
                      onClick={() => {
                        if (bulkTagOperation === 'add') {
                          const currentTags = bulkTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          if (!currentTags.includes(tag)) {
                            setBulkTags(currentTags.length > 0 ? `${bulkTags}, ${tag}` : tag);
                          }
                        } else {
                          const currentTags = bulkTagsToRemove.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          if (!currentTags.includes(tag)) {
                            setBulkTagsToRemove(currentTags.length > 0 ? `${bulkTagsToRemove}, ${tag}` : tag);
                          }
                        }
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex space-x-2">
              <Button onClick={handleBulkAddTags} className="flex-1 bg-email-accent hover:bg-email-accent/80">
                {bulkTagOperation === 'add' ? 'Add Tags' : 'Remove Tags'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkTagDialog(false);
                  setBulkTags('');
                  setBulkTagsToRemove('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add to Lists Dialog */}
      <Dialog open={showBulkListDialog} onOpenChange={setShowBulkListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Contacts in Lists</DialogTitle>
            <DialogDescription>
              Add or remove {selectedContacts.size} selected contacts from email lists
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Operation</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="add-to-lists"
                    name="listOperation"
                    checked={bulkListOperation === 'add'}
                    onChange={() => setBulkListOperation('add')}
                  />
                  <Label htmlFor="add-to-lists">Add to Lists</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="remove-from-lists"
                    name="listOperation"
                    checked={bulkListOperation === 'remove'}
                    onChange={() => setBulkListOperation('remove')}
                  />
                  <Label htmlFor="remove-from-lists">Remove from Lists</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Select Lists:</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {emailLists.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No email lists found. Create some lists first.
                  </p>
                ) : (
                  emailLists
                    .filter(list => {
                      if (bulkListOperation === 'remove') {
                        // For remove, only show lists that at least one selected contact is in
                        return Array.from(selectedContacts).some(contactId => 
                          contactLists[contactId]?.some(cl => cl.id === list.id)
                        );
                      }
                      return true; // For add, show all lists
                    })
                    .map(list => {
                      const isContactInList = Array.from(selectedContacts).some(contactId => 
                        contactLists[contactId]?.some(cl => cl.id === list.id)
                      );
                      const isDisabled = bulkListOperation === 'add' && isContactInList;
                      
                      return (
                        <div key={list.id} className={`flex items-center space-x-3 ${isDisabled ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            id={`bulk-list-${bulkListOperation}-${list.id}`}
                            disabled={isDisabled}
                            checked={
                              bulkListOperation === 'add' 
                                ? selectedBulkLists.includes(list.id)
                                : selectedBulkListsToRemove.includes(list.id)
                            }
                            onChange={(e) => {
                              if (bulkListOperation === 'add') {
                                if (e.target.checked) {
                                  setSelectedBulkLists([...selectedBulkLists, list.id]);
                                } else {
                                  setSelectedBulkLists(selectedBulkLists.filter(id => id !== list.id));
                                }
                              } else {
                                if (e.target.checked) {
                                  setSelectedBulkListsToRemove([...selectedBulkListsToRemove, list.id]);
                                } else {
                                  setSelectedBulkListsToRemove(selectedBulkListsToRemove.filter(id => id !== list.id));
                                }
                              }
                            }}
                            className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                          />
                          <Label htmlFor={`bulk-list-${bulkListOperation}-${list.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{list.name}</div>
                            {list.description && (
                              <div className="text-sm text-muted-foreground">{list.description}</div>
                            )}
                            <div className="text-xs text-email-secondary">
                              {list.list_type === 'dynamic' ? 'Dynamic' : 'Static'} List
                              {isDisabled && ' (Already added)'}
                            </div>
                          </Label>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleBulkAddToLists} 
                className="flex-1 bg-email-secondary hover:bg-email-secondary/80"
                disabled={
                  (bulkListOperation === 'add' && selectedBulkLists.length === 0) || 
                  (bulkListOperation === 'remove' && selectedBulkListsToRemove.length === 0) ||
                  emailLists.length === 0
                }
              >
                {bulkListOperation === 'add' ? 'Add to Lists' : 'Remove from Lists'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkListDialog(false);
                  setSelectedBulkLists([]);
                  setSelectedBulkListsToRemove([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      {editingContact && (
        <EditContactDialog
          contact={{
            id: editingContact.id,
            email: editingContact.email,
            first_name: editingContact.name.split(' ')[0] || '',
            last_name: editingContact.name.split(' ').slice(1).join(' ') || null,
            status: 'subscribed', // default status
            tags: editingContact.tags
          }}
          isOpen={showEditContactDialog}
          onClose={() => {
            setShowEditContactDialog(false);
            setEditingContact(null);
          }}
          onContactUpdated={() => {
            loadContacts();
            setShowEditContactDialog(false);
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
};
