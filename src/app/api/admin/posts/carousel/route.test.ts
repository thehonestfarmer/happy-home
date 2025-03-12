import { NextRequest, NextResponse } from 'next/server';
import { POST, CreateCarouselRequest } from './route';
import { createCarouselContainer } from '@/server/instagram/api';

// Mock the Instagram API functions
jest.mock('@/server/instagram/api', () => ({
  createCarouselContainer: jest.fn()
}));

// Mock Next.js Response
jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((input) => {
      return {
        json: jest.fn().mockResolvedValue(input)
      };
    }),
    NextResponse: {
      json: jest.fn().mockImplementation((data, options) => {
        return {
          status: options?.status || 200,
          json: async () => data,
          headers: new Map()
        };
      })
    }
  };
});

describe('POST /api/admin/posts/carousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    (createCarouselContainer as jest.Mock).mockResolvedValue('mock-carousel-container-id');
  });

  it('should create a carousel container with valid container IDs and caption', async () => {
    // Create a mock request
    const requestBody: CreateCarouselRequest = {
      containerIds: ['container-1', 'container-2', 'container-3'],
      caption: 'Test caption with hashtags'
    };
    
    // Mock the request object
    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest;
    
    // Call the handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.containerId).toBe('mock-carousel-container-id');
    
    // Verify Instagram API was called correctly
    expect(createCarouselContainer).toHaveBeenCalledWith(
      requestBody.containerIds,
      requestBody.caption
    );
  });

  it('should return error if no container IDs provided', async () => {
    // Create a mock request with empty containerIds
    const requestBody: CreateCarouselRequest = {
      containerIds: [],
      caption: 'Test caption'
    };
    
    // Mock the request object
    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest;
    
    // Call the handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify error response
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required parameter: containerIds');
    
    // Verify Instagram API was not called
    expect(createCarouselContainer).not.toHaveBeenCalled();
  });

  it('should return error if less than 2 container IDs are provided', async () => {
    // Create a mock request with just one container ID
    const requestBody: CreateCarouselRequest = {
      containerIds: ['container-1'],
      caption: 'Test caption'
    };
    
    // Mock the request object
    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest;
    
    // Call the handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify error response
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Instagram requires at least 2 images for a carousel post');
    
    // Verify Instagram API was not called
    expect(createCarouselContainer).not.toHaveBeenCalled();
  });

  it('should handle errors from createCarouselContainer', async () => {
    // Mock API error
    (createCarouselContainer as jest.Mock).mockRejectedValue(new Error('Error creating carousel container'));
    
    const requestBody: CreateCarouselRequest = {
      containerIds: ['container-1', 'container-2'],
      caption: 'Test caption'
    };
    
    // Mock the request object
    const request = {
      json: jest.fn().mockResolvedValue(requestBody)
    } as unknown as NextRequest;
    
    // Call the handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify error response
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Error creating carousel container');
  });
}); 