import React, { useState } from 'react';
import { SupportTicket, TicketResponse } from '@harborlist/shared-types';

interface TicketDetailModalProps {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdate: (ticketId: string, updates: Partial<SupportTicket>) => void;
  onResponse: (ticketId: string, message: string, isInternal?: boolean) => void;
  onAssign: (ticketId: string, assignedTo: string) => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onUpdate,
  onResponse,
  onAssign
}) => {
  const [responseMessage, setResponseMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'responses' | 'history'>('details');
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseMessage.trim()) return;

    await onResponse(ticket.id, responseMessage, isInternal);
    setResponseMessage('');
    setIsInternal(false);
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalationReason.trim()) return;

    await onUpdate(ticket.id, {
      escalated: true,
      escalatedAt: new Date().toISOString(),
      escalationReason
    });
    setShowEscalationForm(false);
    setEscalationReason('');
  };

  const handleStatusChange = (newStatus: string) => {
    const updates: Partial<SupportTicket> = { status: newStatus as any };
    
    if (newStatus === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    } else if (newStatus === 'closed') {
      updates.closedAt = new Date().toISOString();
    }
    
    onUpdate(ticket.id, updates);
  };

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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Ticket #{ticket.ticketNumber}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{ticket.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Ticket Status Bar */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(ticket.status)}`}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_response">Waiting Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Priority:</span>
            <select
              value={ticket.priority}
              onChange={(e) => onUpdate(ticket.id, { priority: e.target.value as any })}
              className={`text-xs px-2 py-1 rounded-full border-0 ${getPriorityColor(ticket.priority)}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {ticket.escalated && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Escalated
            </span>
          )}

          <div className="ml-auto flex space-x-2">
            {!ticket.escalated && (
              <button
                onClick={() => setShowEscalationForm(true)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Escalate
              </button>
            )}
          </div>
        </div>

        {/* Escalation Form */}
        {showEscalationForm && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">Escalate Ticket</h4>
            <form onSubmit={handleEscalate}>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Reason for escalation..."
                className="w-full p-2 border border-red-300 rounded-md text-sm"
                rows={3}
                required
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalationForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Escalate
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            {['details', 'responses', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.userName}</p>
                  <p className="text-sm text-gray-500">{ticket.userEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{ticket.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {ticket.assignedToName || 'Unassigned'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>

              {ticket.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ticket.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'responses' && (
            <div className="space-y-4">
              {ticket.responses.map((response) => (
                <div
                  key={response.id}
                  className={`p-4 rounded-lg ${
                    response.isInternal
                      ? 'bg-yellow-50 border border-yellow-200'
                      : response.authorType === 'admin'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{response.authorName}</span>
                      <span className="text-xs text-gray-500">
                        ({response.authorType})
                      </span>
                      {response.isInternal && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Internal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(response.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {response.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">
                Created: {formatDate(ticket.createdAt)}
              </div>
              <div className="text-sm text-gray-500">
                Last Updated: {formatDate(ticket.updatedAt)}
              </div>
              {ticket.resolvedAt && (
                <div className="text-sm text-gray-500">
                  Resolved: {formatDate(ticket.resolvedAt)}
                </div>
              )}
              {ticket.closedAt && (
                <div className="text-sm text-gray-500">
                  Closed: {formatDate(ticket.closedAt)}
                </div>
              )}
              {ticket.escalatedAt && (
                <div className="text-sm text-red-600">
                  Escalated: {formatDate(ticket.escalatedAt)}
                  {ticket.escalationReason && (
                    <div className="mt-1 text-sm text-gray-600">
                      Reason: {ticket.escalationReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response Form */}
        <div className="mt-6 border-t pt-4">
          <form onSubmit={handleSubmitResponse}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Response
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Type your response..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Internal note</span>
              </label>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Send Response
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export { TicketDetailModal };