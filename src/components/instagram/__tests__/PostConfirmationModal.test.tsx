import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostConfirmationModal from '../PostConfirmationModal';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe('PostConfirmationModal Component', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ];
  
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders properly with initial state', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test', 'example']}
        isSubmitting={false}
        uploadStatuses={[]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Check if the modal title is rendered
    expect(screen.getByText('Confirm Instagram Post')).toBeInTheDocument();
    
    // Check if the images are rendered
    expect(screen.getAllByRole('img')).toHaveLength(mockImages.length);
    
    // Check if the caption is rendered
    expect(screen.getByText('Test caption')).toBeInTheDocument();
    
    // Check if tags are rendered
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#example')).toBeInTheDocument();
    
    // Check if the status shows "Ready to post"
    expect(screen.getByText('Ready to post')).toBeInTheDocument();
    
    // Check if the buttons are rendered
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Post to Instagram')).toBeInTheDocument();
  });
  
  it('shows uploading state correctly', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={true}
        uploadStatuses={[
          { imageUrl: mockImages[0], status: 'uploading' },
          { imageUrl: mockImages[1], status: 'pending' }
        ]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Check if the status shows "Uploading..."
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    
    // Cancel button should not be present during submission
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
  
  it('shows success state correctly', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={true}
        uploadStatuses={[
          { imageUrl: mockImages[0], status: 'success', containerId: 'container-1' },
          { imageUrl: mockImages[1], status: 'success', containerId: 'container-2' }
        ]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Check if the status shows "Ready to publish"
    expect(screen.getByText('Ready to publish')).toBeInTheDocument();
    
    // Publish Now button should be present
    expect(screen.getByText('Publish Now')).toBeInTheDocument();
  });
  
  it('shows publishing state correctly', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={true}
        uploadStatuses={[
          { imageUrl: mockImages[0], status: 'success', containerId: 'container-1' },
          { imageUrl: mockImages[1], status: 'success', containerId: 'container-2' }
        ]}
        isPublishing={true}
        publishSuccess={false}
      />
    );
    
    // Check if the status shows "Publishing to Instagram..."
    expect(screen.getByText('Publishing to Instagram...')).toBeInTheDocument();
    
    // Publishing... button should be present and disabled
    const publishingButton = screen.getByText('Publishing...');
    expect(publishingButton).toBeInTheDocument();
    expect(publishingButton.closest('button')).toBeDisabled();
  });
  
  it('shows error state correctly', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={true}
        uploadStatuses={[
          { imageUrl: mockImages[0], status: 'error', error: 'Failed to upload image' },
          { imageUrl: mockImages[1], status: 'success', containerId: 'container-2' }
        ]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Check if the status shows "Some uploads failed"
    expect(screen.getByText('Some uploads failed')).toBeInTheDocument();
    
    // Error message should be visible
    expect(screen.getByText('Failed to upload image')).toBeInTheDocument();
    
    // Close button should be present for errors
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
  
  it('shows publish success state correctly', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={true}
        uploadStatuses={[
          { imageUrl: mockImages[0], status: 'success', containerId: 'container-1' },
          { imageUrl: mockImages[1], status: 'success', containerId: 'container-2' }
        ]}
        isPublishing={false}
        publishSuccess={true}
      />
    );
    
    // Check if the status shows "Posted successfully!"
    expect(screen.getByText('Posted successfully!')).toBeInTheDocument();
    
    // Done button should be present
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
  
  it('calls onConfirm when Post to Instagram button is clicked', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={false}
        uploadStatuses={[]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Click the Post to Instagram button
    fireEvent.click(screen.getByText('Post to Instagram'));
    
    // onConfirm should be called
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });
  
  it('calls onClose when Cancel button is clicked', () => {
    render(
      <PostConfirmationModal 
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        selectedImages={mockImages}
        caption="Test caption"
        tags={['test']}
        isSubmitting={false}
        uploadStatuses={[]}
        isPublishing={false}
        publishSuccess={false}
      />
    );
    
    // Click the Cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
}); 