import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Trash2, 
  Edit, 
  RotateCcw, 
  Shield, 
  AlertTriangle,
  Play,
  Pause,
  Eye,
  History
} from 'lucide-react';
import { TagRuleDesinfectButton } from './TagRuleDesinfectButton';
import { TagRuleSafetyWrapper } from './TagRuleSafetyWrapper';
import { supabase } from '@/integrations/supabase/client';

interface TagRule {
  id: string;
  name: string;
  description: string;
  trigger_tag: string;
  trigger_tags: string[];
  trigger_match_type: 'all' | 'any';
  add_tags: string[];
  remove_tags: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TagRuleExecutions {
  id: string;
  rule_name: string;
  contact_email: string;
  triggered_at: string;
  trigger_match_type: string;
  trigger_tags: string;
  action_added: string;
  action_removed: string;
  tags_before: string;
  tags_after: string;
  status: string;
}

export function TagRulesManager() {
  const [rules, setRules] = useState<TagRule[]>([]);
  const [executions, setExecutions] = useState<TagRuleExecutions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);

  useEffect(() => {
    loadRules();
    loadExecutions();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('tag_rule_executions_summary')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tag_rules')
        .update({ enabled })
        .eq('id', ruleId);

      if (error) throw error;
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      alert(`Failed to ${enabled ? 'enable' : 'disable'} rule: ${error.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('tag_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      await loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      throw error;
    }
  };

  const handleDesinfectComplete = (result: any) => {
    console.log('Desinfect completed:', result);
    loadExecutions(); // Refresh executions
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tag rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tag Rules Manager</h2>
          <p className="text-muted-foreground">
            Manage automated tag rules with safety confirmations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExecutions(!showExecutions)}
          >
            <History className="h-4 w-4 mr-2" />
            {showExecutions ? 'Hide' : 'Show'} Executions
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => 
                      handleToggleRule(rule.id, enabled)
                    }
                  />
                </div>
              </div>
              {rule.description && (
                <CardDescription>{rule.description}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Rule Logic Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm mb-2">Trigger</h4>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mr-1">
                      {rule.trigger_match_type}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {rule.trigger_tags.join(', ')}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Add Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {rule.add_tags.map((tag) => (
                      <Badge key={tag} variant="default" className="text-xs">
                        +{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Remove Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {rule.remove_tags.map((tag) => (
                      <Badge key={tag} variant="destructive" className="text-xs">
                        -{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <TagRuleSafetyWrapper
                  action="edit"
                  ruleName={rule.name}
                  onConfirm={() => {
                    // Handle edit - you can implement this
                    console.log('Edit rule:', rule.id);
                  }}
                >
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </TagRuleSafetyWrapper>

                <TagRuleDesinfectButton
                  ruleId={rule.id}
                  ruleName={rule.name}
                  onDesinfectComplete={handleDesinfectComplete}
                />

                <TagRuleSafetyWrapper
                  action="delete"
                  ruleName={rule.name}
                  onConfirm={() => handleDeleteRule(rule.id)}
                >
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </TagRuleSafetyWrapper>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Tag Rules</h3>
              <p className="text-muted-foreground mb-4">
                Create your first tag rule to automate contact tagging
              </p>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Executions History */}
      {showExecutions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Executions
            </CardTitle>
            <CardDescription>
              Track all tag rule executions and their effects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {executions.map((execution) => (
                <div key={execution.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{execution.rule_name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {execution.contact_email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(execution.triggered_at).toLocaleString()}
                      </span>
                      <Badge variant={execution.status.includes('Success') ? 'default' : 'destructive'}>
                        {execution.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Trigger: {execution.trigger_tags} ({execution.trigger_match_type})</div>
                    <div>Action: {execution.action_added} | {execution.action_removed}</div>
                    <div>Result: {execution.tags_before} → {execution.tags_after}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
