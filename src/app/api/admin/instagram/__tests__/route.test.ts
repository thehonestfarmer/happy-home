import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createAndPublishCarousel, publishCarousel } from '@/server/instagram/api';
import { readListings } from '@/app/api/cron/update-listings/listings-manager';

// Mock dependencies
jest.mock('@/lib/instagram/api');
jest.mock('@/app/api/cron/update-listings/listings-manager');

const mockCreateAndPublishCarousel = createAndPublishCarousel as jest.MockedFunction<typeof createAndPublishCarousel>;
const mockPublishCarousel = publishCarousel as jest.MockedFunction<typeof publishCarousel>;
const mockReadListings = readListings as jest.MockedFunction<typeof readListings>;

describe('Instagram API Route', () => {
  const env = process.env;
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Mock environment variables
    process.env = {
      ...env,
      INSTAGRAM_ACCESS_TOKEN: 'test-token'
    };
    
    // Mock listings data
    mockReadListings.mockResolvedValue({
      newListings: {
        'test-listing-id': {
          id: 'test-listing-id',
          addresses: 'Test Address',
          tags: 'test,tags',
          listingDetail: 'Test listing details',
          prices: '$100,000',
          layout: '2+1',
          buildSqMeters: '80',
          landSqMeters: '120',
          listingImages: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
          ]
        }
      }
    });
    
    // Mock successful carousel creation
    mockCreateAndPublishCarousel.mockResolvedValue('test-post-id');
    mockPublishCarousel.mockResolvedValue('test-post-id');
  });
  
  afterEach(() => {
    process.env = env;
  });
  
  it('should successfully post to Instagram using the legacy flow', async () => {
    // Create request
    const request = new NextRequest('http://localhost/api/admin/instagram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        listingId: 'test-listing-id',
        selectedImages: ['https://example.com/image1.jpg'],
        caption: 'Test caption',
        tags: ['realestate', 'property']
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.postId).toBe('test-post-id');
    expect(data.data.imageCount).toBe(1);
    
    // Verify the API call
    expect(mockCreateAndPublishCarousel).toHaveBeenCalledWith(
      ['https://example.com/image1.jpg'],
      expect.stringContaining('Test caption')
    );
  });
  
  it('should successfully publish an Instagram carousel with container IDs', async () => {
    // Create request with the publish endpoint
    const request = new NextRequest('http://localhost/api/admin/instagram/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        containerIds: ['container-id-1', 'container-id-2'],
        caption: 'Test carousel caption #realestate'
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.postId).toBe('test-post-id');
    expect(data.data.imageCount).toBe(2);
    
    // Verify the API call
    expect(mockPublishCarousel).toHaveBeenCalledWith(
      ['container-id-1', 'container-id-2'],
      'Test carousel caption #realestate'
    );
  });
  
  it('should validate container IDs for the publish endpoint', async () => {
    // Create request with missing container IDs
    const request = new NextRequest('http://localhost/api/admin/instagram/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        containerIds: [],
        caption: 'Test caption'
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the error response
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required parameter: containerIds');
  });
  
  it('should validate the Instagram access token', async () => {
    // Remove access token
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    
    // Create request
    const request = new NextRequest('http://localhost/api/admin/instagram', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'test-listing-id',
        selectedImages: ['https://example.com/image1.jpg'],
        caption: 'Test caption',
        tags: []
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the error response
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Instagram API credentials not configured');
  });
  
  it('should validate required parameters for the legacy flow', async () => {
    // Create request with missing parameters
    const request = new NextRequest('http://localhost/api/admin/instagram', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'test-listing-id',
        selectedImages: [], // Empty array
        caption: 'Test caption',
        tags: []
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the error response
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required parameters');
  });
  
  it('should validate the listing exists for the legacy flow', async () => {
    // Create request with invalid listing ID
    const request = new NextRequest('http://localhost/api/admin/instagram', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'invalid-listing-id',
        selectedImages: ['https://example.com/image1.jpg'],
        caption: 'Test caption',
        tags: []
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the error response
    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Listing with ID invalid-listing-id not found');
  });
  
  it('should handle API errors properly', async () => {
    // Mock API error
    mockPublishCarousel.mockRejectedValue(new Error('Instagram API failed'));
    
    // Create request for the publish endpoint
    const request = new NextRequest('http://localhost/api/admin/instagram/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        containerIds: ['container-id-1'],
        caption: 'Test caption'
      })
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the error response
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Instagram API failed');
  });
}); 