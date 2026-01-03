import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Search,
  Filter,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AutomationRuleBuilder } from './AutomationRuleBuilder';

interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_config: any;
  conditions: any[];
  action_config: any;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  trigger_count: number;
  success_count: number;
  failure_count: number;
}

export const AutomationCampaigns: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRules();
    const interval = setInterval(loadRules, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRules = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Error loading automation rules:', error);
      toast.error('Failed to load automation rules');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRules();
    setIsRefreshing(false);
    toast.success('Refreshed');
  };

  const handleToggleEnabled = async (rule: AutomationRule) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ enabled: !rule.enabled })
        .eq('id', rule.id);

      if (error) throw error;
      await loadRules();
      toast.success(`Automation ${rule.enabled ? 'disabled' : 'enabled'}`);
    } catch (error: any) {
      console.error('Error toggling automation:', error);
      toast.error('Failed to update automation');
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      await loadRules();
      toast.success('Automation deleted');
    } catch (error: any) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation');
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'enabled' && rule.enabled) ||
      (statusFilter === 'disabled' && !rule.enabled);
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rules.length,
    enabled: rules.filter(r => r.enabled).length,
    disabled: rules.filter(r => !r.enabled).length,
    totalTriggers: rules.reduce((sum, r) => sum + r.trigger_count, 0),
    totalSuccess: rules.reduce((sum, r) => sum + r.success_count, 0),
    totalFailures: rules.reduce((sum, r) => sum + r.failure_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Automation Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage automated email campaigns based on tags and conditions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              // Reset any state when dialog closes
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
                <DialogDescription>
                  Build automated workflows that trigger based on tags and execute a series of actions.
                </DialogDescription>
              </DialogHeader>
              {showCreateDialog && (
                <React.Suspense fallback={<div className="p-4">Loading...</div>}>
                  <AutomationRuleBuilder
                    onSave={() => {
                      setShowCreateDialog(false);
                      loadRules();
                    }}
                    onCancel={() => setShowCreateDialog(false)}
                  />
                </React.Suspense>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Automations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Triggers</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalTriggers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTriggers > 0 
                ? Math.round((stats.totalSuccess / stats.totalTriggers) * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search automations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'enabled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('enabled')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enabled
              </Button>
              <Button
                variant={statusFilter === 'disabled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('disabled')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Disabled
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {rules.length === 0 
                  ? 'No automation rules yet. Create your first one!'
                  : 'No automations match your filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEnabled(rule)}
                    >
                      {rule.enabled ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Trigger Info */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Trigger</h4>
                    <div className="text-sm text-muted-foreground">
                      {rule.trigger_config?.type === 'tag_added' && (
                        <span>When tag <Badge variant="outline">{rule.trigger_config.tag}</Badge> is added</span>
                      )}
                      {rule.trigger_config?.type === 'tag_removed' && (
                        <span>When tag <Badge variant="outline">{rule.trigger_config.tag}</Badge> is removed</span>
                      )}
                    </div>
                  </div>

                  {/* Steps (new format) */}
                  {rule.steps && Array.isArray(rule.steps) && rule.steps.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Automation Steps</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {rule.steps.map((step: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{idx + 1}.</span>
                            {step.type === 'wait' && (
                              <span>Wait {step.delay_days || 0} day{(step.delay_days || 0) !== 1 ? 's' : ''}</span>
                            )}
                            {step.type === 'add_tag' && (
                              <span>Add tag <Badge variant="outline">{step.tag}</Badge></span>
                            )}
                            {step.type === 'remove_tag' && (
                              <span>Remove tag <Badge variant="outline">{step.tag}</Badge></span>
                            )}
                            {step.type === 'send_email' && (
                              <span>Send email via webhook</span>
                            )}
                            {step.type === 'stop' && (
                              <span className="text-yellow-600">Stop automation</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Legacy Conditions */}
                      {rule.conditions && rule.conditions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Conditions</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {rule.conditions.map((condition: any, idx: number) => (
                              <div key={idx}>
                                {condition.type === 'wait_duration' && (
                                  <span>Wait {condition.days} day{condition.days !== 1 ? 's' : ''}</span>
                                )}
                                {condition.type === 'tag_exists' && (
                                  <span>Contact must have tag <Badge variant="outline">{condition.tag}</Badge></span>
                                )}
                                {condition.type === 'tag_not_exists' && (
                                  <span>Contact must NOT have tag <Badge variant="outline">{condition.tag}</Badge></span>
                                )}
                                {condition.type === 'has_product' && (
                                  <span>Contact must have purchased product</span>
                                )}
                                {condition.type === 'no_product' && (
                                  <span>Contact must NOT have purchased product</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Legacy Action */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Action</h4>
                        <div className="text-sm text-muted-foreground">
                          {rule.action_config?.type === 'send_email' && (
                            <span>Send email via webhook</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Statistics */}
                  <div className="flex gap-4 pt-2 border-t">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Triggers: </span>
                      <span className="font-medium">{rule.trigger_count}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Success: </span>
                      <span className="font-medium text-green-600">{rule.success_count}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Failures: </span>
                      <span className="font-medium text-red-600">{rule.failure_count}</span>
                    </div>
                    {rule.last_triggered_at && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Last triggered: </span>
                        <span className="font-medium">
                          {new Date(rule.last_triggered_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Automation Rule</DialogTitle>
            </DialogHeader>
            <AutomationRuleBuilder
              rule={editingRule}
              onSave={() => {
                setEditingRule(null);
                loadRules();
              }}
              onCancel={() => setEditingRule(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

