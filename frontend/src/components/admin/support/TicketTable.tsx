import React, { useState } from 'react';
import { SupportTicket, AdminUser } from '@harborlist/shared-types';

interface TicketTableProps {
  tickets: SupportTicket[];
  onTicketSelect: (ticket: SupportTicket) => void;
  onTicketAssign: (ticketId: string, assignedTo: string) => void;
  onTicketUpdate: (ticketId: string, updates: Partial<SupportTicket>) => void;
}

const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  onTicketSelect,
  onTicketAssign,
  onTicketUpdate
}) => {
  const [sortField, setSortField] = useState<keyof SupportTicket>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof SupportTicket) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue !== undefined && bValue !== undefined) {
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_response': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    onTicketUpdate(ticketId, { status: newStatus as any });
  };

  const handlePriorityChange = (ticketId: string, newPriority: string) => {
    onTicketUpdate(ticketId, { priority: newPriority as any });
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ticketNumber')}
              >
                Ticket #
                {sortField === 'ticketNumber' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('subject')}
              >
                Subject
                {sortField === 'subject' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                Created
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  <button
                    onClick={() => onTicketSelect(ticket)}
                    className="hover:text-blue-800"
                  >
                    #{ticket.ticketNumber}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate">
                    {ticket.subject}
                  </div>
                  <div className="text-xs text-gray-500">
                    {ticket.category}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{ticket.userName}</div>
                  <div className="text-xs text-gray-500">{ticket.userEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={ticket.priority}
                    onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${getPriorityColor(ticket.priority)}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(ticket.status)}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_response">Waiting Response</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ticket.assignedToName ? (
                    <div className="flex items-center">
                      <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {ticket.assignedToName.charAt(0).toUpperCase()}
                      </div>
                      <span className="ml-2">{ticket.assignedToName}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        // This would open an assignment modal in a real implementation
                        const assignedTo = prompt('Enter admin ID to assign to:');
                        if (assignedTo) {
                          onTicketAssign(ticket.id, assignedTo);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Assign
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(ticket.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onTicketSelect(ticket)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View
                  </button>
                  {ticket.escalated && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Escalated
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {tickets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No support tickets found</div>
        </div>
      )}
    </div>
  );
};

export { TicketTable };