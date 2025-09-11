import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, Save, X, Type, Palette, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface InlineEditorProps {
  htmlContent: string;
  onUpdate: (newHtml: string) => void;
}

export const InlineEmailEditor: React.FC<InlineEditorProps> = ({ htmlContent, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStyle, setEditStyle] = useState<any>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && isEditing) {
      setupIframeEditing();
    }
  }, [htmlContent, isEditing]);

  const setupIframeEditing = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    
    // Add editing styles to iframe
    const style = doc.createElement('style');
    style.textContent = `
      .editable-hover {
        outline: 2px dashed #3b82f6 !important;
        cursor: pointer !important;
        position: relative !important;
      }
      .editable-active {
        outline: 2px solid #3b82f6 !important;
        background: rgba(59, 130, 246, 0.1) !important;
      }
      .edit-overlay {
        position: absolute !important;
        top: -30px !important;
        left: 0 !important;
        background: white !important;
        border: 1px solid #ccc !important;
        border-radius: 4px !important;
        padding: 4px 8px !important;
        font-size: 12px !important;
        color: #666 !important;
        z-index: 1000 !important;
        pointer-events: none !important;
      }
    `;
    doc.head.appendChild(style);

    // Make text elements editable
    const textElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a');
    textElements.forEach(element => {
      const el = element as HTMLElement;
      
      // Skip if element has no text content or is too small
      if (!el.textContent?.trim() || el.textContent.trim().length < 2) return;
      
      // Skip if element has children with text (to avoid nested editing)
      const hasTextChildren = Array.from(el.children).some(child => 
        child.textContent && child.textContent.trim().length > 2
      );
      if (hasTextChildren) return;

      el.addEventListener('mouseenter', () => {
        if (isEditing && !editingElement) {
          el.classList.add('editable-hover');
          
          // Add edit indicator
          const overlay = doc.createElement('div');
          overlay.className = 'edit-overlay';
          overlay.textContent = 'Click to edit';
          el.style.position = 'relative';
          el.appendChild(overlay);
        }
      });

      el.addEventListener('mouseleave', () => {
        el.classList.remove('editable-hover');
        const overlay = el.querySelector('.edit-overlay');
        if (overlay) overlay.remove();
      });

      el.addEventListener('click', (e) => {
        if (isEditing && !editingElement) {
          e.preventDefault();
          e.stopPropagation();
          startEditing(el);
        }
      });
    });
  };

  const startEditing = (element: HTMLElement) => {
    setEditingElement(element);
    setEditValue(element.textContent || '');
    
    // Get computed styles
    const styles = window.getComputedStyle(element);
    setEditStyle({
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      color: styles.color,
      textAlign: styles.textAlign,
      backgroundColor: styles.backgroundColor,
    });

    element.classList.add('editable-active');
  };

  const saveEdit = () => {
    if (!editingElement) return;

    // Update the element content
    editingElement.textContent = editValue;
    
    // Apply style changes
    Object.entries(editStyle).forEach(([property, value]) => {
      if (value && typeof value === 'string') {
        (editingElement.style as any)[property] = value;
      }
    });

    // Get updated HTML
    const iframe = iframeRef.current;
    if (iframe && iframe.contentDocument) {
      const newHtml = iframe.contentDocument.documentElement.outerHTML;
      onUpdate(newHtml);
    }

    cancelEdit();
  };

  const cancelEdit = () => {
    if (editingElement) {
      editingElement.classList.remove('editable-active');
    }
    setEditingElement(null);
    setEditValue('');
    setEditStyle({});
  };

  const rgbToHex = (rgb: string): string => {
    if (rgb.startsWith('#')) return rgb;
    
    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';
    
    return '#' + result.map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Email Preview</h3>
        <Button
          variant={isEditing ? "default" : "outline"}
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-2"
        >
          <Edit3 className="h-4 w-4" />
          <span>{isEditing ? 'Exit Edit Mode' : 'Edit Mode'}</span>
        </Button>
      </div>

      {isEditing && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-2">
            📝 Edit Mode Active
          </p>
          <p className="text-xs text-blue-600">
            Hover over text elements and click to edit them directly. You can change content, colors, and formatting.
          </p>
        </div>
      )}

      <div className="border rounded-lg bg-white overflow-hidden relative">
        <iframe
          ref={iframeRef}
          title="Email preview"
          sandbox="allow-same-origin allow-scripts"
          onLoad={() => {
            // Prevent postMessage errors
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.onerror = () => false;
            }
          }}
          srcDoc={htmlContent}
          className="w-full h-[600px] border-0"
        />

        {/* Editing Panel */}
        {editingElement && (
          <Card className="absolute top-4 right-4 p-4 bg-white shadow-lg border-2 border-blue-200 min-w-80">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">Edit Element</h4>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Content</label>
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Font Size</label>
                    <Select
                      value={editStyle.fontSize || '16px'}
                      onValueChange={(value) => setEditStyle(prev => ({ ...prev, fontSize: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
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

                  <div>
                    <label className="text-xs font-medium text-gray-600">Font Weight</label>
                    <Select
                      value={editStyle.fontWeight || 'normal'}
                      onValueChange={(value) => setEditStyle(prev => ({ ...prev, fontWeight: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Text Color</label>
                  <ColorPicker
                    value={rgbToHex(editStyle.color || '#000000')}
                    onChange={(color) => setEditStyle(prev => ({ ...prev, color }))}
                    label="Text Color"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Text Alignment</label>
                  <div className="flex gap-1">
                    <Button
                      variant={editStyle.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditStyle(prev => ({ ...prev, textAlign: 'left' }))}
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={editStyle.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditStyle(prev => ({ ...prev, textAlign: 'center' }))}
                    >
                      <AlignCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={editStyle.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditStyle(prev => ({ ...prev, textAlign: 'right' }))}
                    >
                      <AlignRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEdit} size="sm" className="flex-1">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};