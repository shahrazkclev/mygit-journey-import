import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmailTemplateManager } from './EmailTemplateManager';

interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  category: string | null;
}

interface TemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
  onTemplateSelect?: (template: Template) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  value,
  onChange,
  onTemplateSelect,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [user?.id]);

  const loadTemplates = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSelect = (templateId: string) => {
    onChange(templateId);
    if (onTemplateSelect) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        onTemplateSelect(template);
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a template (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None (use custom content)</SelectItem>
          {templates.map(template => (
            <SelectItem key={template.id} value={template.id}>
              {template.name} {template.category && `(${template.category})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogTrigger asChild>
          <Button variant="outline" type="button">
            <Plus className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
          </DialogHeader>
          <EmailTemplateManager onClose={() => {
            setShowManager(false);
            loadTemplates();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

