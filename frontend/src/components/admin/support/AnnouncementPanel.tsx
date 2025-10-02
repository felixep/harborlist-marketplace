import React, { useState } from 'react';
import { PlatformAnnouncement, AnnouncementStats } from '@harborlist/shared-types';

interface AnnouncementPanelProps {
  announcements: PlatformAnnouncement[];
  stats: AnnouncementStats | null;
  onAnnouncementCreate: (announcement: Partial<PlatformAnnouncement>) => void;
  onAnnouncementUpdate: (announcementId: string, updates: Partial<PlatformAnnouncement>) => void;
}

const AnnouncementPanel: React.FC<AnnouncementPanelProps> = ({
  announcements,
  stats,
  onAnnouncementCreate,
  onAnnouncementUpdate
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as const,
    targetAudience: 'all' as const,
    priority: 'medium' as const,
    scheduledAt: '',
    expiresAt: '',
    channels: {
      email: true,
      in_app: true,
      push: false,
      sms: false
    }
  });

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const announcementData = {
      ...formData,
      channels: Object.entries(formData.channels)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => ({ type: type as 'push' | 'email' | 'sms' | 'in_app', enabled: true })),
      status: formData.scheduledAt ? 'scheduled' as const : 'published' as const
    };

    await onAnnouncementCreate(announcementData);
    setShowCreateForm(false);
    resetForm();
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;

    const updates = {
      ...formData,
      channels: Object.entries(formData.channels)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => ({ type: type as 'push' | 'email' | 'sms' | 'in_app', enabled: true }))
    };

    await onAnnouncementUpdate(editingAnnouncement.id, updates);
    setEditingAnnouncement(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      targetAudience: 'all',
      priority: 'medium',
      scheduledAt: '',
      expiresAt: '',
      channels: {
        email: true,
        in_app: true,
        push: false,
        sms: false
      }
    });
  };

  const startEdit = (announcement: PlatformAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: 'info' as const,
      targetAudience: 'all' as const,
      priority: 'medium' as const,
      scheduledAt: announcement.scheduledAt || '',
      expiresAt: announcement.expiresAt || '',
      channels: {
        email: announcement.channels.some(c => c.type === 'email' && c.enabled),
        in_app: announcement.channels.some(c => c.type === 'in_app' && c.enabled),
        push: announcement.channels.some(c => c.type === 'push' && c.enabled),
        sms: announcement.channels.some(c => c.type === 'sms' && c.enabled)
      }
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'feature': return 'bg-green-100 text-green-800';
      case 'promotion': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-red-100 text-red-800';
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
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalAnnouncements}</div>
            <div className="text-sm text-gray-600">Total Announcements</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{stats.activeAnnouncements}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-yellow-600">{stats.scheduledAnnouncements}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.averageClickRate * 100)}%</div>
            <div className="text-sm text-gray-600">Avg Click Rate</div>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Platform Announcements</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Announcement
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingAnnouncement) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
          </h3>
          
          <form onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="feature">Feature</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="sellers">Sellers</option>
                  <option value="buyers">Buyers</option>
                  <option value="premium">Premium Users</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule For
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Channels
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(formData.channels).map(([channel, enabled]) => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        channels: { ...formData.channels, [channel]: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {channel.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingAnnouncement ? 'Update' : 'Create'} Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <tr key={announcement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {announcement.title}
                    </div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {announcement.content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(announcement.type)}`}>
                      {announcement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(announcement.status)}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {announcement.targetAudience}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{announcement.impressionCount} views</div>
                    <div className="text-xs text-gray-500">
                      {announcement.clickCount} clicks
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(announcement.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => startEdit(announcement)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onAnnouncementUpdate(announcement.id, { 
                        status: announcement.status === 'published' ? 'archived' : 'published' 
                      })}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {announcement.status === 'published' ? 'Archive' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {announcements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No announcements found</div>
          </div>
        )}
      </div>
    </div>
  );
};

export { AnnouncementPanel };