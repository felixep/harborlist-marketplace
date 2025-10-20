/**
 * @fileoverview Enhanced boat specifications display component with multi-engine support.
 * 
 * Displays comprehensive boat specifications including multi-engine configurations,
 * total horsepower calculations, and engine details with responsive design.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { BoatDetails, Engine } from '@harborlist/shared-types';

interface BoatSpecsProps {
  boatDetails: BoatDetails;
}

/**
 * Enhanced boat specifications component with multi-engine support
 * 
 * Features:
 * - Multi-engine configuration display
 * - Total horsepower prominence
 * - Individual engine details
 * - Responsive grid layout
 * - Legacy engine field support
 * 
 * @param {BoatSpecsProps} props - Component props
 * @returns {JSX.Element} Enhanced boat specifications display
 */
export default function BoatSpecs({ boatDetails }: BoatSpecsProps) {
  // Basic boat specifications (excluding engine info)
  const basicSpecs = [
    { label: 'Type', value: boatDetails.type },
    { label: 'Manufacturer', value: boatDetails.manufacturer },
    { label: 'Model', value: boatDetails.model },
    { label: 'Year', value: boatDetails.year },
    { label: 'Length', value: `${boatDetails.length} ft` },
    { label: 'Beam', value: boatDetails.beam && boatDetails.beam > 0 ? `${boatDetails.beam} ft` : undefined },
    { label: 'Draft', value: boatDetails.draft && boatDetails.draft > 0 ? `${boatDetails.draft} ft` : undefined },
    { label: 'Condition', value: boatDetails.condition },
  ].filter(spec => spec.value !== undefined);

  // Check if we have multi-engine data or legacy engine data
  const hasMultiEngineData = boatDetails.engines && boatDetails.engines.length > 0;
  const hasLegacyEngineData = boatDetails.engine || boatDetails.hours;

  /**
   * Format engine type for display
   */
  const formatEngineType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  /**
   * Format fuel type for display
   */
  const formatFuelType = (fuelType: string): string => {
    return fuelType.charAt(0).toUpperCase() + fuelType.slice(1);
  };

  /**
   * Format condition for display
   */
  const formatCondition = (condition: string): string => {
    return condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' ');
  };

  /**
   * Get engine configuration display text
   */
  const getEngineConfigurationText = (engines: Engine[]): string => {
    const count = engines.length;
    if (count === 1) return 'Single Engine';
    if (count === 2) return 'Twin Engine';
    if (count === 3) return 'Triple Engine';
    if (count === 4) return 'Quad Engine';
    return `${count} Engines`;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        <span className="mr-2">⚙️</span>Specifications
      </h2>
      
      {/* Basic Specifications */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Boat Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {basicSpecs.map((spec, index) => (
            <div key={index} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-600 font-medium">{spec.label}:</span>
              <span className="text-gray-900">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Engine Configuration */}
      {hasMultiEngineData && (
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-blue-900">
              Engine Configuration
            </h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {boatDetails.totalHorsepower?.toLocaleString() || 0} HP
              </div>
              <div className="text-sm text-blue-700">Total Power</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-blue-700 mb-4">
            <span>{getEngineConfigurationText(boatDetails.engines!)}</span>
            <span>•</span>
            <span>
              Average: {Math.round((boatDetails.totalHorsepower || 0) / boatDetails.engines!.length)} HP per engine
            </span>
          </div>

          {/* Individual Engine Details */}
          <div className="space-y-4">
            {boatDetails.engines!.map((engine, index) => (
              <div key={engine.engineId} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                      {engine.position}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {engine.manufacturer && engine.model 
                          ? `${engine.manufacturer} ${engine.model}`
                          : `Engine ${engine.position}`
                        }
                      </h4>
                      <div className="text-sm text-gray-500">
                        {formatEngineType(engine.type)} • {formatFuelType(engine.fuelType)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {engine.horsepower} HP
                    </div>
                    {engine.hours && (
                      <div className="text-sm text-gray-500">
                        {engine.hours.toLocaleString()} hrs
                      </div>
                    )}
                  </div>
                </div>

                {/* Engine Specifications Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {engine.year && (
                    <div>
                      <span className="text-gray-500">Year:</span>
                      <div className="font-medium">{engine.year}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Condition:</span>
                    <div className="font-medium">{formatCondition(engine.condition)}</div>
                  </div>
                  {engine.manufacturer && (
                    <div>
                      <span className="text-gray-500">Make:</span>
                      <div className="font-medium">{engine.manufacturer}</div>
                    </div>
                  )}
                  {engine.model && (
                    <div>
                      <span className="text-gray-500">Model:</span>
                      <div className="font-medium">{engine.model}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Engine Information (for backward compatibility) */}
      {!hasMultiEngineData && hasLegacyEngineData && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Engine Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boatDetails.engine && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Engine:</span>
                <span className="text-gray-900">{boatDetails.engine}</span>
              </div>
            )}
            {boatDetails.hours && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Engine Hours:</span>
                <span className="text-gray-900">{boatDetails.hours.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Engine Information */}
      {!hasMultiEngineData && !hasLegacyEngineData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-800">
              Engine information not specified for this listing.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
