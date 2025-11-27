import React, { useState } from 'react';
import { X, Copy, Download, Share2 } from 'lucide-react';

const ShareGroupModal = ({ isOpen, onClose, groupData }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const shareUrl = `${window.location.origin}?import=${encodeURIComponent(btoa(JSON.stringify(groupData)))}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadJSON = () => {
        const dataStr = JSON.stringify(groupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${groupData.name.replace(/\s+/g, '_')}_export.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyJSON = () => {
        const dataStr = JSON.stringify(groupData, null, 2);
        navigator.clipboard.writeText(dataStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Share2 size={20} />
                        Share "{groupData.name}"
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Share Link */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Share Link</h3>
                        <p className="text-xs text-gray-500 mb-2">Anyone with this link can import this group</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                <Copy size={16} />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Download JSON */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Export as File</h3>
                        <p className="text-xs text-gray-500 mb-2">Download group data as JSON file</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownloadJSON}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                Download JSON
                            </button>
                            <button
                                onClick={handleCopyJSON}
                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                Copy JSON
                            </button>
                        </div>
                    </div>

                    {/* Group Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Group Summary</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Participants:</span>
                                <span className="font-medium">{groupData.participants?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Expenses:</span>
                                <span className="font-medium">{groupData.expenses?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span className="font-medium">
                                    ${groupData.expenses?.filter(e => !e.isSettlement).reduce((sum, e) => sum + e.amount, 0).toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            <strong>How to share:</strong> Send the link or JSON file to your friends. They can import it by clicking the link or using the "Import Group" feature.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareGroupModal;
