import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X, ArrowRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateSelector } from './TemplateSelector';

interface AutomationStep {
  id: string;
  type: 'wait' | 'add_tag' | 'remove_tag' | 'send_email' | 'stop';
  delay_days?: number;
  tag?: string;
  template_id?: string;
  webhook_url?: string;
  subject?: string;
  html_content?: string;
  stop_automation?: boolean;
}

interface AutomationRuleBuilderProps {
  rule?: any;
  onSave: () => void;
  onCancel: () => void;
}

export const AutomationRuleBuilder: React.FC<AutomationRuleBuilderProps> = ({
  rule,
  onSave,
  onCancel,
}) => {
  const { user } = useAuth();
  
  // Parse steps from existing rule or create default
  const parseSteps = (): AutomationStep[] => {
    try {
      if (!rule) return [];
      
      if (rule.steps && Array.isArray(rule.steps) && rule.steps.length > 0) {
        return rule.steps;
      }
      // Legacy format: convert old action_config to steps
      if (rule.action_config) {
        const steps: AutomationStep[] = [];
        if (rule.conditions?.some((c: any) => c.type === 'wait_duration')) {
          const waitCondition = rule.conditions.find((c: any) => c.type === 'wait_duration');
          if (waitCondition) {
            steps.push({
              id: `step-${Date.now()}-1`,
              type: 'wait',
              delay_days: waitCondition.days || 0,
            });
          }
        }
        if (rule.action_config.type === 'send_email') {
          steps.push({
            id: `step-${Date.now()}-2`,
            type: 'send_email',
            template_id: rule.action_config.template_id || '',
            webhook_url: rule.action_config.webhook_url || '',
            subject: rule.action_config.subject || '',
            html_content: rule.action_config.html_content || '',
          });
        }
        return steps.length > 0 ? steps : [];
      }
      return [];
    } catch (error) {
      console.error('Error parsing steps:', error);
      return [];
    }
  };

  const [name, setName] = useState(() => rule?.name || '');
  const [description, setDescription] = useState(() => rule?.description || '');
  const [triggerType, setTriggerType] = useState(() => rule?.trigger_config?.type || 'tag_added');
  const [triggerTag, setTriggerTag] = useState(() => rule?.trigger_config?.tag || '');
  const [steps, setSteps] = useState<AutomationStep[]>(() => parseSteps());
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAvailableTags().catch(error => {
        console.error('Failed to load tags:', error);
      });
    }
  }, [user?.id]);

  const loadAvailableTags = async () => {
    try {
      if (!user?.id) {
        setAvailableTags([]);
        return;
      }

      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading contacts:', error);
        setAvailableTags([]);
        return;
      }

      const tagsSet = new Set<string>();
      if (contacts && Array.isArray(contacts)) {
        contacts.forEach(contact => {
          if (contact?.tags && Array.isArray(contact.tags)) {
            contact.tags.forEach((tag: string) => {
              if (tag && typeof tag === 'string') {
                tagsSet.add(tag.toLowerCase().trim());
              }
            });
          }
        });
      }

      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([]);
    }
  };

  const addStep = (type: AutomationStep['type'] = 'wait') => {
    const newStep: AutomationStep = {
      id: `step-${Date.now()}-${Math.random()}`,
      type,
      ...(type === 'wait' && { delay_days: 0 }),
      ...(type === 'add_tag' && { tag: '' }),
      ...(type === 'remove_tag' && { tag: '' }),
      ...(type === 'send_email' && { webhook_url: '', subject: '', html_content: '' }),
      ...(type === 'stop' && { stop_automation: true }),
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const updateStep = (stepId: string, field: keyof AutomationStep, value: any) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      if (!name.trim()) {
        toast.error('Please enter a name for the automation');
        return;
      }

      if (triggerType === 'tag_added' && !triggerTag.trim()) {
        toast.error('Please select a trigger tag');
        return;
      }

      if (steps.length === 0) {
        toast.error('Please add at least one step to the automation');
        return;
      }

      // Validate steps
      for (const step of steps) {
        if (step.type === 'wait' && (!step.delay_days || step.delay_days < 0)) {
          toast.error('Wait steps must have a delay of at least 0 days');
          return;
        }
        if ((step.type === 'add_tag' || step.type === 'remove_tag') && !step.tag?.trim()) {
          toast.error('Tag steps must have a tag specified');
          return;
        }
        if (step.type === 'send_email') {
          if (!step.webhook_url?.trim()) {
            toast.error('Email steps must have a webhook URL');
            return;
          }
          if (!step.template_id && !step.html_content?.trim()) {
            toast.error('Email steps must have a template or HTML content');
            return;
          }
        }
      }

      // Build conditions array (for backward compatibility and filtering)
      const conditions: any[] = [];
      steps.forEach(step => {
        if (step.type === 'wait') {
          conditions.push({ type: 'wait_duration', days: step.delay_days || 0 });
        }
      });

      // For backward compatibility, also set action_config to the first send_email step
      const firstEmailStep = steps.find(s => s.type === 'send_email');
      const actionConfig = firstEmailStep ? {
        type: 'send_email',
        template_id: firstEmailStep.template_id || null,
        webhook_url: firstEmailStep.webhook_url || '',
        subject: firstEmailStep.subject || null,
        html_content: firstEmailStep.html_content || null,
      } : {
        type: 'send_email',
        template_id: null,
        webhook_url: '',
        subject: null,
        html_content: null,
      };

      const ruleData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        enabled: rule?.enabled !== undefined ? rule.enabled : true,
        trigger_config: {
          type: triggerType,
          tag: triggerTag.trim(),
        },
        conditions: conditions,
        action_config: actionConfig,
        steps: steps, // New multi-step format
      };

      if (rule?.id) {
        // Update existing rule
        const { error } = await supabase
          .from('automation_rules')
          .update(ruleData)
          .eq('id', rule.id);

        if (error) throw error;
        toast.success('Automation rule updated');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('automation_rules')
          .insert(ruleData);

        if (error) throw error;
        toast.success('Automation rule created');
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving automation rule:', error);
      toast.error(error?.message || 'Failed to save automation rule');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.id) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please log in to create automations.
      </div>
    );
  }

  const renderStepEditor = (step: AutomationStep, index: number) => {
    if (!step) return null;
    
    return (
      <Card key={step.id} className="bg-white border-2 border-slate-200">
        <CardHeader className="bg-slate-50 border-b-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-slate-800">
                Step {index + 1}: {step.type === 'wait' ? 'Wait' : 
                                   step.type === 'add_tag' ? 'Add Tag' :
                                   step.type === 'remove_tag' ? 'Remove Tag' :
                                   step.type === 'send_email' ? 'Send Email' :
                                   'Stop Automation'}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStep(step.id, 'up')}
                >
                  ↑
                </Button>
              )}
              {index < steps.length - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStep(step.id, 'down')}
                >
                  ↓
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(step.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {step.type === 'wait' && (
            <div className="flex gap-2 items-center">
              <Label>Wait for</Label>
              <Input
                type="number"
                min="0"
                value={step.delay_days || 0}
                onChange={(e) => updateStep(step.id, 'delay_days', parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )}

          {(step.type === 'add_tag' || step.type === 'remove_tag') && (
            <div>
              <Label>Tag *</Label>
              <div className="space-y-2">
                <Select
                  value={step.tag || undefined}
                  onValueChange={(value) => updateStep(step.id, 'tag', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.length > 0 ? (
                      availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags available</div>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  value={step.tag || ''}
                  onChange={(e) => updateStep(step.id, 'tag', e.target.value)}
                  placeholder="Or type a new tag"
                />
              </div>
              {step.tag && !availableTags.some(t => t.toLowerCase() === (step.tag || '').toLowerCase()) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tag "{step.tag}" will be created when this automation is saved
                </p>
              )}
            </div>
          )}

          {step.type === 'send_email' && (
            <>
              <div>
                <Label>Webhook URL *</Label>
                <Input
                  value={step.webhook_url || ''}
                  onChange={(e) => updateStep(step.id, 'webhook_url', e.target.value)}
                  placeholder="https://hook.us2.make.com/..."
                />
              </div>
              <div>
                <Label>Email Template</Label>
                <TemplateSelector
                  value={step.template_id || '__none__'}
                  onChange={(value) => {
                    const actualValue = value === '__none__' ? '' : value;
                    updateStep(step.id, 'template_id', actualValue);
                  }}
                  onTemplateSelect={(template) => {
                    updateStep(step.id, 'template_id', template.id);
                    updateStep(step.id, 'subject', template.subject);
                    updateStep(step.id, 'html_content', template.html_content);
                  }}
                />
              </div>
              {!step.template_id && (
                <>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={step.subject || ''}
                      onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                      placeholder="Email subject (supports {{name}}, {{email}}, etc.)"
                    />
                  </div>
                  <div>
                    <Label>HTML Content</Label>
                    <Textarea
                      value={step.html_content || ''}
                      onChange={(e) => updateStep(step.id, 'html_content', e.target.value)}
                      placeholder="Email HTML content (supports {{name}}, {{email}}, {{contact_id}}, etc.)"
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step.type === 'stop' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This step will stop the automation workflow. No further steps will be executed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Basic Info */}
      <Card className="bg-white border-2 border-slate-200">
        <CardHeader className="bg-slate-50 border-b-2 border-slate-200">
          <CardTitle className="text-slate-800">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Discount Follow-up After Purchase"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this automation does..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card className="bg-white border-2 border-blue-200">
        <CardHeader className="bg-blue-50 border-b-2 border-blue-200">
          <CardTitle className="text-blue-800">Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="triggerType">When *</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag_added">Tag is Added</SelectItem>
                <SelectItem value="tag_removed">Tag is Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType && (
            <div>
              <Label htmlFor="triggerTag">Tag *</Label>
              <div className="space-y-2">
                <Select value={triggerTag || undefined} onValueChange={setTriggerTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.length > 0 ? (
                      availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags available</div>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  value={triggerTag || ''}
                  onChange={(e) => setTriggerTag(e.target.value)}
                  placeholder="Or type a new tag"
                />
              </div>
              {triggerTag && !availableTags.some(t => t.toLowerCase() === triggerTag.toLowerCase()) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tag "{triggerTag}" will be created when this automation is saved
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Steps */}
      <Card className="bg-white border-2 border-purple-200">
        <CardHeader className="bg-purple-50 border-b-2 border-purple-200">
          <CardTitle className="text-purple-800">Automation Steps</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Build your automation workflow step by step. Steps execute in order.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No steps added yet. Click below to add your first step.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id}>
                  {renderStepEditor(step, index)}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => addStep('wait')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Wait
            </Button>
            <Button variant="outline" onClick={() => addStep('add_tag')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
            <Button variant="outline" onClick={() => addStep('remove_tag')}>
              <Plus className="h-4 w-4 mr-2" />
              Remove Tag
            </Button>
            <Button variant="outline" onClick={() => addStep('send_email')}>
              <Plus className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" onClick={() => addStep('stop')}>
              <Plus className="h-4 w-4 mr-2" />
              Stop Here
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : rule?.id ? 'Update' : 'Create'} Automation
        </Button>
      </div>
    </div>
  );
};

