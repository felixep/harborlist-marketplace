/**
 * @fileoverview SEO utilities for listing URLs and meta data management.
 * 
 * Provides functions for generating SEO-friendly URLs, managing meta tags,
 * and creating structured data for boat listings.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { Listing, EnhancedListing } from '@harborlist/shared-types';

/**
 * Generate SEO-friendly slug from listing title
 * 
 * @param title - Listing title to convert to slug
 * @returns SEO-friendly URL slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get the appropriate URL for a listing (slug-based if available, ID-based otherwise)
 * 
 * @param listing - Listing object
 * @returns SEO-friendly URL path
 */
export function getListingUrl(listing: Listing | EnhancedListing): string {
  if ('slug' in listing && listing.slug) {
    return `/boat/${listing.slug}`;
  }
  return `/listing/${listing.listingId}`;
}

/**
 * Get the full URL for a listing including domain
 * 
 * @param listing - Listing object
 * @param baseUrl - Base URL (defaults to current origin)
 * @returns Full URL for sharing
 */
export function getListingFullUrl(listing: Listing | EnhancedListing, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}${getListingUrl(listing)}`;
}

/**
 * Update page meta tags for SEO
 * 
 * @param listing - Listing object
 */
export function updateListingMetaTags(listing: Listing | EnhancedListing): void {
  // Update page title
  document.title = `${listing.title} - HarborList`;
  
  // Update meta description
  const description = `${listing.title} - ${listing.boatDetails.year} ${listing.boatDetails.type} for $${listing.price.toLocaleString()} in ${listing.location.city}, ${listing.location.state}. ${listing.description.substring(0, 120)}...`;
  
  updateMetaTag('description', description);
  
  // Open Graph tags for social sharing
  updateMetaTag('og:title', listing.title, 'property');
  updateMetaTag('og:description', description, 'property');
  updateMetaTag('og:type', 'product', 'property');
  updateMetaTag('og:url', getListingFullUrl(listing), 'property');
  
  if (listing.images && listing.images.length > 0) {
    updateMetaTag('og:image', listing.images[0], 'property');
  }
  
  // Twitter Card tags
  updateMetaTag('twitter:card', 'summary_large_image', 'name');
  updateMetaTag('twitter:title', listing.title, 'name');
  updateMetaTag('twitter:description', description, 'name');
  
  if (listing.images && listing.images.length > 0) {
    updateMetaTag('twitter:image', listing.images[0], 'name');
  }
}

/**
 * Update or create a meta tag
 * 
 * @param name - Meta tag name or property
 * @param content - Meta tag content
 * @param attribute - Attribute type ('name' or 'property')
 */
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
  let metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, name);
    document.head.appendChild(metaTag);
  }
  
  metaTag.setAttribute('content', content);
}

/**
 * Generate structured data (JSON-LD) for a listing
 * 
 * @param listing - Listing object
 * @returns Structured data object
 */
export function generateListingStructuredData(listing: Listing | EnhancedListing): object {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "description": listing.description,
    "image": listing.images,
    "offers": {
      "@type": "Offer",
      "price": listing.price,
      "priceCurrency": "USD",
      "availability": listing.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "brand": {
      "@type": "Brand",
      "name": listing.boatDetails.manufacturer || "Unknown"
    },
    "model": listing.boatDetails.model,
    "productionDate": listing.boatDetails.year?.toString(),
    "category": "Boat",
    "location": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": listing.location.city,
        "addressRegion": listing.location.state
      }
    }
  };

  // Add engine information for enhanced listings
  if ('engines' in listing && listing.engines && listing.engines.length > 0) {
    (structuredData as any).additionalProperty = [
      {
        "@type": "PropertyValue",
        "name": "Total Horsepower",
        "value": listing.totalHorsepower?.toString()
      },
      {
        "@type": "PropertyValue", 
        "name": "Engine Configuration",
        "value": listing.engineConfiguration
      },
      {
        "@type": "PropertyValue",
        "name": "Number of Engines", 
        "value": listing.engines.length.toString()
      }
    ];
  }

  return structuredData;
}

/**
 * Add or update structured data script in document head
 * 
 * @param listing - Listing object
 */
export function updateListingStructuredData(listing: Listing | EnhancedListing): void {
  const structuredData = generateListingStructuredData(listing);
  
  // Add or update structured data script
  let structuredDataScript = document.getElementById('listing-structured-data');
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script');
    structuredDataScript.id = 'listing-structured-data';
    structuredDataScript.type = 'application/ld+json';
    document.head.appendChild(structuredDataScript);
  }
  structuredDataScript.textContent = JSON.stringify(structuredData);
}

/**
 * Clean up SEO meta tags and structured data
 */
export function cleanupListingSEO(): void {
  // Reset title
  document.title = 'HarborList - Find Your Perfect Boat';
  
  // Remove structured data
  const structuredDataScript = document.getElementById('listing-structured-data');
  if (structuredDataScript) {
    document.head.removeChild(structuredDataScript);
  }
  
  // Reset meta tags to defaults
  updateMetaTag('description', 'Find and list boats for sale on HarborList. Browse thousands of boats including yachts, sailboats, fishing boats, and more.');
  updateMetaTag('og:title', 'HarborList - Find Your Perfect Boat', 'property');
  updateMetaTag('og:description', 'Find and list boats for sale on HarborList. Browse thousands of boats including yachts, sailboats, fishing boats, and more.', 'property');
  updateMetaTag('og:type', 'website', 'property');
  updateMetaTag('og:url', window.location.origin, 'property');
}

/**
 * Share listing via Web Share API or fallback to clipboard
 * 
 * @param listing - Listing object
 * @returns Promise that resolves when sharing is complete
 */
export async function shareListing(listing: Listing | EnhancedListing): Promise<void> {
  const shareData = {
    title: listing.title,
    text: `Check out this ${listing.boatDetails.year} ${listing.boatDetails.type} for $${listing.price.toLocaleString()}`,
    url: getListingFullUrl(listing)
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      // User cancelled sharing or error occurred
      console.log('Sharing cancelled or failed:', error);
    }
  } else {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareData.url);
      // You might want to show a toast notification here
      console.log('URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      // Final fallback - could open a modal with the URL to copy manually
    }
  }
}

/**
 * Generate canonical URL for a listing
 * 
 * @param listing - Listing object
 * @returns Canonical URL
 */
export function getCanonicalUrl(listing: Listing | EnhancedListing): string {
  // Always prefer slug-based URLs for canonical
  if ('slug' in listing && listing.slug) {
    return `${window.location.origin}/boat/${listing.slug}`;
  }
  return `${window.location.origin}/listing/${listing.listingId}`;
}

/**
 * Update canonical link tag
 * 
 * @param listing - Listing object
 */
export function updateCanonicalUrl(listing: Listing | EnhancedListing): void {
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  
  canonicalLink.href = getCanonicalUrl(listing);
}