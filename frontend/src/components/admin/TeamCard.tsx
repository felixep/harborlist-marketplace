import React from 'react';

interface Team {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  memberCount: number;
  managerCount: number;
  defaultPermissions: string[];
  managerPermissions: string[];
}

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  onAssignUser: () => void;
}

const TEAM_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800 border-blue-200',
  customer_support: 'bg-green-100 text-green-800 border-green-200',
  content_moderation: 'bg-purple-100 text-purple-800 border-purple-200',
  technical_operations: 'bg-gray-100 text-gray-800 border-gray-200',
  marketing: 'bg-pink-100 text-pink-800 border-pink-200',
  finance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  product: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  executive: 'bg-red-100 text-red-800 border-red-200',
};

const TEAM_ICONS: Record<string, JSX.Element> = {
  sales: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  customer_support: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  content_moderation: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  technical_operations: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  marketing: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  finance: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  product: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  executive: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

export const TeamCard: React.FC<TeamCardProps> = ({ team, onClick, onAssignUser }) => {
  const colorClass = TEAM_COLORS[team.id] || 'bg-gray-100 text-gray-800 border-gray-200';
  const icon = TEAM_ICONS[team.id];

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className={`p-4 border-b ${colorClass} border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{team.name}</h3>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignUser();
            }}
            className="px-3 py-1 bg-white text-gray-700 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {team.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{team.memberCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Managers</p>
            <p className="text-2xl font-bold text-blue-600">{team.managerCount}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Key Responsibilities:</p>
          <ul className="space-y-1">
            {team.responsibilities.slice(0, 3).map((responsibility, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <svg className="h-4 w-4 text-green-500 mr-1 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {responsibility}
              </li>
            ))}
          </ul>
          {team.responsibilities.length > 3 && (
            <p className="text-xs text-gray-500 italic">
              +{team.responsibilities.length - 3} more...
            </p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{team.defaultPermissions.length} base permissions</span>
            <span>{team.managerPermissions.length} manager permissions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
