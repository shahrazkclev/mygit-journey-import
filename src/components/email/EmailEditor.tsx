import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Save, Type, Square, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DraggableElement } from './editor/DraggableElement';
import { ElementToolbar } from './editor/ElementToolbar';
import { EmailPreview } from './editor/EmailPreview';

export interface EmailElement {
  id: string;
  type: 'text' | 'button' | 'image' | 'spacer';
  content: string;
  styles: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: string;
    width?: string;
    height?: string;
  };
  gridPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface EmailEditorProps {
  onSave?: (elements: EmailElement[], htmlContent: string) => void;
  initialElements?: EmailElement[];
  htmlContent?: string;
}

export const EmailEditor: React.FC<EmailEditorProps> = ({ 
  onSave, 
  initialElements = [],
  htmlContent
}) => {
  // Parse HTML content into elements if provided
  const parseHtmlToElements = useCallback((html: string): EmailElement[] => {
    if (!html) return [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const elements: EmailElement[] = [];
      
      // Extract text content and basic elements
      const bodyContent = doc.body;
      if (bodyContent) {
        const headings = bodyContent.querySelectorAll('h1, h2, h3');
        const paragraphs = bodyContent.querySelectorAll('p');
        const buttons = bodyContent.querySelectorAll('a[style*="background"], button');
        const images = bodyContent.querySelectorAll('img');
        
        let elementIndex = 0;
        
        // Add headings as text elements
        headings.forEach((heading, index) => {
          if (heading.textContent?.trim()) {
            elements.push({
              id: `parsed-heading-${elementIndex++}`,
              type: 'text',
              content: heading.textContent.trim(),
              styles: {
                fontSize: heading.tagName === 'H1' ? '24px' : heading.tagName === 'H2' ? '20px' : '18px',
                fontWeight: 'bold',
                color: '#333333',
                textAlign: 'center',
                padding: '16px',
              },
              gridPosition: { x: 0, y: index * 2, width: 12, height: 2 }
            });
          }
        });
        
        // Add paragraphs as text elements
        paragraphs.forEach((p, index) => {
          if (p.textContent?.trim() && p.textContent.length > 10) {
            elements.push({
              id: `parsed-text-${elementIndex++}`,
              type: 'text',
              content: p.textContent.trim(),
              styles: {
                fontSize: '16px',
                color: '#666666',
                padding: '16px',
                textAlign: 'left',
              },
              gridPosition: { x: 0, y: (elements.length) * 2, width: 12, height: 3 }
            });
          }
        });
        
        // Add buttons
        buttons.forEach((button, index) => {
          if (button.textContent?.trim()) {
            elements.push({
              id: `parsed-button-${elementIndex++}`,
              type: 'button',
              content: button.textContent.trim(),
              styles: {
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: '#6A7059',
                padding: '12px 24px',
                textAlign: 'center',
                borderRadius: '8px',
              },
              gridPosition: { x: 0, y: (elements.length) * 2, width: 4, height: 2 }
            });
          }
        });
        
        // Add images
        images.forEach((img, index) => {
          const src = img.getAttribute('src');
          if (src) {
            elements.push({
              id: `parsed-image-${elementIndex++}`,
              type: 'image',
              content: src,
              styles: {
                textAlign: 'center',
                padding: '16px',
              },
              gridPosition: { x: 0, y: (elements.length) * 2, width: 12, height: 4 }
            });
          }
        });
      }
      
      return elements.length > 0 ? elements : [];
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return [];
    }
  }, []);

  const [elements, setElements] = useState<EmailElement[]>(() => {
    // Priority: initialElements > parsed HTML > default elements
    if (initialElements.length > 0) {
      return initialElements;
    } else if (htmlContent) {
      const parsed = parseHtmlToElements(htmlContent);
      if (parsed.length > 0) {
        return parsed;
      }
    }
    
    // Default elements if nothing else is available
    return [
      {
        id: '1',
        type: 'text',
        content: 'Welcome to our newsletter!',
        styles: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333333',
          textAlign: 'center',
          padding: '20px',
        },
        gridPosition: { x: 0, y: 0, width: 12, height: 2 }
      },
      {
        id: '2',
        type: 'text',
        content: 'This is your email content. Click to edit this text and make it your own.',
        styles: {
          fontSize: '16px',
          color: '#666666',
          padding: '16px',
          textAlign: 'left',
        },
        gridPosition: { x: 0, y: 2, width: 12, height: 3 }
      }
    ];
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setElements((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  const addElement = (type: EmailElement['type']) => {
    const newElement: EmailElement = {
      id: Date.now().toString(),
      type,
      content: type === 'button' ? 'Click Me' : 
               type === 'text' ? 'New text block' :
               type === 'image' ? 'https://via.placeholder.com/400x200' : '',
      styles: {
        fontSize: type === 'button' ? '16px' : '14px',
        color: type === 'button' ? '#ffffff' : '#333333',
        backgroundColor: type === 'button' ? '#6A7059' : 'transparent',
        padding: type === 'button' ? '12px 24px' : '16px',
        textAlign: 'center',
        borderRadius: type === 'button' ? '8px' : '0px',
        ...(type === 'spacer' && { height: '40px' })
      },
      gridPosition: { 
        x: 0, 
        y: elements.length > 0 ? Math.max(...elements.map(e => e.gridPosition.y + e.gridPosition.height)) : 0, 
        width: type === 'button' ? 4 : 12, 
        height: type === 'spacer' ? 1 : 2 
      }
    };
    
    setElements(prev => [...prev, newElement]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} element added`);
  };

  const updateElement = (id: string, updates: Partial<EmailElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
    toast.success('Element deleted');
  };

  const generateHTML = useCallback(() => {
    const sortedElements = [...elements].sort((a, b) => 
      a.gridPosition.y - b.gridPosition.y || a.gridPosition.x - b.gridPosition.x
    );

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email</title>
          <style>
            body { margin: 0; padding: 24px; background: #F5F5F0; font-family: 'Inter', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; }
            .element { display: block; width: 100%; box-sizing: border-box; }
            .text-element { line-height: 1.5; }
            .button-element { display: inline-block; text-decoration: none; font-weight: 600; }
            .image-element { max-width: 100%; height: auto; }
            .spacer-element { display: block; }
          </style>
        </head>
        <body>
          <div class="container">
            ${sortedElements.map(element => {
              const styleString = Object.entries(element.styles)
                .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
                .join('; ');

              switch (element.type) {
                case 'text':
                  return `<div class="element text-element" style="${styleString}">${element.content}</div>`;
                case 'button':
                  return `<div style="text-align: ${element.styles.textAlign || 'center'}; padding: 16px;"><a href="#" class="element button-element" style="${styleString}">${element.content}</a></div>`;
                case 'image':
                  return `<div style="text-align: ${element.styles.textAlign || 'center'}; padding: 16px;"><img src="${element.content}" class="element image-element" style="${styleString}" alt="Email image" /></div>`;
                case 'spacer':
                  return `<div class="element spacer-element" style="${styleString}"></div>`;
                default:
                  return '';
              }
            }).join('')}
          </div>
        </body>
      </html>
    `;

    return emailHTML;
  }, [elements]);

  const handleSave = () => {
    const htmlContent = generateHTML();
    onSave?.(elements, htmlContent);
    toast.success('Email saved successfully!');
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card p-4 overflow-y-auto">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('text')}
                className="w-full justify-start"
              >
                <Type className="h-4 w-4 mr-2" />
                Text Block
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('button')}
                className="w-full justify-start"
              >
                <Square className="h-4 w-4 mr-2" />
                Button
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('image')}
                className="w-full justify-start"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('spacer')}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Spacer
              </Button>
            </CardContent>
          </Card>

          {selectedElementData && (
            <ElementToolbar
              element={selectedElementData}
              onUpdate={(updates) => updateElement(selectedElement!, updates)}
              onDelete={() => deleteElement(selectedElement!)}
            />
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Email Editor</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {showPreview ? (
            <EmailPreview htmlContent={generateHTML()} />
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="bg-background border border-border rounded-lg min-h-96 p-4" onClick={() => setSelectedElement(null)}>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={elements.map(el => el.id)}
                    strategy={rectSortingStrategy}
                  >
                    {elements.map((element) => (
                      <DraggableElement
                        key={element.id}
                        element={element}
                        isSelected={selectedElement === element.id}
                        onSelect={() => {
                          // Clear previous selection first
                          setSelectedElement(selectedElement === element.id ? null : element.id);
                        }}
                        onUpdate={(updates) => updateElement(element.id, updates)}
                      />
                    ))}
                  </SortableContext>

                  <DragOverlay>
                    {activeId ? (
                      <DraggableElement
                        element={elements.find(el => el.id === activeId)!}
                        isSelected={false}
                        onSelect={() => {}}
                        onUpdate={() => {}}
                        isDragging
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};