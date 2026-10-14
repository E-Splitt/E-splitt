import React, { useState } from 'react';
import { Clock, Plus, Edit2, Trash2, DollarSign, RotateCcw, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    const getActivityStyle = (activity) => {
        if (activity.targetType === 'settlement') {
            return { backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' };
        }
        switch (activity.action) {
            case 'added': return { backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' };
            case 'edited': return { backgroundColor: 'var(--gold-soft)', color: 'var(--gold)' };
            case 'deleted': return { backgroundColor: 'var(--coral-soft)', color: 'var(--coral)' };
            default: return { backgroundColor: 'var(--teal-soft)', color: 'var(--muted)' };
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

    const canUndo = (index, activity) => {
        return index < 10 &&
            activity.details?.previousState &&
            activity.targetType !== 'settlement';
    };

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
        <div className="themed-card rounded-2xl overflow-hidden">
            <div className="p-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <h2 className="text-lg font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    <span className="p-2 rounded-xl" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                        <Clock size={18} />
                    </span>
                    Activity Log
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Real-time audit trail of group edits, additions, and settlements
                </p>

                <div className="mt-4 relative">
                    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search activities..."
                        className="themed-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75 bg-transparent border-none cursor-pointer"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto p-5 scroll-smooth">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="mx-auto mb-2 opacity-60" size={42} />
                        <p className="font-medium">{searchQuery ? 'No matching activities' : 'No activity yet'}</p>
                        <p className="text-sm">{searchQuery ? 'Try a different search term' : 'Changes will appear here'}</p>
                    </div>
                ) : (
                    <motion.div layout className="space-y-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {filteredActivities.map((activity, index) => (
                                <motion.div
                                    layout
                                    key={activity.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ type: 'spring', stiffness: 340, damping: 28, delay: Math.min(index * 0.03, 0.25) }}
                                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={getActivityStyle(activity)}
                                        >
                                            {getActivityIcon(activity)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                {activity.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                <span className="font-medium">{activity.actorName}</span>
                                                <span>•</span>
                                                <span>{formatTimestamp(activity.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {canUndo(index, activity) && (
                                        <motion.button
                                            whileHover={{ scale: 1.06 }}
                                            whileTap={{ scale: 0.94 }}
                                            onClick={() => onUndo(activity)}
                                            className="mini-btn flex items-center gap-1"
                                            title="Undo this action"
                                        >
                                            <RotateCcw size={13} /> Undo
                                        </motion.button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
