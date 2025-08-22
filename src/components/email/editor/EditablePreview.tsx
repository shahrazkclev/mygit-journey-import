import React, { useState, useRef, useEffect } from 'react';
import { Edit3 } from 'lucide-react';

interface EditablePreviewProps {
  htmlContent: string;
  onContentUpdate: (newContent: string) => void;
}

export const EditablePreview: React.FC<EditablePreviewProps> = ({ 
  htmlContent, 
  onContentUpdate 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupEditableElements = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Add click handlers to text elements
      const textElements = iframeDoc.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, span, a');
      
      textElements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const elementId = `editable-${index}`;
        htmlElement.setAttribute('data-editable-id', elementId);
        
        // Add hover effect
        htmlElement.style.position = 'relative';
        htmlElement.addEventListener('mouseenter', () => {
          if (isEditing) return;
          htmlElement.style.outline = '1px dashed #3b82f6';
          htmlElement.style.cursor = 'text';
        });
        
        htmlElement.addEventListener('mouseleave', () => {
          if (isEditing) return;
          htmlElement.style.outline = 'none';
          htmlElement.style.cursor = 'default';
        });

        // Add click to edit
        htmlElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const textContent = htmlElement.textContent || '';
          setEditValue(textContent);
          setIsEditing(elementId);
          
          // Replace with input
          const input = iframeDoc.createElement('input');
          input.value = textContent;
          input.style.cssText = getComputedStyle(htmlElement).cssText;
          input.style.width = '100%';
          input.style.border = '2px solid #3b82f6';
          input.style.outline = 'none';
          input.style.background = 'white';
          
          const saveEdit = () => {
            htmlElement.textContent = input.value;
            htmlElement.style.display = '';
            input.remove();
            setIsEditing(null);
            
            // Update the HTML content
            const newHtml = iframeDoc.documentElement.outerHTML;
            onContentUpdate(newHtml);
          };
          
          input.addEventListener('blur', saveEdit);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveEdit();
            } else if (e.key === 'Escape') {
              htmlElement.style.display = '';
              input.remove();
              setIsEditing(null);
            }
          });
          
          htmlElement.style.display = 'none';
          htmlElement.parentNode?.insertBefore(input, htmlElement);
          input.focus();
          input.select();
        });
      });
    };

    // Setup after iframe loads
    iframe.addEventListener('load', setupEditableElements);
    
    // If already loaded, setup immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      setupEditableElements();
    }

    return () => {
      iframe.removeEventListener('load', setupEditableElements);
    };
  }, [htmlContent, isEditing, onContentUpdate]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="bg-background rounded-lg overflow-hidden shadow-lg border relative">
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1 z-10">
            <Edit3 className="h-3 w-3" />
            Click any text to edit
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-96 border-0"
            title="Editable Email Preview"
            style={{ colorScheme: 'normal' }}
          />
        </div>
      </div>
    </div>
  );
};