import React, { useState } from 'react';
import { Clock, Plus, Edit2, Trash2, UserPlus, UserMinus, DollarSign, RotateCcw, Search, X } from 'lucide-react';

const ActivityLog = ({ activities, onUndo }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const getActivityIcon = (activity) => {
        if (activity.targetType === 'settlement') {
            return <DollarSign size={16} />;
        }
        switch (activity.action) {
            case 'added': return <Plus size={16} />;
            case 'edited': return <Edit2 size={16} />;
            case 'deleted': return <Trash2 size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getActivityColor = (activity) => {
        if (activity.targetType === 'settlement') {
            return 'bg-purple-100 text-purple-600';
        }
        switch (activity.action) {
            case 'added': return 'bg-green-100 text-green-600';
            case 'edited': return 'bg-blue-100 text-blue-600';
            case 'deleted': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Only show undo for last 10 activities (settlements can't be undone)
    const canUndo = (index, activity) => {
        return index < 10 &&
            activity.details?.previousState &&
            activity.targetType !== 'settlement';
    };

    // Filter activities based on search query
    const filteredActivities = activities.filter(activity => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            activity.description?.toLowerCase().includes(query) ||
            activity.actorName?.toLowerCase().includes(query) ||
            activity.action?.toLowerCase().includes(query) ||
            activity.targetType?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="themed-card rounded-xl">
            <div className="p-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock size={20} />
                    Activity Log
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Track all changes to this group
                </p>

                {/* Search Input */}
                <div className="mt-4 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search activities..."
                        className="themed-input w-full pl-10 pr-10 py-2 rounded-lg text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="mx-auto mb-2" size={48} style={{ color: 'var(--text-muted)' }} />
                        <p className="font-medium">{searchQuery ? 'No matching activities' : 'No activity yet'}</p>
                        <p className="text-sm">{searchQuery ? 'Try a different search term' : 'Changes will appear here'}</p>
                    </div>
                ) : (
                    <div className="activity-feed">
                        {filteredActivities.map((activity, index) => {
                            const colorClass = getActivityColor(activity);

                            return (
                                <div key={activity.id} className="activity-item">
                                    <div className={`activity-icon ${colorClass}`}>
                                        {getActivityIcon(activity)}
                                    </div>
                                    <div className="activity-content">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {activity.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span>{activity.actorName}</span>
                                            <span>•</span>
                                            <span>{formatTimestamp(activity.timestamp)}</span>
                                        </div>
                                    </div>
                                    {canUndo(index, activity) && (
                                        <button
                                            onClick={() => onUndo(activity)}
                                            className="icon-btn"
                                            title="Undo this action"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
