import { Engine, BoatDetails, EnhancedListing } from '../common';

describe('Engine Types', () => {
  describe('Engine Interface', () => {
    it('should validate required Engine properties', () => {
      const validEngine: Engine = {
        engineId: 'engine-123',
        type: 'outboard',
        horsepower: 250,
        fuelType: 'gasoline',
        condition: 'excellent',
        position: 1
      };

      expect(validEngine.engineId).toBe('engine-123');
      expect(validEngine.type).toBe('outboard');
      expect(validEngine.horsepower).toBe(250);
      expect(validEngine.fuelType).toBe('gasoline');
      expect(validEngine.condition).toBe('excellent');
      expect(validEngine.position).toBe(1);
    });

    it('should validate optional Engine properties', () => {
      const engineWithOptionals: Engine = {
        engineId: 'engine-456',
        type: 'inboard',
        manufacturer: 'Yamaha',
        model: 'F250',
        horsepower: 250,
        fuelType: 'gasoline',
        hours: 150,
        year: 2022,
        condition: 'good',
        specifications: {
          displacement: '4.2L',
          cylinders: 6,
          cooling: 'water'
        },
        position: 1
      };

      expect(engineWithOptionals.manufacturer).toBe('Yamaha');
      expect(engineWithOptionals.model).toBe('F250');
      expect(engineWithOptionals.hours).toBe(150);
      expect(engineWithOptionals.year).toBe(2022);
      expect(engineWithOptionals.specifications).toEqual({
        displacement: '4.2L',
        cylinders: 6,
        cooling: 'water'
      });
    });

    it('should validate Engine type enum values', () => {
      const validTypes: Engine['type'][] = [
        'outboard',
        'inboard', 
        'sterndrive',
        'jet',
        'electric',
        'hybrid'
      ];

      validTypes.forEach(type => {
        const engine: Engine = {
          engineId: 'test',
          type,
          horsepower: 100,
          fuelType: 'gasoline',
          condition: 'good',
          position: 1
        };
        expect(engine.type).toBe(type);
      });
    });

    it('should validate Engine fuelType enum values', () => {
      const validFuelTypes: Engine['fuelType'][] = [
        'gasoline',
        'diesel',
        'electric',
        'hybrid'
      ];

      validFuelTypes.forEach(fuelType => {
        const engine: Engine = {
          engineId: 'test',
          type: 'outboard',
          horsepower: 100,
          fuelType,
          condition: 'good',
          position: 1
        };
        expect(engine.fuelType).toBe(fuelType);
      });
    });

    it('should validate Engine condition enum values', () => {
      const validConditions: Engine['condition'][] = [
        'excellent',
        'good',
        'fair',
        'needs_work'
      ];

      validConditions.forEach(condition => {
        const engine: Engine = {
          engineId: 'test',
          type: 'outboard',
          horsepower: 100,
          fuelType: 'gasoline',
          condition,
          position: 1
        };
        expect(engine.condition).toBe(condition);
      });
    });

    it('should validate Engine position constraints', () => {
      const positions = [1, 2, 3, 4];
      
      positions.forEach(position => {
        const engine: Engine = {
          engineId: 'test',
          type: 'outboard',
          horsepower: 100,
          fuelType: 'gasoline',
          condition: 'good',
          position
        };
        expect(engine.position).toBe(position);
        expect(typeof engine.position).toBe('number');
      });
    });
  });

  describe('Enhanced BoatDetails with Multi-Engine Support', () => {
    it('should support legacy single engine format', () => {
      const legacyBoatDetails: BoatDetails = {
        type: 'Sport Fishing',
        manufacturer: 'Boston Whaler',
        model: 'Outrage 320',
        year: 2020,
        length: 32,
        beam: 10.5,
        draft: 2.5,
        engine: 'Twin 300HP Outboards',
        hours: 200,
        condition: 'Excellent'
      };

      expect(legacyBoatDetails.engine).toBe('Twin 300HP Outboards');
      expect(legacyBoatDetails.hours).toBe(200);
    });

    it('should support new multi-engine format', () => {
      const multiEngineBoatDetails: BoatDetails = {
        type: 'Sport Fishing',
        manufacturer: 'Boston Whaler',
        model: 'Outrage 320',
        year: 2020,
        length: 32,
        beam: 10.5,
        draft: 2.5,
        condition: 'Excellent',
        engines: [
          {
            engineId: 'engine-1',
            type: 'outboard',
            manufacturer: 'Yamaha',
            model: 'F300',
            horsepower: 300,
            fuelType: 'gasoline',
            hours: 200,
            year: 2020,
            condition: 'excellent',
            position: 1
          },
          {
            engineId: 'engine-2',
            type: 'outboard',
            manufacturer: 'Yamaha',
            model: 'F300',
            horsepower: 300,
            fuelType: 'gasoline',
            hours: 200,
            year: 2020,
            condition: 'excellent',
            position: 2
          }
        ],
        totalHorsepower: 600,
        engineConfiguration: 'twin'
      };

      expect(multiEngineBoatDetails.engines).toHaveLength(2);
      expect(multiEngineBoatDetails.totalHorsepower).toBe(600);
      expect(multiEngineBoatDetails.engineConfiguration).toBe('twin');
    });

    it('should validate engineConfiguration enum values', () => {
      const validConfigurations: BoatDetails['engineConfiguration'][] = [
        'single',
        'twin',
        'triple',
        'quad'
      ];

      validConfigurations.forEach(config => {
        const boatDetails: BoatDetails = {
          type: 'Test',
          year: 2020,
          length: 30,
          condition: 'Good',
          engineConfiguration: config
        };
        expect(boatDetails.engineConfiguration).toBe(config);
      });
    });
  });

  describe('EnhancedListing with Multi-Engine Support', () => {
    it('should extend base Listing with multi-engine properties', () => {
      const enhancedListing: EnhancedListing = {
        listingId: 'listing-123',
        ownerId: 'user-456',
        title: 'Beautiful Sport Fishing Boat',
        description: 'Well maintained boat with twin engines',
        price: 150000,
        location: {
          city: 'Miami',
          state: 'FL',
          zipCode: '33101'
        },
        boatDetails: {
          type: 'Sport Fishing',
          year: 2020,
          length: 32,
          condition: 'Excellent'
        },
        features: ['GPS', 'Fish Finder'],
        images: ['image1.jpg', 'image2.jpg'],
        thumbnails: ['thumb1.jpg', 'thumb2.jpg'],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Enhanced properties
        slug: 'beautiful-sport-fishing-boat-miami-fl',
        engines: [
          {
            engineId: 'engine-1',
            type: 'outboard',
            horsepower: 300,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 1
          },
          {
            engineId: 'engine-2',
            type: 'outboard',
            horsepower: 300,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 2
          }
        ],
        totalHorsepower: 600,
        engineConfiguration: 'twin'
      };

      expect(enhancedListing.slug).toBe('beautiful-sport-fishing-boat-miami-fl');
      expect(enhancedListing.engines).toHaveLength(2);
      expect(enhancedListing.totalHorsepower).toBe(600);
      expect(enhancedListing.engineConfiguration).toBe('twin');
    });

    it('should support moderation workflow properties', () => {
      const listingWithModeration: EnhancedListing = {
        listingId: 'listing-789',
        ownerId: 'user-123',
        title: 'Test Listing',
        description: 'Test description',
        price: 50000,
        location: { city: 'Test', state: 'TX' },
        boatDetails: {
          type: 'Test',
          year: 2020,
          length: 25,
          condition: 'Good'
        },
        features: [],
        images: [],
        thumbnails: [],
        status: 'pending_review',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        slug: 'test-listing',
        engines: [],
        totalHorsepower: 0,
        engineConfiguration: 'single',
        moderationWorkflow: {
          status: 'pending_review',
          reviewedBy: 'moderator-123',
          reviewedAt: Date.now(),
          rejectionReason: 'Incomplete information',
          moderatorNotes: 'Missing engine specifications',
          requiredChanges: ['Add engine details', 'Update images']
        }
      };

      expect(listingWithModeration.moderationWorkflow?.status).toBe('pending_review');
      expect(listingWithModeration.moderationWorkflow?.reviewedBy).toBe('moderator-123');
      expect(listingWithModeration.moderationWorkflow?.requiredChanges).toEqual([
        'Add engine details',
        'Update images'
      ]);
    });
  });
});