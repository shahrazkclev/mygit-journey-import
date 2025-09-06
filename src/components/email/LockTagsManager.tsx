import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Trash2, Plus, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface LockedTag {
  id: string;
  tag: string;
  password: string;
}

export const LockTagsManager = () => {
  const [lockedTags, setLockedTags] = useState<LockedTag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newLock, setNewLock] = useState({
    tags: [] as string[],
    password: ""
  });

  useEffect(() => {
    loadLockedTags();
    loadAllTags();
  }, []);

  const loadLockedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .select('id, add_tags, password')
        .eq('user_id', '550e8400-e29b-41d4-a716-446655440000')
        .eq('protected', true)
        .not('add_tags', 'is', null);

      if (error) throw error;

      // Flatten the tag rules into individual locked tags
      const flattened: LockedTag[] = [];
      data?.forEach(rule => {
        rule.add_tags?.forEach((tag: string) => {
          flattened.push({
            id: `${rule.id}-${tag}`,
            tag: tag,
            password: rule.password || ''
          });
        });
      });

      setLockedTags(flattened);
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
        .eq('user_id', '550e8400-e29b-41d4-a716-446655440000');

      if (contactsError) throw contactsError;

      // Combine all tags
      const allTagsSet = new Set<string>();
      
      contacts?.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => allTagsSet.add(tag.trim()));
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
        const { error } = await supabase
          .from('tag_rules')
          .insert({
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            name: `Lock: ${tag}`,
            description: `Password protection for tag: ${tag}`,
            trigger_tag: 'never-trigger', // Will never match
            trigger_tags: ['never-trigger'],
            add_tags: [tag],
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
      // Find and delete the tag rule that protects this tag
      const ruleId = lockedTag.id.split('-')[0];
      
      const { error } = await supabase
        .from('tag_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast.success(`Tag "${lockedTag.tag}" unlocked successfully`);
      loadLockedTags();
    } catch (error) {
      console.error('Error unlocking tag:', error);
      toast.error('Failed to unlock tag');
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
              <Label htmlFor="tags-to-lock">Tags to Lock</Label>
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
              <div className="flex flex-wrap gap-2">
                {lockedTags.map((lockedTag) => (
                  <Badge 
                    key={lockedTag.id} 
                    variant="secondary" 
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    <Lock className="h-3 w-3" />
                    {lockedTag.tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlockTag(lockedTag)}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <Unlock className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};