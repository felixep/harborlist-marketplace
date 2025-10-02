export const mockListings = [
  {
    id: '1',
    title: 'Beautiful 35ft Sailboat',
    description: 'Well-maintained sailboat perfect for weekend getaways. Includes full galley, sleeping quarters for 4, and recent sail upgrades.',
    price: 45000,
    location: 'Miami, FL',
    boatType: 'Sailboat',
    year: 2018,
    length: 35,
    images: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
    ],
    ownerId: 'user1',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Luxury Motor Yacht',
    description: 'Stunning 42ft motor yacht with twin engines, spacious deck, and premium amenities. Perfect for entertaining.',
    price: 125000,
    location: 'Fort Lauderdale, FL',
    boatType: 'Motor Yacht',
    year: 2020,
    length: 42,
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
      'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800'
    ],
    ownerId: 'user2',
    status: 'active',
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '3',
    title: 'Classic Fishing Boat',
    description: 'Reliable 28ft fishing boat with outriggers, fish finder, and plenty of storage. Great for deep sea fishing.',
    price: 32000,
    location: 'Key West, FL',
    boatType: 'Fishing Boat',
    year: 2017,
    length: 28,
    images: [
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'
    ],
    ownerId: 'user3',
    status: 'active',
    createdAt: '2024-01-25T09:15:00Z'
  }
];

export const mockUsers = [
  {
    id: 'user1',
    name: 'John Smith',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    location: 'Miami, FL'
  },
  {
    id: 'user2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '(555) 987-6543',
    location: 'Fort Lauderdale, FL'
  },
  {
    id: 'user3',
    name: 'Mike Wilson',
    email: 'mike@example.com',
    phone: '(555) 456-7890',
    location: 'Key West, FL'
  }
];
