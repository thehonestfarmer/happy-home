import { NextRequest, NextResponse } from 'next/server';
import { POST, PublishPostRequest } from './route';
import { publishMedia } from '@/server/instagram/api';

// Mock the Instagram API functions
jest.mock('@/server/instagram/api', () => ({
  publishMedia: jest.fn()
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

describe('POST /api/admin/posts/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    (publishMedia as jest.Mock).mockResolvedValue({ id: 'mock-post-id', status: 'PUBLISHED' });
  });

  it('should publish a post with container ID', async () => {
    // Create a mock request
    const requestBody: PublishPostRequest = {
      containerId: 'carousel-container-id'
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
    expect(data.data.postId).toBe('mock-post-id');
    expect(data.data.status).toBe('PUBLISHED');
    
    // Verify Instagram API was called correctly
    expect(publishMedia).toHaveBeenCalledWith(requestBody.containerId);
  });

  it('should return error if no container ID provided', async () => {
    // Create a mock request with empty containerId
    const requestBody = {
      containerId: ''
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
    expect(data.error).toBe('Missing required parameter: containerId');
    
    // Verify Instagram API was not called
    expect(publishMedia).not.toHaveBeenCalled();
  });

  it('should handle errors from publishMedia', async () => {
    // Mock API error
    (publishMedia as jest.Mock).mockRejectedValue(new Error('Error publishing carousel'));
    
    const requestBody: PublishPostRequest = {
      containerId: 'carousel-container-id'
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
    expect(data.error).toBe('Error publishing carousel');
  });
}); 