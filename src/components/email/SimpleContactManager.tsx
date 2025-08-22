
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Tag, Users, Link } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  created_at: string;
}

export const SimpleContactManager = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

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
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, tagFilter]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        toast.error("Failed to load contacts");
        return;
      }

      setContacts(data || []);
      
      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(contact => {
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

      const { error } = await supabase
        .from('contacts')
        .insert({
          name: newContact.name,
          email: newContact.email,
          phone: newContact.phone,
          tags
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

  if (isLoading) {
    return <div className="p-6">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Make.com Integration Info */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-email-primary" />
            <span>Make.com Integration</span>
          </CardTitle>
          <CardDescription>
            Use this webhook URL in Make.com to automatically sync contacts from Google Sheets
          </CardDescription>
        </CardHeader>
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
              className="border-email-primary hover:bg-email-primary/10"
            >
              Copy
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p><strong>Expected JSON format:</strong></p>
            <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
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
      </Card>

      {/* Contacts Management */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-email-secondary" />
                <span>Contacts ({filteredContacts.length})</span>
              </CardTitle>
              <CardDescription>
                Manage your contacts with tag-based organization
              </CardDescription>
            </div>
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
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
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
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteContact(contact.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
    </div>
  );
};
