import { BoatDetails } from '../../types/listing';

interface BoatSpecsProps {
  boatDetails: BoatDetails;
}

export default function BoatSpecs({ boatDetails }: BoatSpecsProps) {
  const specs = [
    { label: 'Type', value: boatDetails.type },
    { label: 'Manufacturer', value: boatDetails.manufacturer },
    { label: 'Model', value: boatDetails.model },
    { label: 'Year', value: boatDetails.year },
    { label: 'Length', value: `${boatDetails.length} ft` },
    { label: 'Beam', value: boatDetails.beam ? `${boatDetails.beam} ft` : undefined },
    { label: 'Draft', value: boatDetails.draft ? `${boatDetails.draft} ft` : undefined },
    { label: 'Engine', value: boatDetails.engine },
    { label: 'Engine Hours', value: boatDetails.hours ? boatDetails.hours.toLocaleString() : undefined },
    { label: 'Condition', value: boatDetails.condition },
  ].filter(spec => spec.value !== undefined);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specs.map((spec, index) => (
            <div key={index} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-600 font-medium">{spec.label}:</span>
              <span className="text-gray-900">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
