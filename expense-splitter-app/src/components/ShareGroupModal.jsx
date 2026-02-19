import React, { useState } from 'react';
import { X, Copy, Share2, Link as LinkIcon, Check } from 'lucide-react';

const ShareGroupModal = ({ isOpen, onClose, groupData }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // New format: /join/:groupId
    const shareUrl = `${window.location.origin}/join/${groupData.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Share2 size={20} className="text-indigo-600" />
                        Share "{groupData.name}"
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-lg transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-3 text-indigo-600">
                            <Share2 size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Invite Friends</h3>
                        <p className="text-sm text-gray-500">
                            Share this link to let others join this group instantly.
                        </p>
                    </div>

                    {/* Share Link */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Group Invite Link
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <LinkIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Group Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-gray-500 block text-xs">Participants</span>
                                <span className="font-medium text-gray-900 text-lg">{groupData.participants?.length || 0}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-gray-500 block text-xs">Total Expenses</span>
                                <span className="font-medium text-gray-900 text-lg">
                                    ${groupData.expenses?.filter(e => !e.isSettlement).reduce((sum, e) => sum + e.amount, 0).toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
                        <div className="shrink-0 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            New members will need to sign in or create an account to join securely.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareGroupModal;
