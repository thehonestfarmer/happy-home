import { useState, useRef, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  suggestedTags?: string[];
}

// Default real estate related tags that are commonly used
const DEFAULT_SUGGESTED_TAGS = [
  'realestate', 'property', 'home', 'house', 'apartment', 'condo', 
  'luxuryhomes', 'dreamhome', 'newhome', 'investment', 'realtor', 
  'forsale', 'homesale', 'homesweethome', 'interiordesign', 'architecture',
  'luxurylifestyle', 'propertyforsale', 'househunting'
];

/**
 * A component for inputting and managing hashtags for Instagram posts
 */
export default function TagInput({
  tags,
  onChange,
  label = 'Tags',
  placeholder = 'Type a tag and press Enter',
  maxTags = 30,
  className,
  suggestedTags = DEFAULT_SUGGESTED_TAGS
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Filter out already added tags from suggestions
  const filteredSuggestions = suggestedTags.filter(tag => !tags.includes(tag));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove # symbols from input as we'll add them automatically
    setInputValue(e.target.value.replace(/^#+/, ''));
  };

  const addTag = (tag: string) => {
    tag = tag.trim().replace(/^#+/, '');
    
    // Skip if tag is empty or already exists
    if (!tag || tags.includes(tag) || tags.length >= maxTags) {
      return;
    }
    
    const newTags = [...tags, tag];
    onChange(newTags);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag when backspace is pressed on empty input
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">
          {label} ({tags.length}/{maxTags})
        </label>
        {tags.length >= maxTags && (
          <p className="text-xs text-orange-500">
            Maximum tags reached ({maxTags})
          </p>
        )}
      </div>
      
      <div 
        className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[80px] cursor-text"
        onClick={focusInput}
      >
        {tags.map((tag, index) => (
          <div 
            key={`${tag}-${index}`}
            className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-primary/70 hover:text-primary focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-grow min-w-[120px] outline-none border-none bg-transparent text-sm"
          disabled={tags.length >= maxTags}
        />
      </div>
      
      {filteredSuggestions.length > 0 && tags.length < maxTags && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Suggested tags</label>
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.slice(0, 12).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs"
              >
                <Plus className="h-3 w-3" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 