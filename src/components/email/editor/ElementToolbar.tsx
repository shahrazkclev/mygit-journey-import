import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { EmailElement } from '../EmailEditor';

interface ElementToolbarProps {
  element: EmailElement;
  onUpdate: (updates: Partial<EmailElement>) => void;
  onDelete: () => void;
}

export const ElementToolbar: React.FC<ElementToolbarProps> = ({
  element,
  onUpdate,
  onDelete
}) => {
  const updateStyles = (styleUpdates: Partial<EmailElement['styles']>) => {
    onUpdate({
      styles: { ...element.styles, ...styleUpdates }
    });
  };

  const updateContent = (content: string) => {
    onUpdate({ content });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Edit {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content */}
        {(element.type === 'text' || element.type === 'button') && (
          <div className="space-y-2">
            <Label>Content</Label>
            {element.type === 'text' && element.content.length > 50 ? (
              <Textarea
                value={element.content}
                onChange={(e) => updateContent(e.target.value)}
                placeholder="Enter text content..."
                rows={3}
              />
            ) : (
              <Input
                value={element.content}
                onChange={(e) => updateContent(e.target.value)}
                placeholder={element.type === 'button' ? 'Button text' : 'Text content'}
              />
            )}
          </div>
        )}

        {element.type === 'image' && (
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={element.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        )}

        {/* Text Alignment */}
        <div className="space-y-2">
          <Label>Alignment</Label>
          <div className="flex gap-1">
            <Button
              variant={element.styles.textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateStyles({ textAlign: 'left' })}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={element.styles.textAlign === 'center' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateStyles({ textAlign: 'center' })}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={element.styles.textAlign === 'right' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateStyles({ textAlign: 'right' })}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Font Size */}
        {(element.type === 'text' || element.type === 'button') && (
          <div className="space-y-2">
            <Label>Font Size</Label>
            <Select
              value={element.styles.fontSize || '16px'}
              onValueChange={(value) => updateStyles({ fontSize: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12px">12px</SelectItem>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
                <SelectItem value="24px">24px</SelectItem>
                <SelectItem value="28px">28px</SelectItem>
                <SelectItem value="32px">32px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Font Weight */}
        {(element.type === 'text' || element.type === 'button') && (
          <div className="space-y-2">
            <Label>Font Weight</Label>
            <Select
              value={element.styles.fontWeight || 'normal'}
              onValueChange={(value) => updateStyles({ fontWeight: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="500">Medium</SelectItem>
                <SelectItem value="600">Semi Bold</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Text Color */}
        {(element.type === 'text' || element.type === 'button') && (
          <div className="space-y-2">
            <Label>Text Color</Label>
            <ColorPicker
              value={element.styles.color || '#333333'}
              onChange={(color) => updateStyles({ color })}
              label="Text Color"
            />
          </div>
        )}

        {/* Background Color */}
        {element.type === 'button' && (
          <div className="space-y-2">
            <Label>Background Color</Label>
            <ColorPicker
              value={element.styles.backgroundColor || '#6A7059'}
              onChange={(color) => updateStyles({ backgroundColor: color })}
              label="Background Color"
            />
          </div>
        )}

        {/* Border Radius */}
        {element.type === 'button' && (
          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Select
              value={element.styles.borderRadius || '8px'}
              onValueChange={(value) => updateStyles({ borderRadius: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">0px (Square)</SelectItem>
                <SelectItem value="4px">4px (Slightly rounded)</SelectItem>
                <SelectItem value="8px">8px (Rounded)</SelectItem>
                <SelectItem value="12px">12px (More rounded)</SelectItem>
                <SelectItem value="50px">50px (Pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spacer Height */}
        {element.type === 'spacer' && (
          <div className="space-y-2">
            <Label>Height</Label>
            <Select
              value={element.styles.height || '40px'}
              onValueChange={(value) => updateStyles({ height: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20px">20px (Small)</SelectItem>
                <SelectItem value="40px">40px (Medium)</SelectItem>
                <SelectItem value="60px">60px (Large)</SelectItem>
                <SelectItem value="80px">80px (Extra Large)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Padding */}
        <div className="space-y-2">
          <Label>Padding</Label>
          <Select
            value={element.styles.padding || '16px'}
            onValueChange={(value) => updateStyles({ padding: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8px">8px (Small)</SelectItem>
              <SelectItem value="16px">16px (Medium)</SelectItem>
              <SelectItem value="24px">24px (Large)</SelectItem>
              <SelectItem value="32px">32px (Extra Large)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};