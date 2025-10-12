/**
 * @fileoverview Tests for SEO utilities
 * 
 * Tests slug generation, URL handling, meta tag management,
 * and structured data generation.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { vi } from 'vitest';
import { Listing, EnhancedListing } from '@harborlist/shared-types';
import {
  generateSlug,
  getListingUrl,
  getListingFullUrl,
  updateListingMetaTags,
  generateListingStructuredData,
  updateListingStructuredData,
  cleanupListingSEO,
  shareListing,
  getCanonicalUrl,
  updateCanonicalUrl
} from '../seo';

// Mock listing data
const mockListing: Listing = {
  listingId: 'listing_123',
  ownerId: 'owner_456',
  title: '2020 Sea Ray Sundancer 350 - Pristine Condition',
  description: 'Beautiful 2020 Sea Ray Sundancer 350 in excellent condition. This boat has been meticulously maintained and is ready for its next owner.',
  price: 285000,
  location: {
    city: 'Miami',
    state: 'FL',
    zipCode: '33101'
  },
  boatDetails: {
    type: 'Motor Yacht',
    manufacturer: 'Sea Ray',
    model: 'Sundancer 350',
    year: 2020,
    length: 35,
    beam: 12,
    draft: 3.5,
    condition: 'Excellent',
    engine: 'Twin Mercruiser 8.2L',
    hours: 150
  },
  features: ['GPS/Chartplotter', 'Air Conditioning', 'Generator'],
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  videos: [],
  thumbnails: ['https://example.com/thumb1.jpg'],
  status: 'active',
  views: 125,
  createdAt: 1640995200000,
  updatedAt: 1640995200000
};

const mockEnhancedListing: EnhancedListing = {
  ...mockListing,
  slug: '2020-sea-ray-sundancer-350-pristine-condition',
  engines: [
    {
      engineId: 'engine_1',
      type: 'inboard',
      manufacturer: 'Mercruiser',
      model: '8.2L',
      horsepower: 380,
      fuelType: 'gasoline',
      condition: 'excellent',
      position: 1,
      year: 2020,
      hours: 75
    },
    {
      engineId: 'engine_2',
      type: 'inboard',
      manufacturer: 'Mercruiser',
      model: '8.2L',
      horsepower: 380,
      fuelType: 'gasoline',
      condition: 'excellent',
      position: 2,
      year: 2020,
      hours: 75
    }
  ],
  totalHorsepower: 760,
  engineConfiguration: 'twin'
};

// Mock DOM methods
const mockMetaTag = {
  setAttribute: vi.fn(),
  getAttribute: vi.fn()
};

const mockScript = {
  textContent: ''
};

const mockLink = {
  href: ''
};

// Mock document methods
Object.defineProperty(document, 'title', {
  writable: true,
  value: 'Test Title'
});

Object.defineProperty(document, 'querySelector', {
  writable: true,
  value: vi.fn((selector: string) => {
    if (selector.includes('meta')) return mockMetaTag;
    if (selector.includes('script')) return mockScript;
    if (selector.includes('link')) return mockLink;
    return null;
  })
});

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn((tagName: string) => {
    if (tagName === 'meta') return { ...mockMetaTag };
    if (tagName === 'script') return { ...mockScript, id: '', type: '' };
    if (tagName === 'link') return { ...mockLink, rel: '' };
    return {};
  })
});

Object.defineProperty(document, 'head', {
  writable: true,
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
});

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    origin: 'https://harborlist.com'
  }
});

// Mock navigator for sharing tests
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: vi.fn()
});

Object.defineProperty(navigator, 'canShare', {
  writable: true,
  value: vi.fn(() => true)
});

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn()
  }
});

describe('SEO Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('generates slug from title', () => {
      const title = '2020 Sea Ray Sundancer 350 - Pristine Condition';
      const slug = generateSlug(title);
      expect(slug).toBe('2020-sea-ray-sundancer-350-pristine-condition');
    });

    it('handles special characters', () => {
      const title = 'Boat with Special Characters! @#$%^&*()';
      const slug = generateSlug(title);
      expect(slug).toBe('boat-with-special-characters');
    });

    it('handles multiple spaces', () => {
      const title = 'Boat   with    multiple     spaces';
      const slug = generateSlug(title);
      expect(slug).toBe('boat-with-multiple-spaces');
    });

    it('handles leading and trailing hyphens', () => {
      const title = '---Boat Title---';
      const slug = generateSlug(title);
      expect(slug).toBe('boat-title');
    });

    it('handles empty string', () => {
      const slug = generateSlug('');
      expect(slug).toBe('');
    });

    it('converts to lowercase', () => {
      const title = 'UPPERCASE BOAT TITLE';
      const slug = generateSlug(title);
      expect(slug).toBe('uppercase-boat-title');
    });
  });

  describe('getListingUrl', () => {
    it('returns slug-based URL for enhanced listing', () => {
      const url = getListingUrl(mockEnhancedListing);
      expect(url).toBe('/boat/2020-sea-ray-sundancer-350-pristine-condition');
    });

    it('returns ID-based URL for regular listing', () => {
      const url = getListingUrl(mockListing);
      expect(url).toBe('/listing/listing_123');
    });

    it('returns ID-based URL when slug is empty', () => {
      const listingWithEmptySlug = { ...mockEnhancedListing, slug: '' };
      const url = getListingUrl(listingWithEmptySlug);
      expect(url).toBe('/listing/listing_123');
    });
  });

  describe('getListingFullUrl', () => {
    it('returns full URL with default origin', () => {
      const url = getListingFullUrl(mockEnhancedListing);
      expect(url).toBe('https://harborlist.com/boat/2020-sea-ray-sundancer-350-pristine-condition');
    });

    it('returns full URL with custom base URL', () => {
      const url = getListingFullUrl(mockEnhancedListing, 'https://custom.com');
      expect(url).toBe('https://custom.com/boat/2020-sea-ray-sundancer-350-pristine-condition');
    });
  });

  describe('updateListingMetaTags', () => {
    it('updates page title', () => {
      updateListingMetaTags(mockListing);
      expect(document.title).toBe('2020 Sea Ray Sundancer 350 - Pristine Condition - HarborList');
    });

    it('updates meta description', () => {
      updateListingMetaTags(mockListing);
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith(
        'content',
        expect.stringContaining('2020 Sea Ray Sundancer 350 - Pristine Condition - 2020 Motor Yacht for $285,000 in Miami, FL')
      );
    });

    it('updates Open Graph tags', () => {
      updateListingMetaTags(mockListing);
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith('content', mockListing.title);
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith('content', 'product');
    });

    it('updates Twitter Card tags', () => {
      updateListingMetaTags(mockListing);
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith('content', 'summary_large_image');
    });
  });

  describe('generateListingStructuredData', () => {
    it('generates basic structured data for regular listing', () => {
      const structuredData = generateListingStructuredData(mockListing);
      
      expect(structuredData).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: mockListing.title,
        description: mockListing.description,
        image: mockListing.images,
        offers: {
          '@type': 'Offer',
          price: mockListing.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock'
        },
        brand: {
          '@type': 'Brand',
          name: 'Sea Ray'
        },
        model: 'Sundancer 350',
        productionDate: '2020',
        category: 'Boat'
      });
    });

    it('generates enhanced structured data for enhanced listing', () => {
      const structuredData = generateListingStructuredData(mockEnhancedListing) as any;
      
      expect(structuredData.additionalProperty).toEqual([
        {
          '@type': 'PropertyValue',
          name: 'Total Horsepower',
          value: '760'
        },
        {
          '@type': 'PropertyValue',
          name: 'Engine Configuration',
          value: 'twin'
        },
        {
          '@type': 'PropertyValue',
          name: 'Number of Engines',
          value: '2'
        }
      ]);
    });

    it('handles inactive listing availability', () => {
      const inactiveListing = { ...mockListing, status: 'inactive' as const };
      const structuredData = generateListingStructuredData(inactiveListing) as any;
      
      expect(structuredData.offers.availability).toBe('https://schema.org/OutOfStock');
    });
  });

  describe('updateListingStructuredData', () => {
    it('creates and adds structured data script', () => {
      updateListingStructuredData(mockListing);
      
      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('updates existing structured data script', () => {
      // Mock existing script
      const existingScript = { textContent: '' };
      (document.querySelector as any).mockReturnValueOnce(existingScript);
      
      updateListingStructuredData(mockListing);
      
      expect(existingScript.textContent).toContain('"@context":"https://schema.org"');
    });
  });

  describe('cleanupListingSEO', () => {
    it('resets page title', () => {
      // Mock querySelector to return proper meta tags
      (document.querySelector as any).mockImplementation((selector: string) => {
        if (selector.includes('meta')) return mockMetaTag;
        if (selector.includes('script')) return mockScript;
        return null;
      });
      
      cleanupListingSEO();
      expect(document.title).toBe('HarborList - Find Your Perfect Boat');
    });

    it('removes structured data script', () => {
      (document.querySelector as any).mockImplementation((selector: string) => {
        if (selector.includes('listing-structured-data')) return mockScript;
        if (selector.includes('meta')) return mockMetaTag;
        return null;
      });
      
      cleanupListingSEO();
      
      expect(document.head.removeChild).toHaveBeenCalledWith(mockScript);
    });

    it('resets meta tags to defaults', () => {
      (document.querySelector as any).mockImplementation((selector: string) => {
        if (selector.includes('meta')) return mockMetaTag;
        return null;
      });
      
      cleanupListingSEO();
      
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith(
        'content',
        'Find and list boats for sale on HarborList. Browse thousands of boats including yachts, sailboats, fishing boats, and more.'
      );
    });
  });

  describe('shareListing', () => {
    it('uses Web Share API when available', async () => {
      await shareListing(mockListing);
      
      expect(navigator.share).toHaveBeenCalledWith({
        title: mockListing.title,
        text: expect.stringContaining('Check out this 2020 Motor Yacht for $285,000'),
        url: expect.stringContaining('/listing/listing_123')
      });
    });

    it('falls back to clipboard when Web Share API not available', async () => {
      (navigator.canShare as any).mockReturnValueOnce(false);
      
      await shareListing(mockListing);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/listing/listing_123')
      );
    });

    it('handles sharing errors gracefully', async () => {
      (navigator.share as any).mockRejectedValueOnce(new Error('Share failed'));
      
      // Should not throw
      await expect(shareListing(mockListing)).resolves.toBeUndefined();
    });
  });

  describe('getCanonicalUrl', () => {
    it('returns slug-based canonical URL for enhanced listing', () => {
      const url = getCanonicalUrl(mockEnhancedListing);
      expect(url).toBe('https://harborlist.com/boat/2020-sea-ray-sundancer-350-pristine-condition');
    });

    it('returns ID-based canonical URL for regular listing', () => {
      const url = getCanonicalUrl(mockListing);
      expect(url).toBe('https://harborlist.com/listing/listing_123');
    });
  });

  describe('updateCanonicalUrl', () => {
    it('creates canonical link when none exists', () => {
      (document.querySelector as any).mockReturnValueOnce(null);
      
      updateCanonicalUrl(mockListing);
      
      expect(document.createElement).toHaveBeenCalledWith('link');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('updates existing canonical link', () => {
      (document.querySelector as any).mockReturnValueOnce(mockLink);
      
      updateCanonicalUrl(mockEnhancedListing);
      
      expect(mockLink.href).toBe('https://harborlist.com/boat/2020-sea-ray-sundancer-350-pristine-condition');
    });
  });

  describe('Edge Cases', () => {
    it('handles listing without manufacturer', () => {
      const listingNoManufacturer = {
        ...mockListing,
        boatDetails: { ...mockListing.boatDetails, manufacturer: undefined }
      };
      
      const structuredData = generateListingStructuredData(listingNoManufacturer) as any;
      expect(structuredData.brand.name).toBe('Unknown');
    });

    it('handles listing without images', () => {
      const listingNoImages = { ...mockListing, images: [] };
      
      updateListingMetaTags(listingNoImages);
      
      // Should not crash and should handle missing images gracefully
      expect(mockMetaTag.setAttribute).toHaveBeenCalled();
    });

    it('handles very long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const listingLongDesc = { ...mockListing, description: longDescription };
      
      updateListingMetaTags(listingLongDesc);
      
      expect(mockMetaTag.setAttribute).toHaveBeenCalledWith(
        'content',
        expect.stringMatching(/\.{3}$/) // Should end with ellipsis
      );
    });
  });
});