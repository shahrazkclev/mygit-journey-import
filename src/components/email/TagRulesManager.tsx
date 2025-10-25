import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Trash2, Plus, Settings, Edit, RefreshCw, RotateCcw, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TagRuleDesinfectButton } from "../TagRuleDesinfectButton";
import { TagRuleSafetyWrapper } from "../TagRuleSafetyWrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TagRule {
  id: string;
  name: string;
  description: string;
  trigger_tag: string;
  trigger_tags: string[];
  trigger_match_type: string;
  add_tags: string[];
  remove_tags: string[];
  replace_all_tags: boolean;
  enabled: boolean;
}

export const TagRulesManager = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<TagRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isReapplying, setIsReapplying] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
    const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    trigger_tags: [] as string[],
    trigger_match_type: "any" as 'any' | 'all',
    add_tags: [] as string[],
    remove_tags: [] as string[],
    replace_all_tags: false,
  });
  const [editRule, setEditRule] = useState({
    name: "",
    description: "",
    trigger_tags: [] as string[],
    trigger_match_type: "any" as 'any' | 'all',
    add_tags: [] as string[],
    remove_tags: [] as string[],
    replace_all_tags: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadRules();
      loadAllTags();
    }
  }, [user?.id]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .select('*')
        .eq('user_id', user?.id)
        .eq('protected', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading tag rules:', error);
      toast.error('Failed to load tag rules');
    }
  };

  const loadAllTags = async () => {
    try {
      // Get tags from contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user?.id);

      if (contactsError) {
        console.error('Error loading contacts for tags:', contactsError);
        // Don't throw, just continue with empty contacts
      }

      // Get tags from existing tag rules
      const { data: tagRules, error: rulesError } = await supabase
        .from('tag_rules')
        .select('trigger_tags, add_tags, remove_tags')
        .eq('user_id', user?.id);

      if (rulesError) {
        console.error('Error loading tag rules for tags:', rulesError);
        // Don't throw, just continue with empty rules
      }

      // Get products for tag suggestions
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('name, category')
        .eq('user_id', user?.id);

      if (productsError) {
        console.error('Error loading products for tags:', productsError);
        // Don't throw, just continue with empty products
      }

      // Combine all tags safely
      const allTagsSet = new Set<string>();
      
      // Add tags from contacts
      contacts?.forEach(contact => {
        if (contact?.tags && Array.isArray(contact.tags)) {
          contact.tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              allTagsSet.add(tag.trim());
            }
          });
        }
      });

      // Add tags from rules
      tagRules?.forEach(rule => {
        if (rule?.trigger_tags && Array.isArray(rule.trigger_tags)) {
          rule.trigger_tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              allTagsSet.add(tag.toLowerCase().trim());
            }
          });
        }
        if (rule?.add_tags && Array.isArray(rule.add_tags)) {
          rule.add_tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              allTagsSet.add(tag.toLowerCase().trim());
            }
          });
        }
        if (rule?.remove_tags && Array.isArray(rule.remove_tags)) {
          rule.remove_tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              allTagsSet.add(tag.toLowerCase().trim());
            }
          });
        }
      });

      // Add product names as tag suggestions (normalized to lowercase)
      products?.forEach(product => {
        if (product?.name && typeof product.name === 'string') {
          allTagsSet.add(product.name.toLowerCase().trim());
        }
        if (product?.category && typeof product.category === 'string') {
          allTagsSet.add(product.category.toLowerCase().trim());
        }
      });

      setAllTags(Array.from(allTagsSet).filter(Boolean).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
      // Set empty array as fallback
      setAllTags([]);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.trigger_tags || newRule.trigger_tags.length === 0) {
      toast.error('Please fill in the rule name and trigger tags');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('tag_rules')
        .insert({
          user_id: user.id,
          name: newRule.name,
          description: newRule.description,
          trigger_tag: (newRule.trigger_tags || [])[0]?.toLowerCase().trim() || '', // Legacy field
          trigger_tags: (newRule.trigger_tags || []).map(tag => tag.toLowerCase().trim()),
          trigger_match_type: newRule.trigger_match_type,
          add_tags: (newRule.add_tags || []).map(tag => tag.toLowerCase().trim()),
          remove_tags: (newRule.remove_tags || []).map(tag => tag.toLowerCase().trim()),
          replace_all_tags: newRule.replace_all_tags,
          enabled: true
        });

      if (error) throw error;

      toast.success('Tag rule created successfully');
      setNewRule({ name: "", description: "", trigger_tags: [], trigger_match_type: "any", add_tags: [], remove_tags: [], replace_all_tags: false });
      setIsCreating(false);
      loadRules();
    } catch (error) {
      console.error('Error creating tag rule:', error);
      toast.error('Failed to create tag rule');
    }
  };

  const handleUpdateRule = async (ruleId: string) => {
    if (!editRule.name || !editRule.trigger_tags || editRule.trigger_tags.length === 0) {
      toast.error('Please fill in the rule name and trigger tags');
      return;
    }

    try {
      const { error } = await supabase
        .from('tag_rules')
        .update({
          name: editRule.name,
          description: editRule.description,
          trigger_tag: (editRule.trigger_tags || [])[0]?.toLowerCase().trim() || '', // Legacy field
          trigger_tags: (editRule.trigger_tags || []).map(tag => tag.toLowerCase().trim()),
          trigger_match_type: editRule.trigger_match_type,
          add_tags: (editRule.add_tags || []).map(tag => tag.toLowerCase().trim()),
          remove_tags: (editRule.remove_tags || []).map(tag => tag.toLowerCase().trim()),
          replace_all_tags: editRule.replace_all_tags
        })
        .eq('id', ruleId);

      if (error) throw error;

      toast.success('Tag rule updated successfully');
      setEditingRule(null);
      loadRules();
    } catch (error) {
      console.error('Error updating tag rule:', error);
      toast.error('Failed to update tag rule');
    }
  };

  const startEditing = (rule: TagRule) => {
    setEditingRule(rule.id);
    setEditRule({
      name: rule.name,
      description: rule.description || "",
      trigger_tags: rule.trigger_tags || [rule.trigger_tag].filter(Boolean),
      trigger_match_type: (rule.trigger_match_type as 'any' | 'all') || 'any',
      add_tags: rule.add_tags || [],
      remove_tags: rule.remove_tags || [],
      replace_all_tags: rule.replace_all_tags || false
    });
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tag_rules')
        .update({ enabled })
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));
      
      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}. Use "Reapply Rules" button to update all contacts.`);
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('tag_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(rules.filter(rule => rule.id !== ruleId));
      toast.success('Rule deleted successfully');
      setShowDeleteDialog(false);
      setRuleToDelete(null);
      setConfirmText('');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleDeleteClick = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }
    if (ruleToDelete) {
      deleteRule(ruleToDelete);
    }
  };

  const reapplyTagRules = async () => {
    setIsReapplying(true);
    try {
      // Reapply tag rules for both regular and unsubscribed contacts
      const { error: contactsError } = await supabase.rpc('reapply_tag_rules_for_user', {
        p_user_id: user?.id
      });

      if (contactsError) throw contactsError;

      const { error: unsubscribedError } = await supabase.rpc('reapply_tag_rules_to_unsubscribed_contacts', {
        p_user_id: user?.id
      });

      if (unsubscribedError) throw unsubscribedError;

      toast.success('Tag rules reapplied to all contacts successfully');
      
      // Trigger a global refresh of contacts
      window.dispatchEvent(new CustomEvent('contactsUpdated'));
      
    } catch (error) {
      console.error('Error reapplying tag rules:', error);
      toast.error('Failed to reapply tag rules');
    } finally {
      setIsReapplying(false);
    }
  };

  // Add error boundary to prevent crashes
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  try {
    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Tag Rules</h2>
          <p className="text-sm text-muted-foreground">
            Automatically manage contact tags based on triggers. When a contact gets a trigger tag, the rule will add/remove other tags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={reapplyTagRules}
            disabled={isReapplying}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isReapplying ? 'animate-spin' : ''}`} />
            {isReapplying ? 'Reapplying...' : 'Reapply Rules'}
          </Button>
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Tag Rule</CardTitle>
            <CardDescription>
              Define a rule that triggers when a contact receives a specific tag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Discount Interest to Purchase"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rule-description">Description (Optional)</Label>
              <Textarea
                id="rule-description"
                placeholder="e.g., When someone shows interest in discount, remove interest tag after purchase"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="trigger-tags">Trigger Tags</Label>
              <TagInput
                value={(newRule.trigger_tags || []).join(', ')}
                onChange={(value) => setNewRule({ ...newRule, trigger_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                suggestions={allTags}
                placeholder="e.g., bought-product-x, premium-customer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When a contact gets these tags, the rule will be triggered
              </p>
            </div>
            <div>
              <Label htmlFor="trigger-match">Trigger Match Type</Label>
              <Select
                value={newRule.trigger_match_type}
                onValueChange={(value: 'any' | 'all') => setNewRule({ ...newRule, trigger_match_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any tag matches (OR)</SelectItem>
                  <SelectItem value="all">All tags match (AND)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose whether ANY trigger tag or ALL trigger tags must be present
              </p>
            </div>
            <div>
              <Label htmlFor="add-tags">Tags to Add</Label>
              <TagInput
                value={(newRule.add_tags || []).join(', ')}
                onChange={(value) => setNewRule({ ...newRule, add_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                suggestions={allTags}
                placeholder="e.g., customer, premium"
              />
            </div>
            <div>
              <Label htmlFor="remove-tags">Tags to Remove</Label>
              <TagInput
                value={(newRule.remove_tags || []).join(', ')}
                onChange={(value) => setNewRule({ ...newRule, remove_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                suggestions={allTags}
                placeholder="e.g., interested-in-discount, prospect"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="replace-all-tags">Replace All Tags</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, replaces ALL existing tags with only the "Tags to Add". Otherwise, adds/removes specific tags.
                </p>
              </div>
              <Switch
                id="replace-all-tags"
                checked={newRule.replace_all_tags}
                onCheckedChange={(checked) => setNewRule({ ...newRule, replace_all_tags: checked })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={handleCreateRule}>Create Rule</Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-gradient-to-br from-email-primary/10 to-email-accent/10 rounded-full mb-6">
                <Settings className="h-12 w-12 text-email-primary" />
              </div>
              <h3 className="text-xl font-semibold text-email-secondary mb-3">No Tag Rules Yet</h3>
              <p className="text-email-secondary/80 text-center mb-6 max-w-md">
                Create your first tag rule to automatically manage contact tags based on triggers.
              </p>
              <Button 
                onClick={() => setIsCreating(true)} 
                className="bg-gradient-to-r from-email-primary to-email-accent hover:from-email-primary/90 hover:to-email-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className={`shadow-lg shadow-email-primary/5 bg-gradient-to-br from-white via-email-muted/10 to-white border border-email-primary/20 hover:shadow-xl hover:shadow-email-primary/10 transition-all duration-200 ${!rule.enabled ? "opacity-60" : ""}`}>
              <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-email-secondary font-semibold">{rule.name}</CardTitle>
                    {rule.description && (
                      <CardDescription className="text-email-secondary/80">{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <TagRuleSafetyWrapper
                      action={rule.enabled ? "disable" : "enable"}
                      ruleName={rule.name}
                      onConfirm={() => toggleRule(rule.id, !rule.enabled)}
                    >
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => {}} // Handled by safety wrapper
                      />
                    </TagRuleSafetyWrapper>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <TagRuleDesinfectButton
                      ruleId={rule.id}
                      ruleName={rule.name}
                      onDesinfectComplete={(result) => {
                        console.log('Desinfect completed:', result);
                        toast.success(`Desinfect completed: ${result.updated_contacts} contacts updated`);
                      }}
                    />
                    <TagRuleSafetyWrapper
                      action="delete"
                      ruleName={rule.name}
                      onConfirm={() => deleteRule(rule.id)}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TagRuleSafetyWrapper>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingRule === rule.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Rule Name</Label>
                      <Input
                        id="edit-name"
                        value={editRule.name}
                        onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editRule.description}
                        onChange={(e) => setEditRule({ ...editRule, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-trigger-tags">Trigger Tags</Label>
                      <TagInput
                        value={(editRule.trigger_tags || []).join(', ')}
                        onChange={(value) => setEditRule({ ...editRule, trigger_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                        suggestions={allTags}
                        placeholder="e.g., bought-product-x, premium-customer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-trigger-match">Trigger Match Type</Label>
                      <Select
                        value={editRule.trigger_match_type}
                        onValueChange={(value: 'any' | 'all') => setEditRule({ ...editRule, trigger_match_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any tag matches (OR)</SelectItem>
                          <SelectItem value="all">All tags match (AND)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-add-tags">Tags to Add</Label>
                      <TagInput
                        value={(editRule.add_tags || []).join(', ')}
                        onChange={(value) => setEditRule({ ...editRule, add_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                        suggestions={allTags}
                        placeholder="e.g., customer, premium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-remove-tags">Tags to Remove</Label>
                      <TagInput
                        value={(editRule.remove_tags || []).join(', ')}
                        onChange={(value) => setEditRule({ ...editRule, remove_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
                        suggestions={allTags}
                        placeholder="e.g., interested-in-discount, prospect"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="edit-replace-all-tags">Replace All Tags</Label>
                        <p className="text-xs text-muted-foreground">
                          When enabled, replaces ALL existing tags with only the "Tags to Add"
                        </p>
                      </div>
                      <Switch
                        id="edit-replace-all-tags"
                        checked={editRule.replace_all_tags}
                        onCheckedChange={(checked) => setEditRule({ ...editRule, replace_all_tags: checked })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateRule(rule.id)}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Triggers ({rule.trigger_match_type?.toUpperCase() || 'ANY'}):</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rule.trigger_tags || [rule.trigger_tag] || []).filter(Boolean).map((tag, index) => (
                          <Badge key={index} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    {rule.add_tags && rule.add_tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-green-700">Add Tags:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.add_tags.map((tag, index) => (
                            <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                              +{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {rule.remove_tags && rule.remove_tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-red-700">Remove Tags:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.remove_tags.map((tag, index) => (
                            <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                              -{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    );
  } catch (error) {
    console.error('TagRulesManager render error:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground">Please refresh the page and try again.</p>
          </div>
        </div>
      </div>
    );
  }
};