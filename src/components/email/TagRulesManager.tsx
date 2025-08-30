import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Settings } from "lucide-react";
import { toast } from "sonner";

interface TagRule {
  id: string;
  name: string;
  description: string;
  trigger_tag: string;
  add_tags: string[];
  remove_tags: string[];
  enabled: boolean;
}

export const TagRulesManager = () => {
  const [rules, setRules] = useState<TagRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    trigger_tag: "",
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
    if (!newRule.name || !newRule.trigger_tag) {
      toast.error('Please fill in the rule name and trigger tag');
      return;
    }

    try {
      const { error } = await supabase
        .from('tag_rules')
        .insert({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          name: newRule.name,
          description: newRule.description,
          trigger_tag: newRule.trigger_tag,
          add_tags: newRule.add_tags ? newRule.add_tags.split(',').map(t => t.trim()).filter(t => t) : [],
          remove_tags: newRule.remove_tags ? newRule.remove_tags.split(',').map(t => t.trim()).filter(t => t) : [],
          enabled: true
        });

      if (error) throw error;

      toast.success('Tag rule created successfully');
      setNewRule({ name: "", description: "", trigger_tag: "", add_tags: "", remove_tags: "" });
      setIsCreating(false);
      loadRules();
    } catch (error) {
      console.error('Error creating tag rule:', error);
      toast.error('Failed to create tag rule');
    }
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
              <Label htmlFor="trigger-tag">Trigger Tag</Label>
              <Input
                id="trigger-tag"
                placeholder="e.g., bought-product-x"
                value={newRule.trigger_tag}
                onChange={(e) => setNewRule({ ...newRule, trigger_tag: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                When a contact gets this tag, the rule will be triggered
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
                      onClick={() => deleteRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Trigger:</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{rule.trigger_tag}</Badge>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};