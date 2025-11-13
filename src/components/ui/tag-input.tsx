import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ value, onChange, suggestions = [], placeholder, className, ...props }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

    useEffect(() => {
      if (inputValue && suggestions.length > 0) {
        const inputLower = inputValue.toLowerCase();
        
        // Filter and rank suggestions
        const filtered = suggestions
          .filter(suggestion => 
            suggestion.toLowerCase().includes(inputLower) &&
            !tags.includes(suggestion)
          )
          .sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            
            // Prioritize exact matches (starts with input)
            const aStartsWith = aLower.startsWith(inputLower);
            const bStartsWith = bLower.startsWith(inputLower);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // Then prioritize shorter matches (more specific)
            if (aStartsWith && bStartsWith) {
              return a.length - b.length;
            }
            
            // For partial matches, prioritize by position of match
            const aIndex = aLower.indexOf(inputLower);
            const bIndex = bLower.indexOf(inputLower);
            
            if (aIndex !== bIndex) {
              return aIndex - bIndex;
            }
            
            // Finally, sort alphabetically
            return a.localeCompare(b);
          });
        
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
        setFilteredSuggestions([]);
      }
    }, [inputValue, suggestions, value]); // Use value instead of tags to prevent infinite loop

    const addTag = (tag: string) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (normalizedTag && !tags.includes(normalizedTag)) {
        const newTags = [...tags, normalizedTag];
        onChange(newTags.join(', '));
        setInputValue("");
        setShowSuggestions(false);
      }
    };

    const removeTag = (index: number) => {
      const newTags = tags.filter((_, i) => i !== index);
      onChange(newTags.join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      addTag(suggestion);
    };

    return (
      <div className={cn("relative", className)}>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5 -mx-0.5">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-0.5 h-5 px-1.5 py-0 text-[10px] leading-tight whitespace-nowrap">
                {tag}
                <button
                  type="button"
                  className="h-3 w-3 flex items-center justify-center -mr-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors flex-shrink-0"
                  onClick={() => removeTag(index)}
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <Input
          ref={ref || inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          {...props}
        />
        
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-fluid shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

TagInput.displayName = "TagInput";