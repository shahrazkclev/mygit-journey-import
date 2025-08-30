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
import { Trash2, Plus, Settings, Edit } from "lucide-react";
import { toast } from "sonner";

interface TagRule {
  id: string;
  name: string;
  description: string;
  trigger_tag: string;
  trigger_tags: string[];
  trigger_match_type: string;
  add_tags: string[];
  remove_tags: string[];
  enabled: boolean;
}

export const TagRulesManager = () => {
  const [rules, setRules] = useState<TagRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    trigger_tags: "",
    trigger_match_type: "any" as 'any' | 'all',
    add_tags: "",
    remove_tags: ""
  });
  const [editRule, setEditRule] = useState({
    name: "",
    description: "",
    trigger_tags: "",
    trigger_match_type: "any" as 'any' | 'all',
    add_tags: "",
    remove_tags: ""
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .select('*')
        .eq('user_id', '550e8400-e29b-41d4-a716-446655440000')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading tag rules:', error);
      toast.error('Failed to load tag rules');
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.trigger_tags) {
      toast.error('Please fill in the rule name and trigger tags');
      return;
    }

    try {
      const triggerTagsArray = newRule.trigger_tags.split(',').map(t => t.trim()).filter(t => t);
      
      const { error } = await supabase
        .from('tag_rules')
        .insert({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          name: newRule.name,
          description: newRule.description,
          trigger_tag: triggerTagsArray[0] || '', // Legacy field
          trigger_tags: triggerTagsArray,
          trigger_match_type: newRule.trigger_match_type,
          add_tags: newRule.add_tags ? newRule.add_tags.split(',').map(t => t.trim()).filter(t => t) : [],
          remove_tags: newRule.remove_tags ? newRule.remove_tags.split(',').map(t => t.trim()).filter(t => t) : [],
          enabled: true
        });

      if (error) throw error;

      toast.success('Tag rule created successfully');
      setNewRule({ name: "", description: "", trigger_tags: "", trigger_match_type: "any", add_tags: "", remove_tags: "" });
      setIsCreating(false);
      loadRules();
    } catch (error) {
      console.error('Error creating tag rule:', error);
      toast.error('Failed to create tag rule');
    }
  };

  const handleUpdateRule = async (ruleId: string) => {
    if (!editRule.name || !editRule.trigger_tags) {
      toast.error('Please fill in the rule name and trigger tags');
      return;
    }

    try {
      const triggerTagsArray = editRule.trigger_tags.split(',').map(t => t.trim()).filter(t => t);
      
      const { error } = await supabase
        .from('tag_rules')
        .update({
          name: editRule.name,
          description: editRule.description,
          trigger_tag: triggerTagsArray[0] || '', // Legacy field
          trigger_tags: triggerTagsArray,
          trigger_match_type: editRule.trigger_match_type,
          add_tags: editRule.add_tags ? editRule.add_tags.split(',').map(t => t.trim()).filter(t => t) : [],
          remove_tags: editRule.remove_tags ? editRule.remove_tags.split(',').map(t => t.trim()).filter(t => t) : []
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
      trigger_tags: (rule.trigger_tags || [rule.trigger_tag]).filter(Boolean).join(', '),
      trigger_match_type: (rule.trigger_match_type as 'any' | 'all') || 'any',
      add_tags: rule.add_tags.join(', '),
      remove_tags: rule.remove_tags.join(', ')
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
      
      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('tag_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(rules.filter(rule => rule.id !== ruleId));
      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Tag Rules</h2>
          <p className="text-sm text-muted-foreground">
            Automatically manage contact tags based on triggers. When a contact gets a trigger tag, the rule will add/remove other tags.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
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
              <Label htmlFor="trigger-tags">Trigger Tags (comma separated)</Label>
              <Input
                id="trigger-tags"
                placeholder="e.g., bought-product-x, premium-customer"
                value={newRule.trigger_tags}
                onChange={(e) => setNewRule({ ...newRule, trigger_tags: e.target.value })}
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
              <Label htmlFor="add-tags">Tags to Add (comma separated)</Label>
              <Input
                id="add-tags"
                placeholder="e.g., customer, premium"
                value={newRule.add_tags}
                onChange={(e) => setNewRule({ ...newRule, add_tags: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="remove-tags">Tags to Remove (comma separated)</Label>
              <Input
                id="remove-tags"
                placeholder="e.g., interested-in-discount, prospect"
                value={newRule.remove_tags}
                onChange={(e) => setNewRule({ ...newRule, remove_tags: e.target.value })}
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tag Rules Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first tag rule to automatically manage contact tags based on triggers.
              </p>
              <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                      <Label htmlFor="edit-trigger-tags">Trigger Tags (comma separated)</Label>
                      <Input
                        id="edit-trigger-tags"
                        value={editRule.trigger_tags}
                        onChange={(e) => setEditRule({ ...editRule, trigger_tags: e.target.value })}
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
                      <Label htmlFor="edit-add-tags">Tags to Add (comma separated)</Label>
                      <Input
                        id="edit-add-tags"
                        value={editRule.add_tags}
                        onChange={(e) => setEditRule({ ...editRule, add_tags: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-remove-tags">Tags to Remove (comma separated)</Label>
                      <Input
                        id="edit-remove-tags"
                        value={editRule.remove_tags}
                        onChange={(e) => setEditRule({ ...editRule, remove_tags: e.target.value })}
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
                        {(rule.trigger_tags || [rule.trigger_tag]).filter(Boolean).map((tag, index) => (
                          <Badge key={index} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    {rule.add_tags.length > 0 && (
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
                    
                    {rule.remove_tags.length > 0 && (
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
};