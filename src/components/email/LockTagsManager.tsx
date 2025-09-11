import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Trash2, Plus, Lock, Unlock, Edit } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface LockedTag {
  id: string;
  tag: string;
  password: string;
  isEditing?: boolean;
}

export const LockTagsManager = () => {
  const { user } = useAuth();
  const [lockedTags, setLockedTags] = useState<LockedTag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newLock, setNewLock] = useState({
    tags: [] as string[],
    password: ""
  });
  const [editLock, setEditLock] = useState({
    tags: [] as string[],
    password: ""
  });

  useEffect(() => {
    if (user?.id) {
      loadLockedTags();
      loadAllTags();
    }
  }, [user?.id]);

  const loadLockedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .select('id, add_tags, password')
        .eq('user_id', user?.id)
        .eq('protected', true)
        .not('add_tags', 'is', null);

      if (error) throw error;

      // Group by rule for editing
      const ruleGroups: { [key: string]: LockedTag } = {};
      data?.forEach(rule => {
        if (rule.add_tags && rule.add_tags.length > 0) {
          ruleGroups[rule.id] = {
            id: rule.id,
            tag: rule.add_tags.join(', '),
            password: rule.password || ''
          };
        }
      });

      setLockedTags(Object.values(ruleGroups));
    } catch (error) {
      console.error('Error loading locked tags:', error);
      toast.error('Failed to load locked tags');
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

      // Get products for tag suggestions
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('name, category')
        .eq('user_id', user?.id);

      if (productsError) throw productsError;

      // Combine all tags
      const allTagsSet = new Set<string>();
      
      contacts?.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
        }
      });

      // Add product names as tag suggestions
      products?.forEach(product => {
        allTagsSet.add(product.name.trim());
        if (product.category) {
          allTagsSet.add(product.category.trim());
        }
      });

      setAllTags(Array.from(allTagsSet).filter(Boolean).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleCreateLock = async () => {
    if (newLock.tags.length === 0 || !newLock.password) {
      toast.error('Please select tags and enter a password');
      return;
    }

    try {
      // Create a new tag rule for each locked tag
      for (const tag of newLock.tags) {
        const normalizedTag = tag.toLowerCase().trim();
        const { error } = await supabase
          .from('tag_rules')
          .insert({
            user_id: user?.id,
            name: `Lock: ${normalizedTag}`,
            description: `Password protection for tag: ${normalizedTag}`,
            trigger_tag: 'never-trigger', // Will never match
            trigger_tags: ['never-trigger'],
            add_tags: [normalizedTag],
            remove_tags: [],
            replace_all_tags: false,
            protected: true,
            password: newLock.password,
            enabled: true
          });

        if (error) throw error;
      }

      toast.success('Tags locked successfully');
      setNewLock({ tags: [], password: "" });
      setIsCreating(false);
      loadLockedTags();
    } catch (error) {
      console.error('Error locking tags:', error);
      toast.error('Failed to lock tags');
    }
  };

  const unlockTag = async (lockedTag: LockedTag) => {
    if (!confirm(`Are you sure you want to unlock the tag "${lockedTag.tag}"?`)) return;

    try {
      const { error } = await supabase
        .from('tag_rules')
        .delete()
        .eq('id', lockedTag.id);

      if (error) throw error;

      toast.success(`Tag "${lockedTag.tag}" unlocked successfully`);
      loadLockedTags();
    } catch (error) {
      console.error('Error unlocking tag:', error);
      toast.error('Failed to unlock tag');
    }
  };

  const startEditing = (lockedTag: LockedTag) => {
    setEditingTag(lockedTag.id);
    setEditLock({
      tags: lockedTag.tag.split(',').map(t => t.trim()).filter(Boolean),
      password: lockedTag.password
    });
  };

  const handleUpdateLock = async (ruleId: string) => {
    if (editLock.tags.length === 0 || !editLock.password) {
      toast.error('Please select tags and enter a password');
      return;
    }

    try {
      const { error } = await supabase
        .from('tag_rules')
        .update({
          add_tags: editLock.tags,
          password: editLock.password
        })
        .eq('id', ruleId);

      if (error) throw error;

      toast.success('Locked tags updated successfully');
      setEditingTag(null);
      loadLockedTags();
    } catch (error) {
      console.error('Error updating locked tags:', error);
      toast.error('Failed to update locked tags');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Lock Tags</h2>
          <p className="text-sm text-muted-foreground">
            Password protect specific tags. Protected tags can only be added via API/forms with the correct password.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Lock Tags
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Lock Tags with Password</CardTitle>
            <CardDescription>
              Select tags to protect with a password. These tags will require the password to be added via API/forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="tags-to-lock">Tags to Lock</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const uniqueTags = Array.from(new Set([...newLock.tags, ...allTags]));
                    setNewLock({ ...newLock, tags: uniqueTags });
                  }}
                  className="h-auto py-1 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add All
                </Button>
              </div>
              <TagInput
                value={newLock.tags.join(', ')}
                onChange={(value) => setNewLock({ ...newLock, tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                suggestions={allTags}
                placeholder="e.g., premium, vip, admin"
              />
              <p className="text-xs text-muted-foreground mt-1">
                These tags will require a password to be added to contacts
              </p>
            </div>
            <div>
              <Label htmlFor="lock-password">Password</Label>
              <Input
                id="lock-password"
                type="password"
                placeholder="Enter password to protect these tags"
                value={newLock.password}
                onChange={(e) => setNewLock({ ...newLock, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This password will be required when adding these tags via API or forms.
              </p>
            </div>
          </CardContent>
          <div className="flex gap-2 p-6 pt-0">
            <Button onClick={handleCreateLock}>Lock Tags</Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {lockedTags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Locked Tags</h3>
              <p className="text-muted-foreground text-center mb-4">
                Lock tags with passwords to control who can add them to contacts via API or forms.
              </p>
              <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Lock First Tag
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Locked Tags ({lockedTags.length})
              </CardTitle>
              <CardDescription>
                These tags are password protected and require authentication to add via API/forms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lockedTags.map((lockedTag) => (
                  <div key={lockedTag.id} className="border rounded-lg p-4">
                    {editingTag === lockedTag.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Tags</Label>
                          <TagInput
                            value={editLock.tags.join(', ')}
                            onChange={(value) => setEditLock({ ...editLock, tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                            suggestions={allTags}
                            placeholder="Select tags to lock"
                          />
                        </div>
                        <div>
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={editLock.password}
                            onChange={(e) => setEditLock({ ...editLock, password: e.target.value })}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateLock(lockedTag.id)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTag(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Lock className="h-4 w-4" />
                          {lockedTag.tag.split(',').map((tag, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(lockedTag)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unlockTag(lockedTag)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};