import React, { useState } from 'react';
import { X, Copy, Share2, Link as LinkIcon, Check } from 'lucide-react';

const ShareGroupModal = ({ isOpen, onClose, groupData }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !groupData) return null;

    // New format: /join/:groupId
    const targetGroupId = groupData.id || groupData.code || '';
    const shareUrl = `${window.location.origin}/join/${targetGroupId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-xl shadow-xl w-full max-w-lg themed-card" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center glass-strong" style={{ borderBottom: '1px solid var(--border-primary)', borderRadius: '12px 12px 0 0' }}>
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Share2 size={20} style={{ color: 'var(--accent-indigo)' }} />
                        Share "{groupData.name}"
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg transition-all hover:opacity-75" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--accent-indigo)' }}>
                            <Share2 size={32} />
                        </div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Invite Friends</h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Share this link to let others join this group instantly.
                        </p>
                    </div>

                    {/* Share Link */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                            Group Invite Link
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <LinkIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="themed-input w-full pl-10 pr-3 py-3 rounded-lg text-sm transition-all"
                                />
                            </div>
                            <button
                                onClick={handleCopyLink}
                                className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm ${copied
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                                    }`}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Group Summary */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Group Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Participants</span>
                                <span className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>{groupData.participants?.length || 0}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Total Expenses</span>
                                <span className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>
                                    ${groupData.expenses?.filter(e => !e.isSettlement).reduce((sum, e) => sum + e.amount, 0).toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
                        <div className="shrink-0 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <p className="text-xs text-blue-500 leading-relaxed">
                            New members will need to sign in or create an account to join securely.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareGroupModal;
