
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, List, Zap, Users, Tag, UserPlus, Edit, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

interface EmailList {
  id: string;
  name: string;
  description: string;
  list_type: 'static' | 'dynamic';
  rule_config: any;
  created_at: string;
  contact_count?: number;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  tags: string[];
}

export const SmartListManager = () => {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manage contacts state
  const [showManageContactsDialog, setShowManageContactsDialog] = useState(false);
  const [selectedListForManagement, setSelectedListForManagement] = useState<EmailList | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [listContacts, setListContacts] = useState<Contact[]>([]);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Set<string>>(new Set());
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  
  // Edit list state
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  const [editListForm, setEditListForm] = useState({
    name: '',
    description: '',
    list_type: 'static' as 'static' | 'dynamic',
    requiredTags: [] as string[],
    tagInput: ''
  });

  // Create list dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newList, setNewList] = useState({
    name: "",
    description: "",
    list_type: "static" as "static" | "dynamic",
    requiredTags: [] as string[],
    tagInput: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load lists with contact counts
      const { data: listsData, error: listsError } = await supabase
        .from('email_lists')
        .select(`
          *,
          contact_lists(count)
        `)
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error('Error loading lists:', listsError);
        toast.error("Failed to load lists");
        return;
      }

      // Process lists with contact counts and narrow types
      const processedLists: EmailList[] = (listsData || []).map((list: any) => ({
        id: list.id,
        name: list.name,
        description: list.description || "",
        list_type: list.list_type === 'dynamic' ? 'dynamic' : 'static',
        rule_config: list.rule_config ?? null,
        created_at: list.created_at,
        contact_count: list.contact_lists?.[0]?.count || 0,
      }));

      setLists(processedLists);

      // Load contacts for tag suggestions
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, tags')
        .eq('user_id', DEMO_USER_ID);

      if (contactsError) {
        console.error('Error loading contacts:', contactsError);
      } else {
        const uiContacts: Contact[] = (contactsData || []).map((c: any) => ({
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
          email: c.email,
          tags: c.tags ?? [],
        }));
        setContacts(uiContacts);
        
        // Extract all unique tags
        const tags = new Set<string>();
        uiContacts.forEach(contact => {
          contact.tags?.forEach((tag: string) => tags.add(tag));
        });
        setAllTags(Array.from(tags));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newList.name) {
      toast.error("List name is required");
      return;
    }

    try {
      let ruleConfig = null;
      
      if (newList.list_type === 'dynamic') {
        if (newList.requiredTags.length === 0) {
          toast.error("Dynamic lists require at least one tag rule");
          return;
        }
        ruleConfig = {
          requiredTags: newList.requiredTags
        };
      }

      const { data: listData, error: listError } = await supabase
        .from('email_lists')
        .insert({
          name: newList.name,
          description: newList.description,
          user_id: DEMO_USER_ID,
          list_type: newList.list_type,
          rule_config: ruleConfig
        })
        .select()
        .single();

      if (listError) {
        console.error('Error creating list:', listError);
        toast.error("Failed to create list");
        return;
      }

      // If it's a dynamic list, populate it immediately
      if (newList.list_type === 'dynamic' && ruleConfig) {
        await populateDynamicList(listData.id, ruleConfig);
      }

      toast.success("List created successfully!");
      setNewList({
        name: "",
        description: "",
        list_type: "static",
        requiredTags: [],
        tagInput: ""
      });
      setIsCreateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error("Failed to create list");
    }
  };

  const populateDynamicList = async (listId: string, ruleConfig: any) => {
    try {
      // Find contacts that match the rule
      const matchingContacts = contacts.filter(contact => {
        if (ruleConfig.requiredTags && Array.isArray(ruleConfig.requiredTags)) {
          return ruleConfig.requiredTags.some((tag: string) => 
            contact.tags?.includes(tag)
          );
        }
        return false;
      });

      // Add matching contacts to the list
      if (matchingContacts.length > 0) {
        const memberships = matchingContacts.map(contact => ({
          contact_id: contact.id,
          list_id: listId
        }));

        const { error } = await supabase
          .from('contact_lists')
          .upsert(memberships, { onConflict: 'contact_id,list_id' });

        if (error) {
          console.error('Error populating dynamic list:', error);
        } else {
          console.log(`Added ${matchingContacts.length} contacts to dynamic list`);
        }
      }
    } catch (error) {
      console.error('Error populating dynamic list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      // Delete list memberships first
      await supabase
        .from('contact_lists')
        .delete()
        .eq('list_id', listId);

      // Delete the list
      const { error } = await supabase
        .from('email_lists')
        .delete()
        .eq('id', listId);

      if (error) {
        console.error('Error deleting list:', error);
        toast.error("Failed to delete list");
        return;
      }

      toast.success("List deleted successfully!");
      loadData();
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error("Failed to delete list");
    }
  };

  const addTagToNewList = (tag: string) => {
    if (!newList.requiredTags.includes(tag)) {
      setNewList({
        ...newList,
        requiredTags: [...newList.requiredTags, tag],
        tagInput: ""
      });
    }
  };

  const removeTagFromNewList = (tagToRemove: string) => {
    setNewList({
      ...newList,
      requiredTags: newList.requiredTags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleRefreshDynamicList = async (list: EmailList) => {
    if (list.list_type !== 'dynamic' || !list.rule_config) return;

    try {
      // Clear existing memberships
      await supabase
        .from('contact_lists')
        .delete()
        .eq('list_id', list.id);

      // Repopulate with current data
      await populateDynamicList(list.id, list.rule_config);
      toast.success(`Refreshed ${list.name} with latest contacts`);
      loadData();
    } catch (error) {
      console.error('Error refreshing dynamic list:', error);
      toast.error("Failed to refresh list");
    }
  };

  const handleManageContacts = async (list: EmailList) => {
    setSelectedListForManagement(list);
    setShowManageContactsDialog(true);
    
    // Load all contacts
    const { data: allContactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, tags')
      .eq('user_id', DEMO_USER_ID);

    if (contactsError) {
      console.error('Error loading contacts:', contactsError);
      return;
    }

    // Load contacts already in this list
    const { data: listMemberships, error: membershipError } = await supabase
      .from('contact_lists')
      .select(`
        contact_id,
        contacts(id, first_name, last_name, email, tags)
      `)
      .eq('list_id', list.id);

    if (membershipError) {
      console.error('Error loading list memberships:', membershipError);
      return;
    }

    const processedContacts: Contact[] = (allContactsData || []).map((c: any) => ({
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
      email: c.email,
      tags: c.tags ?? [],
    }));

    const contactsInList = (listMemberships || [])
      .map((membership: any) => membership.contacts)
      .filter(Boolean)
      .map((c: any) => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
        email: c.email,
        tags: c.tags ?? [],
      }));

    const contactsInListIds = new Set(contactsInList.map(c => c.id));
    const availableForAddition = processedContacts.filter(c => !contactsInListIds.has(c.id));

    setAvailableContacts(availableForAddition);
    setListContacts(contactsInList);
  };

  const handleAddContactsToList = async () => {
    if (!selectedListForManagement || selectedContactsToAdd.size === 0) {
      return;
    }

    try {
      const memberships = Array.from(selectedContactsToAdd).map(contactId => ({
        contact_id: contactId,
        list_id: selectedListForManagement.id
      }));

      const { error } = await supabase
        .from('contact_lists')
        .upsert(memberships, { onConflict: 'contact_id,list_id' });

      if (error) throw error;

      toast.success(`Added ${selectedContactsToAdd.size} contacts to ${selectedListForManagement.name}`);
      setSelectedContactsToAdd(new Set());
      setShowManageContactsDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      toast.error("Failed to add contacts to list");
    }
  };

  const handleRemoveContactFromList = async (contactId: string) => {
    if (!selectedListForManagement) return;

    try {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('contact_id', contactId)
        .eq('list_id', selectedListForManagement.id);

      if (error) throw error;

      toast.success("Contact removed from list");
      // Refresh the contacts in this list
      handleManageContacts(selectedListForManagement);
    } catch (error) {
      console.error('Error removing contact from list:', error);
      toast.error("Failed to remove contact from list");
    }
  };

  const handleEditList = (list: EmailList) => {
    setEditingList(list);
    setEditListForm({
      name: list.name,
      description: list.description,
      list_type: list.list_type,
      requiredTags: list.rule_config?.requiredTags || [],
      tagInput: ''
    });
    setShowEditListDialog(true);
  };

  const handleUpdateList = async () => {
    if (!editingList || !editListForm.name.trim()) {
      toast.error("List name is required");
      return;
    }

    try {
      let ruleConfig = null;
      
      if (editListForm.list_type === 'dynamic') {
        if (editListForm.requiredTags.length === 0) {
          toast.error("Dynamic lists require at least one tag rule");
          return;
        }
        ruleConfig = {
          requiredTags: editListForm.requiredTags
        };
      }

      const { error } = await supabase
        .from('email_lists')
        .update({
          name: editListForm.name,
          description: editListForm.description,
          list_type: editListForm.list_type,
          rule_config: ruleConfig
        })
        .eq('id', editingList.id);

      if (error) throw error;

      // If it's a dynamic list and rules changed, repopulate it
      if (editListForm.list_type === 'dynamic' && ruleConfig) {
        await populateDynamicList(editingList.id, ruleConfig);
      }

      toast.success("List updated successfully!");
      setShowEditListDialog(false);
      setEditingList(null);
      loadData();
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error("Failed to update list");
    }
  };

  const handleDuplicateList = async (originalList: EmailList) => {
    try {
      const duplicateName = `${originalList.name} (Copy)`;
      
      // Create the duplicate as a static list
      const { data: newListData, error: createError } = await supabase
        .from('email_lists')
        .insert({
          name: duplicateName,
          description: `Static copy of ${originalList.name}`,
          user_id: DEMO_USER_ID,
          list_type: 'static',
          rule_config: null
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy all contacts from the original list
      const { data: originalContacts, error: fetchError } = await supabase
        .from('contact_lists')
        .select('contact_id')
        .eq('list_id', originalList.id);

      if (fetchError) throw fetchError;

      if (originalContacts && originalContacts.length > 0) {
        const memberships = originalContacts.map(contact => ({
          contact_id: contact.contact_id,
          list_id: newListData.id
        }));

        const { error: copyError } = await supabase
          .from('contact_lists')
          .insert(memberships);

        if (copyError) throw copyError;
      }

      toast.success(`Created static copy: ${duplicateName}`);
      loadData();
    } catch (error) {
      console.error('Error duplicating list:', error);
      toast.error("Failed to duplicate list");
    }
  };

  const addTagToEditList = (tag: string) => {
    if (!editListForm.requiredTags.includes(tag)) {
      setEditListForm({
        ...editListForm,
        requiredTags: [...editListForm.requiredTags, tag],
        tagInput: ""
      });
    }
  };

  const removeTagFromEditList = (tagToRemove: string) => {
    setEditListForm({
      ...editListForm,
      requiredTags: editListForm.requiredTags.filter(tag => tag !== tagToRemove)
    });
  };

  // Filter contacts based on search term
  const filteredAvailableContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    contact.tags.some(tag => tag.toLowerCase().includes(contactSearchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="p-6">Loading lists...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <List className="h-5 w-5 text-email-secondary" />
                <span className="text-email-secondary">Smart Lists ({lists.length})</span>
              </CardTitle>
              <CardDescription>
                Create static lists you control manually, or dynamic lists that auto-update based on tags
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-email-primary hover:bg-email-primary/80">
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New List</DialogTitle>
                  <DialogDescription>
                    Create a static list you manage manually, or a dynamic list that auto-updates
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="listName">List Name</Label>
                    <Input
                      id="listName"
                      value={newList.name}
                      onChange={(e) => setNewList({...newList, name: e.target.value})}
                      placeholder="e.g., Lazy Motion Library Buyers"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="listDescription">Description</Label>
                    <Textarea
                      id="listDescription"
                      value={newList.description}
                      onChange={(e) => setNewList({...newList, description: e.target.value})}
                      placeholder="Describe what this list is for..."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>List Type</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="static"
                          name="listType"
                          checked={newList.list_type === 'static'}
                          onChange={() => setNewList({...newList, list_type: 'static'})}
                        />
                        <Label htmlFor="static" className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Static List - I'll manage contacts manually</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="dynamic"
                          name="listType"
                          checked={newList.list_type === 'dynamic'}
                          onChange={() => setNewList({...newList, list_type: 'dynamic'})}
                        />
                        <Label htmlFor="dynamic" className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>Dynamic List - Auto-update based on tags</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {newList.list_type === 'dynamic' && (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                      <Label>Tag Rules</Label>
                      <p className="text-sm text-gray-600">
                        Contacts with any of these tags will automatically be added to this list
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <Input
                            value={newList.tagInput}
                            onChange={(e) => setNewList({...newList, tagInput: e.target.value})}
                            placeholder="Type a tag and press Enter"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newList.tagInput.trim()) {
                                addTagToNewList(newList.tagInput.trim());
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (newList.tagInput.trim()) {
                                addTagToNewList(newList.tagInput.trim());
                              }
                            }}
                            variant="outline"
                          >
                            Add
                          </Button>
                        </div>

                        {newList.requiredTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newList.requiredTags.map(tag => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeTagFromNewList(tag)}
                              >
                                {tag} ×
                              </Badge>
                            ))}
                          </div>
                        )}

                        {allTags.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Available Tags:</Label>
                            <div className="flex flex-wrap gap-1">
                              {allTags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="cursor-pointer text-xs hover:bg-blue-100"
                                  onClick={() => addTagToNewList(tag)}
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button onClick={handleCreateList} className="flex-1">
                      Create List
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lists.map(list => (
              <div
                key={list.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-email-muted/20 transition-colors border-email-primary/10"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {list.list_type === 'dynamic' ? (
                        <Zap className="h-4 w-4 text-email-accent" />
                      ) : (
                        <Users className="h-4 w-4 text-email-secondary" />
                      )}
                      <h3 className="font-medium text-email-primary">{list.name}</h3>
                      <Badge variant={list.list_type === 'dynamic' ? 'default' : 'secondary'} 
                             className={list.list_type === 'dynamic' ? 'bg-email-accent/20 text-email-accent' : 'bg-email-secondary/20 text-email-secondary'}>
                        {list.list_type}
                      </Badge>
                    </div>
                  </div>
                  {list.description && (
                    <p className="text-sm text-gray-600 mt-1">{list.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-500">
                      {list.contact_count || 0} contacts
                    </span>
                    {list.list_type === 'dynamic' && list.rule_config?.requiredTags && (
                      <div className="flex flex-wrap gap-1">
                        {list.rule_config.requiredTags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs border-email-accent/30 text-email-accent">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {list.list_type === 'static' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageContacts(list)}
                      className="border-email-primary text-email-primary hover:bg-email-primary/10"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditList(list)}
                    className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {list.list_type === 'dynamic' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshDynamicList(list)}
                        className="text-email-accent hover:text-email-accent/80 border-email-accent/30 hover:bg-email-accent/10"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateList(list)}
                        className="border-email-warning/50 text-email-warning hover:bg-email-warning/10"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteList(list.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {lists.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No lists created yet. Create your first list above!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manage Contacts Dialog */}
      <Dialog open={showManageContactsDialog} onOpenChange={setShowManageContactsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Contacts - {selectedListForManagement?.name}</DialogTitle>
            <DialogDescription>
              Add or remove contacts from this list
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-email-primary">Available Contacts</h3>
                {selectedContactsToAdd.size > 0 && (
                  <Badge variant="secondary" className="bg-email-accent/20 text-email-accent">
                    {selectedContactsToAdd.size} selected
                  </Badge>
                )}
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  placeholder="Search contacts by name, email, or tags..."
                  className="pl-10"
                />
              </div>
              
              <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-email-muted/10">
                {filteredAvailableContacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {contactSearchTerm ? "No contacts found matching search" : "All contacts are already in this list"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3 p-2 rounded hover:bg-email-primary/10">
                        <Checkbox
                          id={`add-${contact.id}`}
                          checked={selectedContactsToAdd.has(contact.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedContactsToAdd);
                            if (checked) {
                              newSelected.add(contact.id);
                            } else {
                              newSelected.delete(contact.id);
                            }
                            setSelectedContactsToAdd(newSelected);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`add-${contact.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {contact.name || 'No name'}
                          </label>
                          <div className="text-xs text-muted-foreground">{contact.email}</div>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contact.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedContactsToAdd.size > 0 && (
                <Button 
                  onClick={handleAddContactsToList}
                  className="w-full bg-email-primary hover:bg-email-primary/80"
                >
                  Add {selectedContactsToAdd.size} Contact{selectedContactsToAdd.size !== 1 ? 's' : ''} to List
                </Button>
              )}
            </div>

            {/* Contacts in List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-email-secondary">Contacts in List ({listContacts.length})</h3>
              
              <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-email-muted/10">
                {listContacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No contacts in this list yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {listContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-2 rounded hover:bg-email-secondary/10">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{contact.name || 'No name'}</div>
                          <div className="text-xs text-muted-foreground">{contact.email}</div>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contact.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContactFromList(contact.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManageContactsDialog(false);
                setSelectedContactsToAdd(new Set());
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={showEditListDialog} onOpenChange={setShowEditListDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>
              Modify list settings and rules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editListName">List Name</Label>
              <Input
                id="editListName"
                value={editListForm.name}
                onChange={(e) => setEditListForm({...editListForm, name: e.target.value})}
                placeholder="e.g., Lazy Motion Library Buyers"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editListDescription">Description</Label>
              <Textarea
                id="editListDescription"
                value={editListForm.description}
                onChange={(e) => setEditListForm({...editListForm, description: e.target.value})}
                placeholder="Describe what this list is for..."
              />
            </div>

            <div className="space-y-3">
              <Label>List Type</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="edit-static"
                    name="editListType"
                    checked={editListForm.list_type === 'static'}
                    onChange={() => setEditListForm({...editListForm, list_type: 'static'})}
                  />
                  <Label htmlFor="edit-static" className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Static List - I'll manage contacts manually</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="edit-dynamic"
                    name="editListType"
                    checked={editListForm.list_type === 'dynamic'}
                    onChange={() => setEditListForm({...editListForm, list_type: 'dynamic'})}
                  />
                  <Label htmlFor="edit-dynamic" className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Dynamic List - Auto-update based on tags</span>
                  </Label>
                </div>
              </div>
            </div>

            {editListForm.list_type === 'dynamic' && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                <Label>Tag Rules</Label>
                <p className="text-sm text-gray-600">
                  Contacts with any of these tags will automatically be added to this list
                </p>
                
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={editListForm.tagInput}
                      onChange={(e) => setEditListForm({...editListForm, tagInput: e.target.value})}
                      placeholder="Type a tag and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && editListForm.tagInput.trim()) {
                          addTagToEditList(editListForm.tagInput.trim());
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (editListForm.tagInput.trim()) {
                          addTagToEditList(editListForm.tagInput.trim());
                        }
                      }}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>

                  {editListForm.requiredTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editListForm.requiredTags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTagFromEditList(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}

                  {allTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Available Tags:</Label>
                      <div className="flex flex-wrap gap-1">
                        {allTags.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-blue-100"
                            onClick={() => addTagToEditList(tag)}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={handleUpdateList} className="flex-1">
                Update List
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditListDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
