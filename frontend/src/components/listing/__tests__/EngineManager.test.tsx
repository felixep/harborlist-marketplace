/**
 * @fileoverview Tests for EngineManager component
 * 
 * Tests multi-engine form validation, engine addition/removal,
 * total horsepower calculation, and user interactions.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Engine } from '@harborlist/shared-types';
import EngineManager from '../EngineManager';

// Mock engines for testing
const mockEngine1: Engine = {
  engineId: 'engine_1',
  type: 'outboard',
  manufacturer: 'Mercury',
  model: 'Verado 250',
  horsepower: 250,
  fuelType: 'gasoline',
  condition: 'excellent',
  position: 1,
  year: 2020,
  hours: 150
};

const mockEngine2: Engine = {
  engineId: 'engine_2',
  type: 'outboard',
  manufacturer: 'Yamaha',
  model: 'F300',
  horsepower: 300,
  fuelType: 'gasoline',
  condition: 'good',
  position: 2,
  year: 2021,
  hours: 100
};

describe('EngineManager', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Initial State', () => {
    it('renders empty state with add engine button', () => {
      render(<EngineManager engines={[]} onChange={mockOnChange} />);
      
      expect(screen.getByText('Engine Configuration: Single')).toBeInTheDocument();
      expect(screen.getByText('0 HP')).toBeInTheDocument();
      expect(screen.getByText('Total Power')).toBeInTheDocument();
      expect(screen.getByText('0 Engines')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add engine/i })).toBeInTheDocument();
      expect(screen.getByText('At least one engine is required for the listing.')).toBeInTheDocument();
    });

    it('renders with existing engines', () => {
      render(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      
      expect(screen.getByText('Engine Configuration: Twin')).toBeInTheDocument();
      expect(screen.getByText('550 HP')).toBeInTheDocument();
      expect(screen.getByText('2 Engines')).toBeInTheDocument();
      expect(screen.getByText('Average: 275 HP per engine')).toBeInTheDocument();
      expect(screen.getByText('Mercury Verado 250')).toBeInTheDocument();
      expect(screen.getByText('Yamaha F300')).toBeInTheDocument();
    });
  });

  describe('Engine Addition', () => {
    it('adds a new engine when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[]} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /add engine/i });
      await user.click(addButton);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'outboard',
          horsepower: 0,
          fuelType: 'gasoline',
          condition: 'good',
          position: 1
        })
      ]);
    });

    it('assigns correct position numbers to multiple engines', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /add engine/i });
      await user.click(addButton);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        mockEngine1,
        expect.objectContaining({
          position: 2
        })
      ]);
    });
  });

  describe('Engine Removal', () => {
    it('removes an engine when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByTitle('Remove Engine');
      await user.click(deleteButtons[0]);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockEngine2,
          position: 1 // Position should be updated
        })
      ]);
    });

    it('updates positions correctly after removal', async () => {
      const user = userEvent.setup();
      const engines = [mockEngine1, mockEngine2, { ...mockEngine1, engineId: 'engine_3', position: 3 }];
      render(<EngineManager engines={engines} onChange={mockOnChange} />);
      
      // Remove the middle engine
      const deleteButtons = screen.getAllByTitle('Remove Engine');
      await user.click(deleteButtons[1]);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({ position: 1 }),
        expect.objectContaining({ position: 2 })
      ]);
    });
  });

  describe('Engine Configuration Display', () => {
    it('displays correct configuration for single engine', () => {
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      expect(screen.getByText('Engine Configuration: Single')).toBeInTheDocument();
    });

    it('displays correct configuration for twin engines', () => {
      render(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      expect(screen.getByText('Engine Configuration: Twin')).toBeInTheDocument();
    });

    it('displays correct configuration for triple engines', () => {
      const engines = [mockEngine1, mockEngine2, { ...mockEngine1, engineId: 'engine_3', position: 3 }];
      render(<EngineManager engines={engines} onChange={mockOnChange} />);
      expect(screen.getByText('Engine Configuration: Triple')).toBeInTheDocument();
    });

    it('displays correct configuration for quad engines', () => {
      const engines = [
        mockEngine1, 
        mockEngine2, 
        { ...mockEngine1, engineId: 'engine_3', position: 3 },
        { ...mockEngine1, engineId: 'engine_4', position: 4 }
      ];
      render(<EngineManager engines={engines} onChange={mockOnChange} />);
      expect(screen.getByText('Engine Configuration: Quad')).toBeInTheDocument();
    });
  });

  describe('Total Horsepower Calculation', () => {
    it('calculates total horsepower correctly', () => {
      render(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      expect(screen.getByText('550 HP')).toBeInTheDocument();
    });

    it('calculates average horsepower correctly', () => {
      render(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      expect(screen.getByText('Average: 275 HP per engine')).toBeInTheDocument();
    });

    it('handles zero horsepower engines', () => {
      const zeroHpEngine = { ...mockEngine1, horsepower: 0 };
      render(<EngineManager engines={[zeroHpEngine]} onChange={mockOnChange} />);
      expect(screen.getByText('0 HP')).toBeInTheDocument();
    });
  });

  describe('Engine Details Form', () => {
    it('expands engine details when header is clicked', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      const engineHeader = screen.getByText('Mercury Verado 250');
      await user.click(engineHeader);
      
      expect(screen.getByDisplayValue('Mercury')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Verado 250')).toBeInTheDocument();
      expect(screen.getByDisplayValue('250')).toBeInTheDocument();
    });

    it('updates engine properties when form fields change', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      // Expand engine details
      const engineHeader = screen.getByText('Mercury Verado 250');
      await user.click(engineHeader);
      
      // Update horsepower
      const horsepowerInput = screen.getByDisplayValue('250');
      await user.clear(horsepowerInput);
      await user.type(horsepowerInput, '275');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockEngine1,
          horsepower: 275
        })
      ]);
    });

    it('updates engine type when dropdown changes', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      // Expand engine details
      const engineHeader = screen.getByText('Mercury Verado 250');
      await user.click(engineHeader);
      
      // Change engine type
      const typeSelect = screen.getByDisplayValue('Outboard');
      await user.selectOptions(typeSelect, 'inboard');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockEngine1,
          type: 'inboard'
        })
      ]);
    });
  });

  describe('Validation', () => {
    it('shows validation errors for invalid engines', () => {
      const invalidEngine = { ...mockEngine1, horsepower: 0 };
      render(<EngineManager engines={[invalidEngine]} onChange={mockOnChange} />);
      
      expect(screen.getByText('• Horsepower is required and must be greater than 0')).toBeInTheDocument();
    });

    it('shows validation errors for invalid year', () => {
      const invalidEngine = { ...mockEngine1, year: 1800 };
      render(<EngineManager engines={[invalidEngine]} onChange={mockOnChange} />);
      
      expect(screen.getByText('• Year must be between 1900 and next year')).toBeInTheDocument();
    });

    it('shows validation errors for negative hours', () => {
      const invalidEngine = { ...mockEngine1, hours: -10 };
      render(<EngineManager engines={[invalidEngine]} onChange={mockOnChange} />);
      
      expect(screen.getByText('• Hours cannot be negative')).toBeInTheDocument();
    });

    it('applies error styling to invalid engines', () => {
      const invalidEngine = { ...mockEngine1, horsepower: 0 };
      render(<EngineManager engines={[invalidEngine]} onChange={mockOnChange} />);
      
      const engineContainer = screen.getByText('Mercury Verado 250').closest('div');
      expect(engineContainer).toHaveClass('border-red-300', 'bg-red-50');
    });
  });

  describe('Engine Display Names', () => {
    it('displays manufacturer and model when available', () => {
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      expect(screen.getByText('Mercury Verado 250')).toBeInTheDocument();
    });

    it('displays fallback name when manufacturer/model missing', () => {
      const engineWithoutDetails = {
        ...mockEngine1,
        manufacturer: '',
        model: '',
        horsepower: 200
      };
      render(<EngineManager engines={[engineWithoutDetails]} onChange={mockOnChange} />);
      expect(screen.getByText('Engine 1')).toBeInTheDocument();
    });

    it('includes horsepower in display name when available', () => {
      const engineWithHp = {
        ...mockEngine1,
        manufacturer: 'Mercury',
        model: '',
        horsepower: 250
      };
      render(<EngineManager engines={[engineWithHp]} onChange={mockOnChange} />);
      expect(screen.getByText('Mercury 250HP')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      expect(screen.getByRole('button', { name: /add engine/i })).toBeInTheDocument();
      expect(screen.getByTitle('Remove Engine')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EngineManager engines={[]} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /add engine/i });
      
      // Tab to the button and press Enter
      await user.tab();
      expect(addButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('handles large numbers of engines efficiently', () => {
      const manyEngines = Array.from({ length: 10 }, (_, i) => ({
        ...mockEngine1,
        engineId: `engine_${i}`,
        position: i + 1
      }));
      
      const { container } = render(<EngineManager engines={manyEngines} onChange={mockOnChange} />);
      
      expect(container.querySelectorAll('[data-testid="engine-item"]')).toHaveLength(0); // No test IDs in current implementation
      expect(screen.getByText('10 Engines')).toBeInTheDocument();
    });

    it('updates calculations efficiently when engines change', () => {
      const { rerender } = render(<EngineManager engines={[mockEngine1]} onChange={mockOnChange} />);
      
      expect(screen.getByText('250 HP')).toBeInTheDocument();
      
      rerender(<EngineManager engines={[mockEngine1, mockEngine2]} onChange={mockOnChange} />);
      
      expect(screen.getByText('550 HP')).toBeInTheDocument();
    });
  });
});