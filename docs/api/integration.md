# 🔄 API Integration Guide

## 📋 **Overview**

This guide provides comprehensive examples and best practices for integrating with the HarborList API. Whether you're building a mobile app, web application, or third-party service, this documentation will help you implement robust API integrations.

---

## 🚀 **Quick Start Integration**

### **JavaScript/TypeScript Client**

```typescript
// API Client Configuration
class HarborListAPI {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = 'https://api.harborlist.com') {
    this.baseURL = baseURL;
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.json());
    }

    const data: AuthResponse = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    
    return data;
  }

  // Automatic token refresh
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.json());
    }

    const data = await response.json();
    this.accessToken = data.data.accessToken;
  }

  // Generic API request with automatic retry on token expiry
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle token expiry and retry
      if (response.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.accessToken}`,
        };
        const retryResponse = await fetch(url, config);
        
        if (!retryResponse.ok) {
          throw new APIError(retryResponse.status, await retryResponse.json());
        }
        
        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new APIError(response.status, await response.json());
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(0, { message: 'Network error', error });
    }
  }

  // Listings API
  async getListings(params: SearchParams = {}): Promise<ListingsResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString();

    return this.request<ListingsResponse>(
      `/api/v1/listings${queryString ? `?${queryString}` : ''}`
    );
  }

  async getListing(id: string): Promise<ListingResponse> {
    return this.request<ListingResponse>(`/api/v1/listings/${id}`);
  }

  async createListing(listing: CreateListingRequest): Promise<ListingResponse> {
    return this.request<ListingResponse>('/api/v1/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
  }

  async updateListing(id: string, updates: UpdateListingRequest): Promise<ListingResponse> {
    return this.request<ListingResponse>(`/api/v1/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteListing(id: string): Promise<void> {
    await this.request(`/api/v1/listings/${id}`, {
      method: 'DELETE',
    });
  }

  // Image upload with progress tracking
  async uploadImages(
    listingId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResponse> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append('images[]', file);
      formData.append('captions[]', `Image ${index + 1}`);
      formData.append('isPrimary[]', index === 0 ? 'true' : 'false');
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new APIError(xhr.status, JSON.parse(xhr.responseText)));
        }
      };

      xhr.onerror = () => {
        reject(new APIError(0, { message: 'Upload failed' }));
      };

      xhr.open('POST', `${this.baseURL}/api/v1/listings/${listingId}/images`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      xhr.send(formData);
    });
  }
}

// Error handling
class APIError extends Error {
  constructor(public status: number, public response: any) {
    super(response.error?.message || 'API Error');
    this.name = 'APIError';
  }
}

// Type definitions
interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

interface SearchParams {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  boatType?: string;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Usage Example
const api = new HarborListAPI();

async function example() {
  try {
    // Login
    await api.login('user@example.com', 'password123');
    
    // Search listings
    const listings = await api.getListings({
      q: 'sailboat',
      minPrice: 50000,
      maxPrice: 200000,
      page: 1,
      limit: 20,
    });
    
    console.log(`Found ${listings.data.pagination.total} listings`);
    
    // Create new listing
    const newListing = await api.createListing({
      title: 'Beautiful Sailboat',
      description: 'Well maintained sailboat',
      price: 125000,
      boatType: 'sailboat',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
      length: 35,
    });
    
    console.log('Created listing:', newListing.data.listing.id);
    
    // Upload images with progress tracking
    const fileInput = document.getElementById('images') as HTMLInputElement;
    const files = Array.from(fileInput.files || []);
    
    await api.uploadImages(
      newListing.data.listing.id,
      files,
      (progress) => {
        console.log(`Upload progress: ${progress.toFixed(1)}%`);
      }
    );
    
  } catch (error) {
    if (error instanceof APIError) {
      console.error('API Error:', error.status, error.response);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

---

## 📱 **Mobile App Integration (React Native)**

```typescript
// React Native API Client
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileHarborListAPI extends HarborListAPI {
  constructor() {
    super();
    this.loadTokensFromStorage();
  }

  // Persist tokens in secure storage
  private async saveTokensToStorage(): Promise<void> {
    if (this.accessToken) {
      await AsyncStorage.setItem('access_token', this.accessToken);
    }
    if (this.refreshToken) {
      await AsyncStorage.setItem('refresh_token', this.refreshToken);
    }
  }

  private async loadTokensFromStorage(): Promise<void> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token'),
      ]);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await super.login(email, password);
    await this.saveTokensToStorage();
    return response;
  }

  async logout(): Promise<void> {
    await super.logout();
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Image upload from camera/gallery
  async uploadImageFromCamera(
    listingId: string,
    imageUri: string,
    caption?: string
  ): Promise<ImageUploadResponse> {
    const formData = new FormData();
    
    formData.append('images[]', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    
    formData.append('captions[]', caption || '');
    formData.append('isPrimary[]', 'false');

    const response = await fetch(
      `${this.baseURL}/api/v1/listings/${listingId}/images`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new APIError(response.status, await response.json());
    }

    return await response.json();
  }

  // Location-based search
  async searchNearby(
    latitude: number,
    longitude: number,
    radius: number = 50
  ): Promise<ListingsResponse> {
    return this.getListings({
      latitude,
      longitude,
      radius,
      sortBy: 'distance',
    });
  }
}

// React Native Component Example
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, Image, TouchableOpacity } from 'react-native';

const ListingsScreen: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const api = new MobileHarborListAPI();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await api.getListings({ limit: 20 });
      setListings(response.data.listings);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={styles.listingCard}
      onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
    >
      <Image source={{ uri: item.images[0] }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price.toLocaleString()}</Text>
        <Text style={styles.location}>{item.location.city}, {item.location.state}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadListings}
      />
    </View>
  );
};
```

---

## 🌐 **Webhook Integration**

### **Webhook Configuration**

Set up webhooks to receive real-time notifications about listing events:

```typescript
// Webhook payload interface
interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    listing: Listing;
    user?: User;
    changes?: Record<string, any>;
  };
  signature: string;
}

// Webhook verification
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

// Express.js webhook handler
import express from 'express';

const app = express();

app.post('/webhooks/harborlist', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-harborlist-signature'] as string;
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const webhookData: WebhookPayload = JSON.parse(payload);
  
  switch (webhookData.event) {
    case 'listing.created':
      handleListingCreated(webhookData.data.listing);
      break;
      
    case 'listing.updated':
      handleListingUpdated(webhookData.data.listing, webhookData.data.changes);
      break;
      
    case 'listing.deleted':
      handleListingDeleted(webhookData.data.listing);
      break;
      
    case 'listing.approved':
      handleListingApproved(webhookData.data.listing);
      break;
      
    case 'user.registered':
      handleUserRegistered(webhookData.data.user!);
      break;
  }
  
  res.status(200).json({ received: true });
});

// Event handlers
function handleListingCreated(listing: Listing) {
  console.log('New listing created:', listing.title);
  // Send notification, update cache, etc.
}

function handleListingUpdated(listing: Listing, changes: Record<string, any>) {
  console.log('Listing updated:', listing.id, changes);
  // Update local cache, notify subscribers, etc.
}
```

### **Available Webhook Events**

| Event | Description | Payload |
|-------|-------------|---------|
| `listing.created` | New listing created | Full listing object |
| `listing.updated` | Listing modified | Updated listing + changes |
| `listing.deleted` | Listing removed | Listing ID + metadata |
| `listing.approved` | Listing approved by admin | Approved listing object |
| `listing.rejected` | Listing rejected by admin | Listing + rejection reason |
| `user.registered` | New user account created | User profile |
| `user.verified` | User email verified | User profile |
| `inquiry.received` | New inquiry on listing | Inquiry details |

---

## 🔧 **SDK Development**

### **Python SDK Example**

```python
import requests
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

@dataclass
class HarborListConfig:
    base_url: str = "https://api.harborlist.com"
    api_version: str = "v1"
    timeout: int = 30

class HarborListAPIError(Exception):
    def __init__(self, status_code: int, response: Dict[str, Any]):
        self.status_code = status_code
        self.response = response
        super().__init__(f"API Error {status_code}: {response.get('error', {}).get('message', 'Unknown error')}")

class HarborListAPI:
    def __init__(self, config: HarborListConfig = None):
        self.config = config or HarborListConfig()
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        files: Optional[Dict] = None
    ) -> Dict[str, Any]:
        url = f"{self.config.base_url}/api/{self.config.api_version}{endpoint}"
        
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
            
        # Remove Content-Type for file uploads
        if files:
            headers.pop("Content-Type", None)
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if not files else None,
                params=params,
                files=files,
                headers=headers,
                timeout=self.config.timeout
            )
            
            if response.status_code == 401 and self.refresh_token:
                self._refresh_access_token()
                headers["Authorization"] = f"Bearer {self.access_token}"
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    files=files,
                    headers=headers,
                    timeout=self.config.timeout
                )
            
            if not response.ok:
                raise HarborListAPIError(response.status_code, response.json())
                
            return response.json()
            
        except requests.RequestException as e:
            raise HarborListAPIError(0, {"error": {"message": str(e)}})
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and store tokens."""
        response = self._make_request("POST", "/auth/login", {
            "email": email,
            "password": password
        })
        
        self.access_token = response["data"]["accessToken"]
        self.refresh_token = response["data"]["refreshToken"]
        
        return response
    
    def _refresh_access_token(self) -> None:
        """Refresh expired access token."""
        response = self._make_request("POST", "/auth/refresh", {
            "refreshToken": self.refresh_token
        })
        
        self.access_token = response["data"]["accessToken"]
    
    def get_listings(
        self,
        query: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        boat_type: Optional[str] = None,
        location: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search and retrieve boat listings."""
        params = {"page": page, "limit": limit}
        
        if query:
            params["q"] = query
        if min_price:
            params["minPrice"] = min_price
        if max_price:
            params["maxPrice"] = max_price
        if boat_type:
            params["boatType"] = boat_type
        if location:
            params["location"] = location
            
        return self._make_request("GET", "/listings", params=params)
    
    def get_listing(self, listing_id: str) -> Dict[str, Any]:
        """Get a specific listing by ID."""
        return self._make_request("GET", f"/listings/{listing_id}")
    
    def create_listing(self, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new boat listing."""
        return self._make_request("POST", "/listings", listing_data)
    
    def upload_images(
        self, 
        listing_id: str, 
        image_paths: List[str],
        captions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Upload images for a listing."""
        files = []
        form_data = {}
        
        for i, image_path in enumerate(image_paths):
            files.append(("images[]", open(image_path, "rb")))
            form_data[f"captions[{i}]"] = captions[i] if captions and i < len(captions) else f"Image {i+1}"
            form_data[f"isPrimary[{i}]"] = "true" if i == 0 else "false"
        
        try:
            return self._make_request(
                "POST", 
                f"/listings/{listing_id}/images",
                files=dict(files),
                data=form_data
            )
        finally:
            # Close file handles
            for _, file_handle in files:
                file_handle.close()

# Usage example
def main():
    api = HarborListAPI()
    
    try:
        # Login
        auth_response = api.login("user@example.com", "password123")
        print(f"Logged in as: {auth_response['data']['user']['email']}")
        
        # Search listings
        listings = api.get_listings(
            query="sailboat",
            min_price=50000,
            max_price=200000,
            page=1,
            limit=10
        )
        
        print(f"Found {listings['data']['pagination']['total']} listings")
        
        # Create new listing
        new_listing = api.create_listing({
            "title": "Beautiful Python Sailboat",
            "description": "Automated listing via Python SDK",
            "price": 125000,
            "boatType": "sailboat",
            "location": {
                "city": "San Francisco",
                "state": "CA",
                "country": "US"
            },
            "length": 35
        })
        
        listing_id = new_listing["data"]["listing"]["id"]
        print(f"Created listing: {listing_id}")
        
        # Upload images
        api.upload_images(
            listing_id,
            ["boat1.jpg", "boat2.jpg"],
            ["Exterior view", "Interior cabin"]
        )
        
        print("Images uploaded successfully")
        
    except HarborListAPIError as e:
        print(f"API Error: {e}")
        print(f"Response: {e.response}")

if __name__ == "__main__":
    main()
```

---

## 🔒 **Security Best Practices**

### **API Key Management**

```typescript
// Environment-based configuration
const config = {
  development: {
    apiUrl: 'https://dev-api.harborlist.com',
    apiKey: process.env.HARBORLIST_DEV_API_KEY,
  },
  staging: {
    apiUrl: 'https://staging-api.harborlist.com',
    apiKey: process.env.HARBORLIST_STAGING_API_KEY,
  },
  production: {
    apiUrl: 'https://api.harborlist.com',
    apiKey: process.env.HARBORLIST_PROD_API_KEY,
  },
};

// Secure token storage (browser)
class SecureTokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'hl_access_token';
  private readonly REFRESH_TOKEN_KEY = 'hl_refresh_token';

  setTokens(accessToken: string, refreshToken: string): void {
    // Use httpOnly cookies in production
    if (this.isProduction()) {
      this.setCookie(this.ACCESS_TOKEN_KEY, accessToken, { httpOnly: true, secure: true });
      this.setCookie(this.REFRESH_TOKEN_KEY, refreshToken, { httpOnly: true, secure: true });
    } else {
      // Use sessionStorage for development
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  getAccessToken(): string | null {
    return this.isProduction() 
      ? this.getCookie(this.ACCESS_TOKEN_KEY)
      : sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  clearTokens(): void {
    if (this.isProduction()) {
      this.deleteCookie(this.ACCESS_TOKEN_KEY);
      this.deleteCookie(this.REFRESH_TOKEN_KEY);
    } else {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private setCookie(name: string, value: string, options: any): void {
    // Implementation for secure cookie setting
  }

  private getCookie(name: string): string | null {
    // Implementation for cookie retrieval
    return null;
  }

  private deleteCookie(name: string): void {
    // Implementation for cookie deletion
  }
}
```

### **Request Signing (Advanced)**

```typescript
// Request signing for enhanced security
import CryptoJS from 'crypto-js';

class SignedAPIClient extends HarborListAPI {
  constructor(
    private apiKey: string,
    private secretKey: string,
    baseURL?: string
  ) {
    super(baseURL);
  }

  private signRequest(method: string, path: string, body: string, timestamp: string): string {
    const message = `${method}\n${path}\n${body}\n${timestamp}`;
    return CryptoJS.HmacSHA256(message, this.secretKey).toString();
  }

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const timestamp = Date.now().toString();
    const method = options.method || 'GET';
    const body = options.body as string || '';
    
    const signature = this.signRequest(method, endpoint, body, timestamp);
    
    const signedOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'X-API-Key': this.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
    };

    return super.request<T>(endpoint, signedOptions);
  }
}
```

---

## 📊 **Performance Optimization**

### **Caching Strategies**

```typescript
// Redis-based API response caching
import Redis from 'ioredis';

class CachedHarborListAPI extends HarborListAPI {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor(redisUrl: string, baseURL?: string) {
    super(baseURL);
    this.redis = new Redis(redisUrl);
  }

  async getListings(params: SearchParams = {}): Promise<ListingsResponse> {
    const cacheKey = `listings:${JSON.stringify(params)}`;
    
    // Try to get from cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from API
    const response = await super.getListings(params);
    
    // Cache the response
    await this.redis.setex(cacheKey, this.defaultTTL, JSON.stringify(response));
    
    return response;
  }

  async getListing(id: string): Promise<ListingResponse> {
    const cacheKey = `listing:${id}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await super.getListing(id);
    
    // Cache individual listings for longer
    await this.redis.setex(cacheKey, 1800, JSON.stringify(response)); // 30 minutes
    
    return response;
  }

  // Invalidate cache when data changes
  async updateListing(id: string, updates: UpdateListingRequest): Promise<ListingResponse> {
    const response = await super.updateListing(id, updates);
    
    // Clear related caches
    await this.redis.del(`listing:${id}`);
    await this.redis.del('listings:*'); // Clear all listing searches
    
    return response;
  }
}

// Request batching
class BatchedHarborListAPI extends HarborListAPI {
  private batchQueue: Array<{
    resolve: Function;
    reject: Function;
    id: string;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  async getListing(id: string): Promise<ListingResponse> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ resolve, reject, id });
      
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, 100); // Batch requests for 100ms
      }
    });
  }

  private async processBatch(): Promise<void> {
    const batch = [...this.batchQueue];
    this.batchQueue.length = 0;
    this.batchTimeout = null;

    if (batch.length === 0) return;

    try {
      // Make batched request
      const ids = batch.map(item => item.id);
      const response = await this.request<{ listings: Listing[] }>(
        `/listings/batch?ids=${ids.join(',')}`
      );

      // Resolve individual promises
      batch.forEach(({ resolve, id }) => {
        const listing = response.listings.find(l => l.id === id);
        if (listing) {
          resolve({ success: true, data: { listing } });
        } else {
          resolve({ success: false, error: { message: 'Listing not found' } });
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

---

## 🔗 **Related Documentation**

- **🔌 [API Reference](./README.md)**: Complete API endpoint documentation
- **🔐 [Authentication Guide](../frontend/authentication.md)**: Authentication implementation details
- **🛡️ [Security Framework](../security/README.md)**: Security best practices and implementation
- **🧪 [API Testing](../testing/README.md)**: Testing strategies for API integration
- **📊 [Performance Guide](../performance/README.md)**: API performance optimization

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 Integration Team**: HarborList API Team  
**🔄 Next Review**: January 2026