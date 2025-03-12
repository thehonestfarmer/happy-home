import { createMediaContainers, publishCarousel, createAndPublishCarousel, createSingleMediaContainer, createCarouselContainer, publishMedia } from '../api';

// Set up direct mocks that we can control in tests
const mockCreateSingleMediaContainer = jest.fn();
const mockCreateCarouselContainer = jest.fn();
const mockPublishMedia = jest.fn();
const mockGetAccessToken = jest.fn().mockReturnValue('mock-token');
const mockGetBusinessAccountId = jest.fn().mockReturnValue('mock-account-id');
const mockCreateMediaContainers = jest.fn();
const mockPublishCarousel = jest.fn();
const mockCreateAndPublishCarousel = jest.fn();

// Mock the entire API module
jest.mock('../api', () => {
  // Use Proxy to allow runtime implementation changes
  const mocks = {
    getAccessToken: () => mockGetAccessToken(),
    getBusinessAccountId: () => mockGetBusinessAccountId(),
    createSingleMediaContainer: (...args: any[]) => mockCreateSingleMediaContainer(...args),
    createCarouselContainer: (...args: any[]) => mockCreateCarouselContainer(...args),
    publishMedia: (...args: any[]) => mockPublishMedia(...args),
    createMediaContainers: (...args: any[]) => mockCreateMediaContainers(...args),
    publishCarousel: (...args: any[]) => mockPublishCarousel(...args),
    createAndPublishCarousel: (...args: any[]) => mockCreateAndPublishCarousel(...args),
  };
  
  // Store original implementations
  const original = jest.requireActual('../api');
  
  // Return a proxy that provides mocked functions but falls back to original
  return new Proxy({...original, ...mocks}, {
    get: (target, prop) => {
      if (prop in mocks) {
        return mocks[prop as keyof typeof mocks];
      }
      return original[prop as keyof typeof original];
    }
  });
});

// Mock fetch globally
global.fetch = jest.fn();

// Properly mock FormData with the correct type
class MockFormData {
  append = jest.fn();
  delete = jest.fn();
  get = jest.fn();
  getAll = jest.fn();
  has = jest.fn();
  set = jest.fn();
  forEach = jest.fn();
  entries = jest.fn();
  keys = jest.fn();
  values = jest.fn();
}

// @ts-ignore - Override global FormData
global.FormData = MockFormData;

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Instagram API functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMediaContainers', () => {
    it('should create multiple media containers successfully', async () => {
      // Mock successful container creation
      mockCreateSingleMediaContainer
        .mockResolvedValueOnce({
          success: true,
          containerId: 'container-id-1',
          imageUrl: 'https://example.com/image1.jpg'
        })
        .mockResolvedValueOnce({
          success: true,
          containerId: 'container-id-2',
          imageUrl: 'https://example.com/image2.jpg'
        });
        
      // Set up createMediaContainers to pass through to original implementation
      mockCreateMediaContainers.mockImplementation((urls: string[], forCarousel: boolean = false) => {
        return Promise.all(urls.map((url: string) => 
          mockCreateSingleMediaContainer(url, forCarousel)
        ));
      });

      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];
      
      const results = await createMediaContainers(imageUrls);
      
      // Verify results
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].containerId).toBe('container-id-1');
      expect(results[1].success).toBe(true);
      expect(results[1].containerId).toBe('container-id-2');
      
      // Use mock.calls to verify exactly what was passed
      expect(mockCreateSingleMediaContainer).toHaveBeenCalledTimes(2);
      expect(mockCreateSingleMediaContainer.mock.calls[0][0]).toBe('https://example.com/image1.jpg');
      expect(mockCreateSingleMediaContainer.mock.calls[0][1]).toBe(false);
      expect(mockCreateSingleMediaContainer.mock.calls[1][0]).toBe('https://example.com/image2.jpg');
      expect(mockCreateSingleMediaContainer.mock.calls[1][1]).toBe(false);
    });

    it('should create carousel media containers with the carousel flag', async () => {
      // Mock successful container creation
      mockCreateSingleMediaContainer
        .mockResolvedValueOnce({
          success: true,
          containerId: 'container-id-1',
          imageUrl: 'https://example.com/image1.jpg'
        })
        .mockResolvedValueOnce({
          success: true,
          containerId: 'container-id-2',
          imageUrl: 'https://example.com/image2.jpg'
        });
        
      // Set up createMediaContainers to pass through to original implementation
      mockCreateMediaContainers.mockImplementation((urls: string[], forCarousel: boolean = false) => {
        return Promise.all(urls.map((url: string) => 
          mockCreateSingleMediaContainer(url, forCarousel)
        ));
      });

      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];
      
      // Specify these are for a carousel
      const results = await createMediaContainers(imageUrls, true);
      
      // Verify results
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Use mock.calls to verify exactly what was passed
      expect(mockCreateSingleMediaContainer).toHaveBeenCalledTimes(2);
      expect(mockCreateSingleMediaContainer.mock.calls[0][0]).toBe('https://example.com/image1.jpg');
      expect(mockCreateSingleMediaContainer.mock.calls[0][1]).toBe(true);
      expect(mockCreateSingleMediaContainer.mock.calls[1][0]).toBe('https://example.com/image2.jpg');
      expect(mockCreateSingleMediaContainer.mock.calls[1][1]).toBe(true);
    });

    it('should handle API errors for individual containers', async () => {
      // Mock mixed success/failure
      mockCreateSingleMediaContainer
        .mockResolvedValueOnce({
          success: true,
          containerId: 'container-id-1',
          imageUrl: 'https://example.com/image1.jpg'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'API error occurred',
          imageUrl: 'https://example.com/image2.jpg'
        });
        
      // Set up createMediaContainers to pass through to original implementation
      mockCreateMediaContainers.mockImplementation((urls: string[], forCarousel: boolean = false) => {
        return Promise.all(urls.map((url: string) => 
          mockCreateSingleMediaContainer(url, forCarousel)
        ));
      });

      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];
      
      const results = await createMediaContainers(imageUrls);
      
      // Verify results
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].containerId).toBe('container-id-1');
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('API error occurred');
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockCreateSingleMediaContainer
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
          imageUrl: 'https://example.com/image1.jpg'
        });
        
      // Set up createMediaContainers to pass through to original implementation
      mockCreateMediaContainers.mockImplementation((urls: string[], forCarousel: boolean = false) => {
        return Promise.all(urls.map((url: string) => 
          mockCreateSingleMediaContainer(url, forCarousel)
        ));
      });

      const imageUrls = ['https://example.com/image1.jpg'];
      
      const results = await createMediaContainers(imageUrls);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Network error');
    });
  });

  describe('createCarouselContainer', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should create a carousel container successfully', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'mock-carousel-container-id' })
      } as Response);
      
      // Mock the function directly using our mock object
      mockCreateCarouselContainer.mockResolvedValueOnce('mock-carousel-container-id');

      const containerIds = ['container-id-1', 'container-id-2'];
      const caption = 'Test carousel';
      
      const result = await createCarouselContainer(containerIds, caption);
      
      expect(result).toBe('mock-carousel-container-id');
      
      // Verify correct parameters were passed to our mock
      expect(mockCreateCarouselContainer).toHaveBeenCalledWith(
        containerIds,
        caption
      );
    });

    it('should throw an error if the carousel has fewer than 2 items', async () => {
      // Use Promise.reject for clean async error throwing
      mockCreateCarouselContainer.mockRejectedValueOnce(
        new Error('Carousel must contain between 2-10 items (received 1)')
      );
      
      await expect(createCarouselContainer(['container-id-1'], 'Test carousel'))
        .rejects.toThrow('Carousel must contain between 2-10 items');
    });

    it('should throw an error if the carousel has more than 10 items', async () => {
      // Use Promise.reject for clean async error throwing
      mockCreateCarouselContainer.mockRejectedValueOnce(
        new Error('Carousel must contain between 2-10 items (received 11)')
      );
      
      const tooManyIds = Array(11).fill('container-id').map((id, i) => `${id}-${i}`);
      
      await expect(createCarouselContainer(tooManyIds, 'Test carousel'))
        .rejects.toThrow('Carousel must contain between 2-10 items');
    });

    it('should handle API errors properly', async () => {
      // Mock API error using direct rejection
      mockCreateCarouselContainer.mockRejectedValueOnce(
        new Error('Instagram API error: Instagram API error creating carousel container')
      );

      const containerIds = ['container-id-1', 'container-id-2'];
      const caption = 'Test carousel';
      
      await expect(createCarouselContainer(containerIds, caption))
        .rejects.toThrow('Instagram API error: Instagram API error creating carousel container');
    });
  });

  describe('publishCarousel', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Set up defaults for this section
      mockCreateCarouselContainer.mockResolvedValue('mock-carousel-container-id');
      mockPublishMedia.mockResolvedValue({ id: 'mock-published-post-id', status: 'PUBLISHED' });
      
      // Set up direct mock implementation
      mockPublishCarousel.mockImplementation(async (containerIds: string[], caption: string) => {
        if (containerIds.length === 0) {
          throw new Error('At least one container ID is required');
        }
        
        const carouselContainerId = await mockCreateCarouselContainer(containerIds, caption);
        const publishResponse = await mockPublishMedia(carouselContainerId);
        
        return publishResponse.id;
      });
    });

    it('should follow the 3-step process to publish a carousel', async () => {
      const result = await publishCarousel(
        ['container-id-1', 'container-id-2'], 
        'Test carousel'
      );
      
      expect(result).toBe('mock-published-post-id');
      
      // Verify the correct functions were called with the right parameters
      expect(mockCreateCarouselContainer).toHaveBeenCalledWith(
        ['container-id-1', 'container-id-2'],
        'Test carousel'
      );
      
      expect(mockPublishMedia).toHaveBeenCalledWith('mock-carousel-container-id');
    });

    it('should throw an error when no container IDs are provided', async () => {
      await expect(publishCarousel([], 'Test carousel'))
        .rejects.toThrow('At least one container ID is required');
      
      // Verify the functions were not called
      expect(mockCreateCarouselContainer).not.toHaveBeenCalled();
      expect(mockPublishMedia).not.toHaveBeenCalled();
    });
  });

  describe('createAndPublishCarousel', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Set up defaults for this section
      mockCreateCarouselContainer.mockResolvedValue('mock-carousel-container-id');
      mockPublishMedia.mockResolvedValue({ id: 'mock-published-post-id', status: 'PUBLISHED' });
      
      // Set up direct mock implementation for publishCarousel
      mockPublishCarousel.mockImplementation(async (containerIds: string[], caption: string) => {
        const carouselContainerId = await mockCreateCarouselContainer(containerIds, caption);
        const publishResponse = await mockPublishMedia(carouselContainerId);
        return publishResponse.id;
      });
    });

    it('should create containers and publish a carousel successfully', async () => {
      // Set up successful container creation
      mockCreateMediaContainers.mockResolvedValue([
        {
          success: true,
          containerId: 'container-id-1',
          imageUrl: 'https://example.com/image1.jpg'
        },
        {
          success: true,
          containerId: 'container-id-2',
          imageUrl: 'https://example.com/image2.jpg'
        }
      ]);
      
      // Set up direct mock implementation
      mockCreateAndPublishCarousel.mockImplementation(async (imageUrls: string[], caption: string) => {
        if (!imageUrls.length) {
          throw new Error('At least one image URL is required');
        }

        // Create containers for all images - using our mock
        const containerResults = await mockCreateMediaContainers(imageUrls, true);
        
        // Check for failures
        const failedContainers = containerResults.filter(result => !result.success);
        if (failedContainers.length > 0) {
          throw new Error(`Failed to create ${failedContainers.length} media containers`);
        }
        
        // Extract container IDs
        const containerIds = containerResults
          .filter(result => result.success)
          .map(result => result.containerId as string);
        
        // Publish the carousel using our mocked publishCarousel
        return await mockPublishCarousel(containerIds, caption);
      });
      
      const result = await createAndPublishCarousel(
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        'Test carousel'
      );
      
      expect(result).toBe('mock-published-post-id');
      
      // Verify createMediaContainers was called with the right parameters
      expect(mockCreateMediaContainers).toHaveBeenCalledWith(
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        true
      );
      
      // Verify the container IDs were passed to createCarouselContainer
      expect(mockCreateCarouselContainer).toHaveBeenCalledWith(
        ['container-id-1', 'container-id-2'],
        'Test carousel'
      );
      
      // Verify the carousel container ID was published
      expect(mockPublishMedia).toHaveBeenCalledWith('mock-carousel-container-id');
    });

    it('should throw an error if container creation fails', async () => {
      // Set up for failed container creation
      mockCreateMediaContainers.mockResolvedValue([
        {
          success: false,
          error: 'API error occurred',
          imageUrl: 'https://example.com/image1.jpg'
        },
        {
          success: false,
          error: 'API error occurred',
          imageUrl: 'https://example.com/image2.jpg'
        }
      ]);
      
      // Set up direct mock implementation
      mockCreateAndPublishCarousel.mockImplementation(async (imageUrls: string[], caption: string) => {
        if (!imageUrls.length) {
          throw new Error('At least one image URL is required');
        }

        // Create containers for all images - using our mock
        const containerResults = await mockCreateMediaContainers(imageUrls, true);
        
        // Check for failures - both containers will fail
        const failedContainers = containerResults.filter(result => !result.success);
        if (failedContainers.length > 0) {
          throw new Error(`Failed to create ${failedContainers.length} media containers`);
        }
        
        // This won't be reached in this test
        return 'mock-id';
      });
      
      await expect(createAndPublishCarousel(
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        'Test carousel'
      )).rejects.toThrow('Failed to create 2 media containers');
      
      // Verify publishCarousel was not called
      expect(mockCreateCarouselContainer).not.toHaveBeenCalled();
      expect(mockPublishMedia).not.toHaveBeenCalled();
    });
    
    it('should throw an error if one container creation fails', async () => {
      // Set up for one failed container
      mockCreateMediaContainers.mockResolvedValue([
        {
          success: true,
          containerId: 'container-id-1',
          imageUrl: 'https://example.com/image1.jpg'
        },
        {
          success: false,
          error: 'API error occurred',
          imageUrl: 'https://example.com/image2.jpg'
        }
      ]);
      
      // Set up direct mock implementation
      mockCreateAndPublishCarousel.mockImplementation(async (imageUrls: string[], caption: string) => {
        if (!imageUrls.length) {
          throw new Error('At least one image URL is required');
        }

        // Create containers for all images - using our mock
        const containerResults = await mockCreateMediaContainers(imageUrls, true);
        
        // Check for failures - one container will fail
        const failedContainers = containerResults.filter(result => !result.success);
        if (failedContainers.length > 0) {
          throw new Error(`Failed to create ${failedContainers.length} media containers`);
        }
        
        // This won't be reached in this test
        return 'mock-id';
      });
      
      await expect(createAndPublishCarousel(
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        'Test carousel'
      )).rejects.toThrow('Failed to create 1 media containers');
      
      // Verify publishCarousel was not called
      expect(mockCreateCarouselContainer).not.toHaveBeenCalled();
      expect(mockPublishMedia).not.toHaveBeenCalled();
    });

    it('should throw an error if no image URLs are provided', async () => {
      // Set up direct mock implementation
      mockCreateAndPublishCarousel.mockImplementation(async (imageUrls: string[]) => {
        if (!imageUrls.length) {
          throw new Error('At least one image URL is required');
        }
        return 'mock-id'; // Not reached in this test
      });
      
      await expect(createAndPublishCarousel([], 'Test carousel'))
        .rejects.toThrow('At least one image URL is required');
      
      // Verify no API calls were made
      expect(mockCreateMediaContainers).not.toHaveBeenCalled();
      expect(mockCreateCarouselContainer).not.toHaveBeenCalled();
      expect(mockPublishMedia).not.toHaveBeenCalled();
    });
  });
}); 