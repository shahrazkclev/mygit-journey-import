import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Webhook {
  id: string;
  name: string;
  url: string;
  description: string | null;
  is_default: boolean;
  enabled: boolean;
}

interface WebhookSelectorProps {
  value?: string;
  onChange: (webhookId: string) => void;
  allowCustom?: boolean;
  onCustomUrlChange?: (url: string) => void;
}

export const WebhookSelector: React.FC<WebhookSelectorProps> = ({
  value,
  onChange,
  allowCustom = true,
  onCustomUrlChange,
}) => {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDescription, setWebhookDescription] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadWebhooks();
    }
  }, [user?.id]);

  const loadWebhooks = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      if (!webhookName.trim() || !webhookUrl.trim()) {
        toast.error('Please fill in name and URL');
        return;
      }

      // Validate URL
      try {
        new URL(webhookUrl);
      } catch {
        toast.error('Please enter a valid URL');
        return;
      }

      if (editingWebhook?.id) {
        const { error } = await supabase
          .from('webhooks')
          .update({
            name: webhookName.trim(),
            url: webhookUrl.trim(),
            description: webhookDescription.trim() || null,
          })
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast.success('Webhook updated');
      } else {
        // If this is set as default, unset other defaults
        const { error: updateError } = await supabase
          .from('webhooks')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);

        const { error } = await supabase
          .from('webhooks')
          .insert({
            user_id: user.id,
            name: webhookName.trim(),
            url: webhookUrl.trim(),
            description: webhookDescription.trim() || null,
            is_default: webhooks.length === 0, // First webhook is default
          });

        if (error) throw error;
        toast.success('Webhook created');
      }

      await loadWebhooks();
      setShowManageDialog(false);
      handleCreate();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      toast.error(error?.message || 'Failed to save webhook');
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;
      toast.success('Webhook deleted');
      await loadWebhooks();
    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleCreate = () => {
    setEditingWebhook(null);
    setWebhookName('');
    setWebhookUrl('');
    setWebhookDescription('');
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setWebhookName(webhook.name);
    setWebhookUrl(webhook.url);
    setWebhookDescription(webhook.description || '');
  };

  const selectedWebhook = webhooks.find(w => w.id === value);
  const isCustomUrl = value === '__custom__' || (!value && customUrl);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select 
          value={isCustomUrl ? '__custom__' : (value || undefined)} 
          onValueChange={(val) => {
            if (val === '__custom__') {
              onChange('__custom__');
            } else {
              onChange(val);
              if (onCustomUrlChange) {
                onCustomUrlChange('');
              }
            }
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a webhook" />
          </SelectTrigger>
          <SelectContent>
            {webhooks.map(webhook => (
              <SelectItem key={webhook.id} value={webhook.id}>
                {webhook.name} {webhook.is_default && '(Default)'}
              </SelectItem>
            ))}
            {allowCustom && (
              <SelectItem value="__custom__">Custom URL</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" type="button">
              <Plus className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Webhooks</DialogTitle>
              <DialogDescription>
                Create and manage webhook URLs for sending emails via Make.com or other services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Webhook Form */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="e.g., Make.com Primary"
                  />
                </div>
                <div>
                  <Label>Webhook URL *</Label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hook.us2.make.com/..."
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={webhookDescription}
                    onChange={(e) => setWebhookDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <Button onClick={handleSaveWebhook} className="w-full">
                  {editingWebhook ? 'Update' : 'Create'} Webhook
                </Button>
                {editingWebhook && (
                  <Button 
                    variant="outline" 
                    onClick={handleCreate}
                    className="w-full"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

              {/* Webhooks List */}
              <div className="space-y-2">
                <Label>Your Webhooks</Label>
                {webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    No webhooks yet. Create one above.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {webhooks.map(webhook => (
                      <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{webhook.name}</div>
                          <div className="text-sm text-muted-foreground truncate">{webhook.url}</div>
                          {webhook.is_default && (
                            <Badge variant="outline" className="mt-1">Default</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(webhook)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isCustomUrl && allowCustom && (
        <Input
          value={customUrl}
          onChange={(e) => {
            setCustomUrl(e.target.value);
            if (onCustomUrlChange) {
              onCustomUrlChange(e.target.value);
            }
          }}
          placeholder="Enter custom webhook URL"
        />
      )}

      {selectedWebhook && (
        <p className="text-sm text-muted-foreground">
          Using: {selectedWebhook.url}
        </p>
      )}
    </div>
  );
};

