import React, { useState, useEffect } from 'react';
import { 
  SupportTicket, 
  SupportStats, 
  TicketFilters,
  PlatformAnnouncement,
  AnnouncementStats 
} from '../../types/admin';
import { adminApi } from '../../services/adminApi';
import MetricCard from '../../components/admin/MetricCard';
import { TicketTable } from '../../components/admin/support/TicketTable';
import { TicketDetailModal } from '../../components/admin/support/TicketDetailModal';
import { AnnouncementPanel } from '../../components/admin/support/AnnouncementPanel';
import { SupportFilters } from '../../components/admin/support/SupportFilters';

const SupportDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [supportStats, setSupportStats] = useState<SupportStats | null>(null);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [announcementStats, setAnnouncementStats] = useState<AnnouncementStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'announcements'>('tickets');

  useEffect(() => {
    loadSupportData();
  }, [filters]);

  const loadSupportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ticketsResponse, statsResponse, announcementsResponse, announcementStatsResponse] = await Promise.all([
        adminApi.get<{ tickets: SupportTicket[]; total: number }>('/support/tickets', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        adminApi.get<SupportStats>('/support/stats'),
        adminApi.get<{ announcements: PlatformAnnouncement[]; total: number }>('/support/announcements'),
        adminApi.get<AnnouncementStats>('/support/announcements/stats')
      ]);

      setTickets(ticketsResponse.data.tickets);
      setSupportStats(statsResponse.data);
      setAnnouncements(announcementsResponse.data.announcements);
      setAnnouncementStats(announcementStatsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdate = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      await adminApi.post(`/support/tickets/${ticketId}`, updates);
      await loadSupportData();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updates });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  };

  const handleTicketAssign = async (ticketId: string, assignedTo: string) => {
    try {
      await adminApi.post(`/support/tickets/${ticketId}/assign`, { assignedTo });
      await loadSupportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  };

  const handleTicketResponse = async (ticketId: string, message: string, isInternal: boolean = false) => {
    try {
      await adminApi.post(`/support/tickets/${ticketId}/responses`, { message, isInternal });
      await loadSupportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send response');
    }
  };

  const handleAnnouncementCreate = async (announcement: Partial<PlatformAnnouncement>) => {
    try {
      await adminApi.post('/support/announcements', announcement);
      await loadSupportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
    }
  };

  const handleAnnouncementUpdate = async (announcementId: string, updates: Partial<PlatformAnnouncement>) => {
    try {
      await adminApi.post(`/support/announcements/${announcementId}`, updates);
      await loadSupportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadSupportData}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Announcements
          </button>
        </div>
      </div>

      {/* Support Stats */}
      {supportStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            data={{
              title: "Open Tickets",
              value: supportStats.openTickets,
              icon: "ticket",
              color: "blue",
              trend: supportStats.openTickets > supportStats.resolvedToday ? 'up' : 'down',
              change: 0
            }}
          />
          <MetricCard
            data={{
              title: "Avg Response Time",
              value: `${Math.round(supportStats.averageResponseTime / 60)}h`,
              icon: "clock",
              color: "green",
              trend: 'stable',
              change: 0
            }}
          />
          <MetricCard
            data={{
              title: "Resolved Today",
              value: supportStats.resolvedToday,
              icon: "check",
              color: "green",
              trend: 'up',
              change: 0
            }}
          />
          <MetricCard
            data={{
              title: "Satisfaction Score",
              value: `${Math.round(supportStats.satisfactionScore * 100)}%`,
              icon: "star",
              color: "yellow",
              trend: 'stable',
              change: 0
            }}
          />
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <SupportFilters
            filters={filters}
            onFiltersChange={setFilters}
            stats={supportStats}
          />
          
          <TicketTable
            tickets={tickets}
            onTicketSelect={handleTicketSelect}
            onTicketAssign={handleTicketAssign}
            onTicketUpdate={handleTicketUpdate}
          />
        </div>
      )}

      {activeTab === 'announcements' && (
        <AnnouncementPanel
          announcements={announcements}
          stats={announcementStats}
          onAnnouncementCreate={handleAnnouncementCreate}
          onAnnouncementUpdate={handleAnnouncementUpdate}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
          onResponse={handleTicketResponse}
          onAssign={handleTicketAssign}
        />
      )}
    </div>
  );
};

export default SupportDashboard;