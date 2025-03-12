import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageSelector from '../ImageSelector';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock ScrollArea component
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

describe('ImageSelector Component', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];
  
  const mockOnSelectionChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders all images correctly in a scrollable container', () => {
    render(
      <ImageSelector 
        images={mockImages} 
        onSelectionChange={mockOnSelectionChange} 
        maxHeight="500px"
      />
    );
    
    // Check if the scroll area is rendered
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    
    // Check if all images are rendered
    expect(screen.getAllByRole('img')).toHaveLength(mockImages.length);
    
    // Check if the available photos count is shown
    expect(screen.getByText(`${mockImages.length} photos available`)).toBeInTheDocument();
  });
  
  it('handles image selection correctly', () => {
    render(
      <ImageSelector 
        images={mockImages} 
        onSelectionChange={mockOnSelectionChange} 
      />
    );
    
    // Select the first image
    const firstImageContainer = screen.getAllByRole('img')[0].parentElement;
    fireEvent.click(firstImageContainer!);
    
    // Check if onSelectionChange was called with the correct image
    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockImages[0]]);
    
    // Select the second image
    const secondImageContainer = screen.getAllByRole('img')[1].parentElement;
    fireEvent.click(secondImageContainer!);
    
    // Check if onSelectionChange was called with both images
    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockImages[0], mockImages[1]]);
  });
  
  it('handles image deselection correctly', () => {
    render(
      <ImageSelector 
        images={mockImages} 
        onSelectionChange={mockOnSelectionChange}
        initialSelectedImages={[mockImages[0]]}
      />
    );
    
    // Deselect the first image
    const firstImageContainer = screen.getAllByRole('img')[0].parentElement;
    fireEvent.click(firstImageContainer!);
    
    // Check if onSelectionChange was called with empty array
    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });
  
  it('respects the maxSelection limit', () => {
    render(
      <ImageSelector 
        images={mockImages} 
        onSelectionChange={mockOnSelectionChange}
        maxSelection={1}
      />
    );
    
    // Select the first image
    const firstImageContainer = screen.getAllByRole('img')[0].parentElement;
    fireEvent.click(firstImageContainer!);
    
    // Try to select the second image
    const secondImageContainer = screen.getAllByRole('img')[1].parentElement;
    fireEvent.click(secondImageContainer!);
    
    // Check if onSelectionChange was only called once with the first image
    expect(mockOnSelectionChange).toHaveBeenCalledTimes(1);
    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockImages[0]]);
  });
  
  it('clears selection when clear button is clicked', () => {
    render(
      <ImageSelector 
        images={mockImages} 
        onSelectionChange={mockOnSelectionChange}
        initialSelectedImages={[mockImages[0]]}
      />
    );
    
    // Check if the clear button exists
    const clearButton = screen.getByText('Clear selection');
    expect(clearButton).toBeInTheDocument();
    
    // Click the clear button
    fireEvent.click(clearButton);
    
    // Check if onSelectionChange was called with an empty array
    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });
  
  it('shows empty state when no images are provided', () => {
    render(
      <ImageSelector 
        images={[]} 
        onSelectionChange={mockOnSelectionChange} 
      />
    );
    
    // Check if the empty state message is shown
    expect(screen.getByText('No images available for this listing')).toBeInTheDocument();
    
    // Scroll area should not be rendered for empty images
    expect(screen.queryByTestId('scroll-area')).not.toBeInTheDocument();
  });
}); 