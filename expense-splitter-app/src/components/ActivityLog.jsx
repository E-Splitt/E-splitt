import React from 'react';
import { Clock, Plus, Edit2, Trash2, UserPlus, UserMinus, DollarSign, RotateCcw } from 'lucide-react';

const ActivityLog = ({ activities, onUndo }) => {
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Clock size={20} />
                    Activity Log
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Track all changes to this group
                </p>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Clock className="mx-auto mb-2 text-gray-400" size={48} />
                        <p className="font-medium">No activity yet</p>
                        <p className="text-sm">Changes will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {activities.map((activity, index) => {
                            const colorClass = getActivityColor(activity);

                            return (
                                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${colorClass}`}>
                                            {getActivityIcon(activity)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">
                                                {activity.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                <span>{activity.actorName}</span>
                                                <span>•</span>
                                                <span>{formatTimestamp(activity.timestamp)}</span>
                                            </div>
                                        </div>
                                        {canUndo(index, activity) && (
                                            <button
                                                onClick={() => onUndo(activity)}
                                                className="text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-sm"
                                                title="Undo this action"
                                            >
                                                <RotateCcw size={14} />
                                                Undo
                                            </button>
                                        )}
                                    </div>
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
