import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateSelector } from './TemplateSelector';

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
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [triggerType, setTriggerType] = useState(rule?.trigger_config?.type || 'tag_added');
  const [triggerTag, setTriggerTag] = useState(rule?.trigger_config?.tag || '');
  const [conditions, setConditions] = useState<any[]>(rule?.conditions || []);
  const [actionType, setActionType] = useState(rule?.action_config?.type || 'send_email');
  const [templateId, setTemplateId] = useState(rule?.action_config?.template_id || '');
  const [webhookUrl, setWebhookUrl] = useState(rule?.action_config?.webhook_url || '');
  const [subject, setSubject] = useState(rule?.action_config?.subject || '');
  const [htmlContent, setHtmlContent] = useState(rule?.action_config?.html_content || '');

  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    try {
      if (!user?.id) return;

      const { data: contacts } = await supabase
        .from('contacts')
        .select('tags')
        .eq('user_id', user.id);

      const tagsSet = new Set<string>();
      contacts?.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => tagsSet.add(tag.toLowerCase().trim()));
        }
      });

      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { type: 'wait_duration', days: 0 }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleSave = async () => {
    try {
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

      if (actionType === 'send_email') {
        if (!templateId && !htmlContent.trim()) {
          toast.error('Please select a template or enter HTML content');
          return;
        }
        if (!webhookUrl.trim()) {
          toast.error('Please enter a webhook URL');
          return;
        }
      }

      const ruleData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        enabled: rule?.enabled !== undefined ? rule.enabled : true,
        trigger_config: {
          type: triggerType,
          tag: triggerTag.trim(),
        },
        conditions: conditions.filter(c => c.type !== ''), // Remove empty conditions
        action_config: {
          type: actionType,
          template_id: templateId || null,
          webhook_url: webhookUrl.trim(),
          subject: subject.trim() || null,
          html_content: htmlContent.trim() || null,
        },
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
      toast.error('Failed to save automation rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Discount Follow-up"
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
      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="triggerType">Trigger Type *</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag_added">Tag Added</SelectItem>
                <SelectItem value="tag_removed">Tag Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType && (
            <div>
              <Label htmlFor="triggerTag">Tag *</Label>
              <Select value={triggerTag} onValueChange={setTriggerTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type a tag" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!availableTags.includes(triggerTag.toLowerCase()) && triggerTag && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tag "{triggerTag}" will be created when this automation is saved
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add conditions that must be met before the action is executed
          </p>
          {conditions.map((condition, index) => (
            <div key={index} className="flex gap-2 items-start p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Select
                  value={condition.type}
                  onValueChange={(value) => updateCondition(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wait_duration">Wait Duration</SelectItem>
                    <SelectItem value="tag_exists">Tag Exists</SelectItem>
                    <SelectItem value="tag_not_exists">Tag Does Not Exist</SelectItem>
                    <SelectItem value="has_product">Has Product</SelectItem>
                    <SelectItem value="no_product">Does Not Have Product</SelectItem>
                  </SelectContent>
                </Select>
                
                {condition.type === 'wait_duration' && (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={condition.days || 0}
                      onChange={(e) => updateCondition(index, 'days', parseInt(e.target.value) || 0)}
                      placeholder="Days"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
                
                {(condition.type === 'tag_exists' || condition.type === 'tag_not_exists') && (
                  <Select
                    value={condition.tag || ''}
                    onValueChange={(value) => updateCondition(index, 'tag', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </CardContent>
      </Card>

      {/* Action */}
      <Card>
        <CardHeader>
          <CardTitle>Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="actionType">Action Type *</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_email">Send Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType === 'send_email' && (
            <>
              <div>
                <Label htmlFor="webhookUrl">Webhook URL *</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hook.us2.make.com/..."
                />
              </div>

              <div>
                <Label>Email Template</Label>
                <TemplateSelector
                  value={templateId}
                  onChange={setTemplateId}
                  onTemplateSelect={(template) => {
                    setTemplateId(template.id);
                    setSubject(template.subject);
                    setHtmlContent(template.html_content);
                  }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Select a template or enter custom content below
                </p>
              </div>

              {!templateId && (
                <>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject (supports {{name}}, {{email}}, etc.)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="htmlContent">HTML Content</Label>
                    <Textarea
                      id="htmlContent"
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Email HTML content (supports {{name}}, {{email}}, {{contact_id}}, etc.)"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {rule?.id ? 'Update' : 'Create'} Automation
        </Button>
      </div>
    </div>
  );
};

