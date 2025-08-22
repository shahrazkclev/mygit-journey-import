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
    transition,
  };

  const handleDoubleClick = () => {
    if (element.type === 'text' || element.type === 'button') {
      setIsEditing(true);
      setEditValue(element.content);
    }
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

    if (isEditing && (element.type === 'text' || element.type === 'button')) {
      const EditComponent = element.type === 'text' && element.content.length > 50 ? Textarea : Input;
      
      return (
        <EditComponent
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full"
          style={{
            fontSize: element.styles.fontSize,
            fontWeight: element.styles.fontWeight,
            color: element.styles.color,
            textAlign: element.styles.textAlign,
          }}
        />
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
          <div style={{ textAlign: element.styles.textAlign || 'center' }}>
            <img
              src={element.content || 'https://via.placeholder.com/400x200'}
              alt="Email content"
              style={commonStyles}
              className="max-w-full h-auto"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x200/cccccc/666666?text=Image';
              }}
            />
          </div>
        );
      
      case 'spacer':
        return (
          <div
            style={{
              ...commonStyles,
              backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
              border: isSelected ? '2px dashed #ccc' : '2px dashed transparent',
              minHeight: element.styles.height || '40px',
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
      {...listeners}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative group mb-2 rounded transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-50",
        "hover:ring-1 hover:ring-gray-300"
      )}
    >
      {isSelected && !isEditing && (
        <div className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
          {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
        </div>
      )}
      {renderElement()}
    </div>
  );
};