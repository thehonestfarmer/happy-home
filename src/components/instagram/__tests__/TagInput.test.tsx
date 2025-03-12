import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TagInput from '../TagInput';

describe('TagInput Component', () => {
  const mockOnChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders with initial tags', () => {
    const initialTags = ['react', 'nextjs', 'typescript'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Check if all initial tags are rendered
    initialTags.forEach(tag => {
      expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
    });
  });
  
  it('adds a new tag when typing and pressing Enter', () => {
    const initialTags: string[] = [];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Type a new tag
    const input = screen.getByPlaceholderText('Type a tag and press Enter');
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Check if onChange was called with the new tag
    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });
  
  it('handles # symbol in tag input', () => {
    const initialTags: string[] = [];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Type a new tag with # prefix
    const input = screen.getByPlaceholderText('Type a tag and press Enter');
    fireEvent.change(input, { target: { value: '#newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Check if onChange was called with the tag without # prefix
    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });
  
  it('removes a tag when clicking its remove button', () => {
    const initialTags = ['react', 'nextjs', 'typescript'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Click the remove button of the second tag
    const removeButtons = screen.getAllByRole('button');
    const tagRemoveButtons = removeButtons.filter(button => button.querySelector('svg'));
    fireEvent.click(tagRemoveButtons[1]);
    
    // Check if onChange was called with the correct remaining tags
    expect(mockOnChange).toHaveBeenCalledWith(['react', 'typescript']);
  });
  
  it('removes the last tag when pressing backspace on empty input', () => {
    const initialTags = ['react', 'nextjs'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Press backspace on empty input
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });
    
    // Check if onChange was called with only the first tag
    expect(mockOnChange).toHaveBeenCalledWith(['react']);
  });
  
  it('respects the maxTags limit', () => {
    const initialTags = ['tag1', 'tag2'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange}
        maxTags={2}
      />
    );
    
    // Input should be disabled when max tags reached
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    
    // Verify the max tags message is displayed
    expect(screen.getByText('Maximum tags reached (2)')).toBeInTheDocument();
  });
  
  it('ignores duplicate tags', () => {
    const initialTags = ['react'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Try to add a duplicate tag
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // onChange should not be called for duplicate
    expect(mockOnChange).not.toHaveBeenCalled();
  });
  
  it('ignores empty tags', () => {
    const initialTags: string[] = [];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange} 
      />
    );
    
    // Try to add an empty tag
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // onChange should not be called for empty tag
    expect(mockOnChange).not.toHaveBeenCalled();
  });
  
  it('renders suggested tags correctly', () => {
    const initialTags: string[] = [];
    const customSuggestedTags = ['custom1', 'custom2', 'custom3'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange}
        suggestedTags={customSuggestedTags}
      />
    );
    
    // Suggested tags section should be visible
    expect(screen.getByText('Suggested tags')).toBeInTheDocument();
    
    // All suggested tags should be rendered
    customSuggestedTags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });
  
  it('adds a suggested tag when clicked', () => {
    const initialTags: string[] = [];
    const customSuggestedTags = ['custom1', 'custom2', 'custom3'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange}
        suggestedTags={customSuggestedTags}
      />
    );
    
    // Click on the first suggested tag
    fireEvent.click(screen.getByText('custom1'));
    
    // Check if onChange was called with the suggested tag
    expect(mockOnChange).toHaveBeenCalledWith(['custom1']);
  });
  
  it('filters out already added tags from suggestions', () => {
    const initialTags = ['custom1'];
    const customSuggestedTags = ['custom1', 'custom2', 'custom3'];
    
    render(
      <TagInput 
        tags={initialTags} 
        onChange={mockOnChange}
        suggestedTags={customSuggestedTags}
      />
    );
    
    // The already added tag should not be in suggestions
    const suggestionButtons = screen.getAllByRole('button').filter(
      button => button.textContent !== 'custom1' && !button.querySelector('svg.lucide-x')
    );
    
    // Should only show 2 suggested tags now
    expect(suggestionButtons).toHaveLength(2);
    expect(screen.queryByText('custom1', { selector: 'button' })).not.toBeInTheDocument();
    expect(screen.getByText('custom2')).toBeInTheDocument();
    expect(screen.getByText('custom3')).toBeInTheDocument();
  });
}); 