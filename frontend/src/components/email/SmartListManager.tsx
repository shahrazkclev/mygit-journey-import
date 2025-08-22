
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
import { Trash2, Plus, List, Zap, Users, Tag, UserPlus } from "lucide-react";
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
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {list.list_type === 'dynamic' ? (
                        <Zap className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Users className="h-4 w-4 text-gray-600" />
                      )}
                      <h3 className="font-medium">{list.name}</h3>
                      <Badge variant={list.list_type === 'dynamic' ? 'default' : 'secondary'}>
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
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {list.list_type === 'dynamic' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshDynamicList(list)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
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
    </div>
  );
};
