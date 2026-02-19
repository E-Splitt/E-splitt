import React, { useState } from 'react';
import { X, Search, UserPlus, Mail, Loader, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { searchUsersByEmail } from '../services/memberService';

const InviteMemberModal = ({ isOpen, onClose, onInvite, groupName, groupId }) => {
    const [email, setEmail] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [role, setRole] = useState('member');
    const [isSearching, setIsSearching] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Generate join link
    const joinLink = `${window.location.origin}/join/${groupId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(joinLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleSearch = async () => {
        if (!email.trim()) return;

        setIsSearching(true);
        setError('');
        try {
            const results = await searchUsersByEmail(email);
            setSearchResults(results);
            if (results.length === 0) {
                setError('No users found with that email');
            }
        } catch (err) {
            setError('Error searching for users');
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInvite = async () => {
        if (!selectedUser) return;

        setIsInviting(true);
        setError('');
        try {
            await onInvite(selectedUser.email, role);
            onClose();
            resetForm();
        } catch (err) {
            setError(err.message || 'Failed to invite member');
        } finally {
            setIsInviting(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setSearchResults([]);
        setSelectedUser(null);
        setRole('member');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
                        <p className="text-sm text-gray-500 mt-1">to {groupName}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* OPTION 1: Share Link */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                                <LinkIcon size={16} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900">Invite via Link</h3>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={joinLink}
                                readOnly
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 focus:outline-none"
                            />
                            <button
                                onClick={handleCopyLink}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${linkCopied
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                                {linkCopied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Share this link. Friends can join securely by signing in.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-2 bg-white text-sm text-gray-400">OR</span>
                        </div>
                    </div>

                    {/* OPTION 2: Email Search */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                                <Mail size={16} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900">Invite via Email</h3>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <div className="relative flex-1">
                                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="user@example.com"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !email.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isSearching ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : (
                                    <Search size={18} />
                                )}
                                Search
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-2">
                                {error}
                            </div>
                        )}

                        {/* Search Results */}
                        {searchResults.length > 0 && !selectedUser && (
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-1">
                                {searchResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="w-full p-2 hover:bg-indigo-50 rounded-md transition-colors text-left flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                                            {user.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected User */}
                        {selectedUser && (
                            <div className="space-y-4 pt-2">
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                                        {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                                        <p className="text-sm text-gray-600 truncate">{selectedUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="member">👤 Member</option>
                                        <option value="admin">🛡️ Admin</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={!selectedUser || isInviting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        {isInviting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Inviting...
                            </>
                        ) : (
                            <>
                                <UserPlus size={16} />
                                Confirm Invite
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
