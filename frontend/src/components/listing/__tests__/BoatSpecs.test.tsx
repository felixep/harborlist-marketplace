/**
 * @fileoverview Tests for enhanced BoatSpecs component
 * 
 * Tests multi-engine display, legacy engine support, and responsive design.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BoatDetails, Engine } from '@harborlist/shared-types';
import BoatSpecs from '../BoatSpecs';

// Mock boat details for testing
const mockBoatDetails: BoatDetails = {
  type: 'Motor Yacht',
  manufacturer: 'Sea Ray',
  model: 'Sundancer 350',
  year: 2020,
  length: 35,
  beam: 12,
  draft: 3.5,
  condition: 'Excellent',
  engine: 'Twin Mercruiser 8.2L', // Legacy field
  hours: 150 // Legacy field
};

const mockEngines: Engine[] = [
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
    hours: 150
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
    hours: 150
  }
];

const mockEnhancedBoatDetails: BoatDetails = {
  ...mockBoatDetails,
  engines: mockEngines,
  totalHorsepower: 760,
  engineConfiguration: 'twin'
};

describe('BoatSpecs', () => {
  describe('Basic Specifications', () => {
    it('renders basic boat specifications', () => {
      render(<BoatSpecs boatDetails={mockBoatDetails} />);
      
      expect(screen.getByText('⚙️Specifications')).toBeInTheDocument();
      expect(screen.getByText('Boat Details')).toBeInTheDocument();
      expect(screen.getByText('Motor Yacht')).toBeInTheDocument();
      expect(screen.getByText('Sea Ray')).toBeInTheDocument();
      expect(screen.getByText('Sundancer 350')).toBeInTheDocument();
      expect(screen.getByText('2020')).toBeInTheDocument();
      expect(screen.getByText('35 ft')).toBeInTheDocument();
      expect(screen.getByText('12 ft')).toBeInTheDocument();
      expect(screen.getByText('3.5 ft')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('handles missing optional fields gracefully', () => {
      const minimalBoatDetails: BoatDetails = {
        type: 'Sailboat',
        year: 2015,
        length: 30,
        condition: 'Good'
      };
      
      render(<BoatSpecs boatDetails={minimalBoatDetails} />);
      
      expect(screen.getByText('Sailboat')).toBeInTheDocument();
      expect(screen.getByText('2015')).toBeInTheDocument();
      expect(screen.getByText('30 ft')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      
      // Should not show manufacturer/model if not provided
      expect(screen.queryByText('Manufacturer:')).not.toBeInTheDocument();
      expect(screen.queryByText('Model:')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Engine Display', () => {
    it('renders multi-engine configuration', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      expect(screen.getByText('Engine Configuration')).toBeInTheDocument();
      expect(screen.getByText('760 HP')).toBeInTheDocument();
      expect(screen.getByText('Total Power')).toBeInTheDocument();
      expect(screen.getByText('Twin Engine')).toBeInTheDocument();
      expect(screen.getByText('Average: 380 HP per engine')).toBeInTheDocument();
    });

    it('displays individual engine details', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      // Should show both engines
      const engine1Elements = screen.getAllByText('Mercruiser 8.2L');
      expect(engine1Elements).toHaveLength(2);
      
      const horsepowerElements = screen.getAllByText('380 HP');
      expect(horsepowerElements).toHaveLength(2);
      
      const hoursElements = screen.getAllByText('150 hrs');
      expect(hoursElements).toHaveLength(2);
      
      expect(screen.getAllByText('Inboard • Gasoline')).toHaveLength(2);
      expect(screen.getAllByText('Excellent')).toHaveLength(4); // 2 engines + 2 condition displays
    });

    it('shows engine position numbers', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      // Position numbers should be displayed in circles
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles single engine configuration', () => {
      const singleEngineDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: [mockEngines[0]],
        totalHorsepower: 380,
        engineConfiguration: 'single'
      };
      
      render(<BoatSpecs boatDetails={singleEngineDetails} />);
      
      expect(screen.getByText('Single Engine')).toBeInTheDocument();
      expect(screen.getByText('380 HP')).toBeInTheDocument();
      expect(screen.getByText('Average: 380 HP per engine')).toBeInTheDocument();
    });

    it('handles triple engine configuration', () => {
      const tripleEngineDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: [...mockEngines, { ...mockEngines[0], engineId: 'engine_3', position: 3 }],
        totalHorsepower: 1140,
        engineConfiguration: 'triple'
      };
      
      render(<BoatSpecs boatDetails={tripleEngineDetails} />);
      
      expect(screen.getByText('Triple Engine')).toBeInTheDocument();
      expect(screen.getByText('1,140 HP')).toBeInTheDocument();
      expect(screen.getByText('Average: 380 HP per engine')).toBeInTheDocument();
    });

    it('handles quad engine configuration', () => {
      const quadEngineDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: [
          ...mockEngines,
          { ...mockEngines[0], engineId: 'engine_3', position: 3 },
          { ...mockEngines[0], engineId: 'engine_4', position: 4 }
        ],
        totalHorsepower: 1520,
        engineConfiguration: 'quad'
      };
      
      render(<BoatSpecs boatDetails={quadEngineDetails} />);
      
      expect(screen.getByText('Quad Engine')).toBeInTheDocument();
      expect(screen.getByText('1,520 HP')).toBeInTheDocument();
    });
  });

  describe('Legacy Engine Support', () => {
    it('displays legacy engine information when no multi-engine data', () => {
      render(<BoatSpecs boatDetails={mockBoatDetails} />);
      
      expect(screen.getByText('Engine Information')).toBeInTheDocument();
      expect(screen.getByText('Twin Mercruiser 8.2L')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('handles legacy engine without hours', () => {
      const boatDetailsNoHours: BoatDetails = {
        ...mockBoatDetails,
        hours: undefined
      };
      
      render(<BoatSpecs boatDetails={boatDetailsNoHours} />);
      
      expect(screen.getByText('Twin Mercruiser 8.2L')).toBeInTheDocument();
      expect(screen.queryByText('Engine Hours:')).not.toBeInTheDocument();
    });

    it('handles legacy engine without engine description', () => {
      const boatDetailsNoEngine: BoatDetails = {
        ...mockBoatDetails,
        engine: undefined,
        hours: 150
      };
      
      render(<BoatSpecs boatDetails={boatDetailsNoEngine} />);
      
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.queryByText('Engine:')).not.toBeInTheDocument();
    });
  });

  describe('No Engine Information', () => {
    it('displays warning when no engine information available', () => {
      const boatDetailsNoEngine: BoatDetails = {
        ...mockBoatDetails,
        engine: undefined,
        hours: undefined,
        engines: undefined
      };
      
      render(<BoatSpecs boatDetails={boatDetailsNoEngine} />);
      
      expect(screen.getByText('Engine information not specified for this listing.')).toBeInTheDocument();
    });
  });

  describe('Engine Details Formatting', () => {
    it('formats engine types correctly', () => {
      const engineWithDifferentTypes: Engine[] = [
        { ...mockEngines[0], type: 'outboard' },
        { ...mockEngines[1], type: 'sterndrive' },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: engineWithDifferentTypes,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('Outboard • Gasoline')).toBeInTheDocument();
      expect(screen.getByText('Sterndrive • Gasoline')).toBeInTheDocument();
    });

    it('formats fuel types correctly', () => {
      const engineWithDifferentFuels: Engine[] = [
        { ...mockEngines[0], fuelType: 'diesel' },
        { ...mockEngines[1], fuelType: 'electric' },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: engineWithDifferentFuels,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('Inboard • Diesel')).toBeInTheDocument();
      expect(screen.getByText('Inboard • Electric')).toBeInTheDocument();
    });

    it('formats conditions correctly', () => {
      const engineWithDifferentConditions: Engine[] = [
        { ...mockEngines[0], condition: 'needs_work' },
        { ...mockEngines[1], condition: 'fair' },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: engineWithDifferentConditions,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('Needs work')).toBeInTheDocument();
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('formats large horsepower numbers with commas', () => {
      const highPowerEngines: Engine[] = [
        { ...mockEngines[0], horsepower: 1500 },
        { ...mockEngines[1], horsepower: 1500 },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: highPowerEngines,
        totalHorsepower: 3000
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('3,000 HP')).toBeInTheDocument();
    });

    it('formats engine hours with commas', () => {
      const highHourEngines: Engine[] = [
        { ...mockEngines[0], hours: 1500 },
        { ...mockEngines[1], hours: 2000 },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: highHourEngines,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('1,500 hrs')).toBeInTheDocument();
      expect(screen.getByText('2,000 hrs')).toBeInTheDocument();
    });
  });

  describe('Engine Display Names', () => {
    it('displays manufacturer and model when available', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      expect(screen.getAllByText('Mercruiser 8.2L')).toHaveLength(2);
    });

    it('displays fallback name when manufacturer/model missing', () => {
      const enginesWithoutDetails: Engine[] = [
        { ...mockEngines[0], manufacturer: undefined, model: undefined },
        { ...mockEngines[1], manufacturer: undefined, model: undefined },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: enginesWithoutDetails,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('Engine 1')).toBeInTheDocument();
      expect(screen.getByText('Engine 2')).toBeInTheDocument();
    });

    it('displays partial information when only manufacturer available', () => {
      const enginesWithPartialInfo: Engine[] = [
        { ...mockEngines[0], model: undefined },
        { ...mockEngines[1], manufacturer: undefined },
      ];
      
      const boatDetails: BoatDetails = {
        ...mockBoatDetails,
        engines: enginesWithPartialInfo,
        totalHorsepower: 760
      };
      
      render(<BoatSpecs boatDetails={boatDetails} />);
      
      expect(screen.getByText('Mercruiser')).toBeInTheDocument();
      expect(screen.getByText('Engine 2')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies correct CSS classes for responsive layout', () => {
      const { container } = render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      // Check for responsive grid classes
      expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
      expect(container.querySelector('.md\\:grid-cols-2')).toBeInTheDocument();
      expect(container.querySelector('.md\\:grid-cols-4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      expect(screen.getByRole('heading', { level: 2, name: /specifications/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /boat details/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /engine configuration/i })).toBeInTheDocument();
    });

    it('provides meaningful text for screen readers', () => {
      render(<BoatSpecs boatDetails={mockEnhancedBoatDetails} />);
      
      expect(screen.getByText('Total Power')).toBeInTheDocument();
      expect(screen.getByText('Average: 380 HP per engine')).toBeInTheDocument();
    });
  });
});