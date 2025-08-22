import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { EmailElement } from '../EmailEditor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DraggableElementProps {
  element: EmailElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<EmailElement>) => void;
  isDragging?: boolean;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  isDragging = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(element.content);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.type === 'text' || element.type === 'button') {
      setIsEditing(true);
      setEditValue(element.content);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleSaveEdit = () => {
    onUpdate({ content: editValue });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(element.content);
    }
  };

  const renderElement = () => {
    const commonStyles = {
      ...element.styles,
      cursor: isDragging ? 'grabbing' : 'pointer',
    };

      if (isEditing && (element.type === 'text' || element.type === 'button' || element.type === 'image')) {
        const EditComponent = element.type === 'image' ? Input : 
                            (element.type === 'text' && element.content.length > 50) ? Textarea : Input;
        
        return (
          <div className="bg-transparent p-0">
            <EditComponent
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full border-0 bg-transparent focus:ring-0 focus:outline-none p-0"
              placeholder={element.type === 'image' ? 'Enter image URL...' : 'Enter text...'}
              style={{
                fontSize: element.type !== 'image' ? element.styles.fontSize : undefined,
                fontWeight: element.type !== 'image' ? element.styles.fontWeight : undefined,
                color: element.type !== 'image' ? element.styles.color : undefined,
                textAlign: element.type !== 'image' ? element.styles.textAlign : undefined,
              }}
            />
          </div>
        );
    }

    switch (element.type) {
      case 'text':
        return (
          <div style={commonStyles} className="min-h-8">
            {element.content || 'Empty text block'}
          </div>
        );
      
      case 'button':
        return (
          <div style={{ textAlign: element.styles.textAlign || 'center' }}>
            <span
              style={commonStyles}
              className="inline-block min-w-20 min-h-8 leading-8"
            >
              {element.content || 'Button'}
            </span>
          </div>
        );
      
      case 'image':
        return (
          <div style={{ textAlign: element.styles.textAlign || 'center', position: 'relative' }}>
            <img
              src={element.content || 'https://via.placeholder.com/400x200?text=Click+to+edit+image+URL'}
              alt="Email content"
              style={{
                ...commonStyles,
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: element.styles.textAlign === 'center' ? '0 auto' : '0'
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x200/f0f0f0/999999?text=Image+Not+Found';
              }}
            />
            {isSelected && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                Double-click to edit image URL
              </div>
            )}
          </div>
        );
      
      case 'spacer':
        return (
          <div
            style={{
              backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
              border: isSelected ? '2px dashed #ccc' : '2px dashed transparent',
              minHeight: element.styles.height || '40px',
              padding: '0px'
            }}
            className="w-full flex items-center justify-center text-gray-400 text-sm"
          >
            {isSelected ? 'Spacer' : ''}
          </div>
        );
      
      default:
        return <div>Unknown element type</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!isEditing ? listeners : {})}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative group mb-3 rounded-lg transition-all cursor-pointer",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/30",
        isDragging && "opacity-50 z-50",
        "hover:ring-1 hover:ring-gray-300 hover:shadow-sm",
        !isDragging && "active:scale-[0.98]"
      )}
    >
      {isSelected && !isEditing && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-sm z-10">
          {element.type === 'text' || element.type === 'button' || element.type === 'image' 
            ? 'Double-click to edit' 
            : element.type.charAt(0).toUpperCase() + element.type.slice(1)
          }
        </div>
      )}
      <div className="p-2">
        {renderElement()}
      </div>
    </div>
  );
};