/**
 * @fileoverview Multi-engine management component for boat listings.
 * 
 * Provides a dynamic interface for adding, editing, and removing multiple engines
 * from a boat listing. Includes validation, total horsepower calculation, and
 * engine configuration visualization.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Engine } from '@harborlist/shared-types';

/**
 * Props interface for the EngineManager component
 */
interface EngineManagerProps {
  engines: Engine[];
  onChange: (engines: Engine[]) => void;
  className?: string;
}

/**
 * Available engine types for selection
 */
const ENGINE_TYPES = [
  'outboard',
  'inboard', 
  'sterndrive',
  'jet',
  'electric',
  'hybrid'
] as const;

/**
 * Available fuel types for engines
 */
const FUEL_TYPES = [
  'gasoline',
  'diesel',
  'electric',
  'hybrid'
] as const;

/**
 * Available engine conditions
 */
const ENGINE_CONDITIONS = [
  'excellent',
  'good', 
  'fair',
  'needs_work'
] as const;

/**
 * Default engine configuration for new engines
 */
const DEFAULT_ENGINE: Omit<Engine, 'engineId' | 'position'> = {
  type: 'outboard',
  horsepower: 0,
  fuelType: 'gasoline',
  condition: 'good',
  manufacturer: '',
  model: '',
  hours: undefined,
  year: undefined,
  specifications: {}
};

/**
 * Multi-engine management component for boat listings
 * 
 * Features:
 * - Dynamic engine addition and removal
 * - Real-time total horsepower calculation
 * - Engine configuration visualization
 * - Comprehensive validation
 * - Position-based engine ordering
 * - Responsive design
 * 
 * @param {EngineManagerProps} props - Component props
 * @returns {JSX.Element} Multi-engine management interface
 */
export default function EngineManager({ engines, onChange, className = '' }: EngineManagerProps) {
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  /**
   * Generate unique engine ID
   */
  const generateEngineId = (): string => {
    return `engine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Calculate total horsepower across all engines
   */
  const totalHorsepower = engines.reduce((total, engine) => total + (engine.horsepower || 0), 0);

  /**
   * Determine engine configuration based on number of engines
   */
  const engineConfiguration = engines.length === 0 ? 'single' :
    engines.length === 1 ? 'single' :
    engines.length === 2 ? 'twin' :
    engines.length === 3 ? 'triple' : 'quad';

  /**
   * Add a new engine to the list
   */
  const addEngine = () => {
    const newEngine: Engine = {
      ...DEFAULT_ENGINE,
      engineId: generateEngineId(),
      position: engines.length + 1
    };
    
    onChange([...engines, newEngine]);
    setExpandedEngine(newEngine.engineId);
  };

  /**
   * Remove an engine from the list
   */
  const removeEngine = (engineId: string) => {
    const updatedEngines = engines
      .filter(engine => engine.engineId !== engineId)
      .map((engine, index) => ({
        ...engine,
        position: index + 1
      }));
    
    onChange(updatedEngines);
    
    if (expandedEngine === engineId) {
      setExpandedEngine(null);
    }
  };

  /**
   * Update a specific engine's properties
   */
  const updateEngine = (engineId: string, updates: Partial<Engine>) => {
    const updatedEngines = engines.map(engine =>
      engine.engineId === engineId
        ? { ...engine, ...updates }
        : engine
    );
    
    onChange(updatedEngines);
  };

  /**
   * Toggle engine details expansion
   */
  const toggleEngineExpansion = (engineId: string) => {
    setExpandedEngine(expandedEngine === engineId ? null : engineId);
  };

  /**
   * Format engine display name
   */
  const getEngineDisplayName = (engine: Engine) => {
    const parts = [
      engine.manufacturer,
      engine.model,
      engine.horsepower ? `${engine.horsepower}HP` : null
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(' ') : `Engine ${engine.position}`;
  };

  /**
   * Validate engine data
   */
  const validateEngine = (engine: Engine): string[] => {
    const errors: string[] = [];
    
    if (!engine.horsepower || engine.horsepower <= 0) {
      errors.push('Horsepower is required and must be greater than 0');
    }
    
    if (engine.year && (engine.year < 1900 || engine.year > new Date().getFullYear() + 1)) {
      errors.push('Year must be between 1900 and next year');
    }
    
    if (engine.hours && engine.hours < 0) {
      errors.push('Hours cannot be negative');
    }
    
    return errors;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Engine Configuration Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900">
            Engine Configuration: {engineConfiguration.charAt(0).toUpperCase() + engineConfiguration.slice(1)}
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">
              {totalHorsepower.toLocaleString()} HP
            </div>
            <div className="text-sm text-blue-700">Total Power</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-blue-700">
          <span>{engines.length} Engine{engines.length !== 1 ? 's' : ''}</span>
          {engines.length > 0 && (
            <span>
              Average: {Math.round(totalHorsepower / engines.length)} HP per engine
            </span>
          )}
        </div>
      </div>

      {/* Engine List */}
      <div className="space-y-4">
        {engines.map((engine, index) => {
          const isExpanded = expandedEngine === engine.engineId;
          const errors = validateEngine(engine);
          
          return (
            <div
              key={engine.engineId}
              className={`border rounded-lg ${errors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
            >
              {/* Engine Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleEngineExpansion(engine.engineId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                        {engine.position}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getEngineDisplayName(engine)}
                      </h4>
                      <div className="text-sm text-gray-500">
                        {engine.type.charAt(0).toUpperCase() + engine.type.slice(1)} • {engine.fuelType.charAt(0).toUpperCase() + engine.fuelType.slice(1)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {engine.horsepower || 0} HP
                      </div>
                      {engine.hours && (
                        <div className="text-sm text-gray-500">
                          {engine.hours.toLocaleString()} hrs
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEngine(engine.engineId);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove Engine"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Error Messages */}
                {errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Engine Details Form */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Engine Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Engine Type *
                      </label>
                      <select
                        value={engine.type}
                        onChange={(e) => updateEngine(engine.engineId, { type: e.target.value as Engine['type'] })}
                        className="form-select"
                        required
                      >
                        {ENGINE_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Horsepower */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horsepower *
                      </label>
                      <input
                        type="number"
                        value={engine.horsepower || ''}
                        onChange={(e) => updateEngine(engine.engineId, { horsepower: Number(e.target.value) || 0 })}
                        className="form-input"
                        placeholder="250"
                        min="1"
                        required
                      />
                    </div>

                    {/* Manufacturer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        value={engine.manufacturer || ''}
                        onChange={(e) => updateEngine(engine.engineId, { manufacturer: e.target.value })}
                        className="form-input"
                        placeholder="Mercury, Yamaha, etc."
                      />
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={engine.model || ''}
                        onChange={(e) => updateEngine(engine.engineId, { model: e.target.value })}
                        className="form-input"
                        placeholder="Verado 250"
                      />
                    </div>

                    {/* Fuel Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuel Type *
                      </label>
                      <select
                        value={engine.fuelType}
                        onChange={(e) => updateEngine(engine.engineId, { fuelType: e.target.value as Engine['fuelType'] })}
                        className="form-select"
                        required
                      >
                        {FUEL_TYPES.map(fuel => (
                          <option key={fuel} value={fuel}>
                            {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condition *
                      </label>
                      <select
                        value={engine.condition}
                        onChange={(e) => updateEngine(engine.engineId, { condition: e.target.value as Engine['condition'] })}
                        className="form-select"
                        required
                      >
                        {ENGINE_CONDITIONS.map(condition => (
                          <option key={condition} value={condition}>
                            {condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={engine.year || ''}
                        onChange={(e) => updateEngine(engine.engineId, { year: Number(e.target.value) || undefined })}
                        className="form-input"
                        placeholder="2020"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>

                    {/* Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Engine Hours
                      </label>
                      <input
                        type="number"
                        value={engine.hours || ''}
                        onChange={(e) => updateEngine(engine.engineId, { hours: Number(e.target.value) || undefined })}
                        className="form-input"
                        placeholder="150"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Engine Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={addEngine}
          className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Engine
        </button>
      </div>

      {/* Validation Summary */}
      {engines.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-yellow-800">
              At least one engine is required for the listing.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}