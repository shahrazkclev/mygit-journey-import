import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Eye, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  category: string | null;
  description: string | null;
  placeholders: string[] | null;
}

export const EmailTemplateManager: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

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
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setHtmlContent('');
    setCategory('');
    setDescription('');
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setHtmlContent(template.html_content);
    setCategory(template.category || '');
    setDescription(template.description || '');
  };

  const handleSave = async () => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      if (!name.trim() || !subject.trim() || !htmlContent.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Extract placeholders from content
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      const placeholders: string[] = [];
      let match;
      while ((match = placeholderRegex.exec(htmlContent + subject)) !== null) {
        if (!placeholders.includes(match[1])) {
          placeholders.push(match[1]);
        }
      }

      const templateData = {
        user_id: user.id,
        name: name.trim(),
        subject: subject.trim(),
        html_content: htmlContent.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        placeholders: placeholders.length > 0 ? placeholders : null,
      };

      if (editingTemplate?.id) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(templateData);

        if (error) throw error;
        toast.success('Template created');
      }

      await loadTemplates();
      handleCreate();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted');
      await loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    // Replace placeholders with sample data
    const sampleData = {
      name: 'John Doe',
      email: 'john@example.com',
      contact_id: '123e4567-e89b-12d3-a456-426614174000',
      first_name: 'John',
      last_name: 'Doe',
    };

    let preview = template.html_content;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    setPreviewContent(preview);
    setShowPreview(true);
  };

  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Templates</TabsTrigger>
          <TabsTrigger value="create">
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No templates yet. Create your first one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.category && (
                          <Badge variant="outline" className="mt-2">{template.category}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleEdit(template);
                            // Switch to create tab
                            document.querySelector('[value="create"]')?.click();
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Subject: {template.subject}
                    </p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    {template.placeholders && template.placeholders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.placeholders.map(placeholder => (
                          <Badge key={placeholder} variant="secondary" className="text-xs">
                            {`{{${placeholder}}}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-name">Name *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat || ''}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Or type new category"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="template-subject">Subject *</Label>
                <Input
                  id="template-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject (supports {{name}}, {{email}}, etc.)"
                />
              </div>
              <div>
                <Label htmlFor="template-html">HTML Content *</Label>
                <Textarea
                  id="template-html"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Email HTML content (supports {{name}}, {{email}}, {{contact_id}}, etc.)"
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available placeholders: {`{{name}}`, `{{email}}`, `{{contact_id}}`, `{{first_name}}`, `{{last_name}}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
                <Button variant="outline" onClick={handleCreate}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

