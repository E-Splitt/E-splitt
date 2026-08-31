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
    const joinLink = `${window.location.origin}/join/${groupId || ''}`;

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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 modal-overlay" onClick={handleClose}>
            <div className="rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto themed-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 glass-strong" style={{ borderBottom: '1px solid var(--border-primary)', borderRadius: '12px 12px 0 0' }}>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invite Member</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>to {groupName}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg transition-colors hover:opacity-75"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* OPTION 1: Share Link */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--accent-indigo)' }}>
                                <LinkIcon size={16} />
                            </div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Invite via Link</h3>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={joinLink}
                                readOnly
                                className="themed-input flex-1 px-3 py-2 rounded-lg text-sm"
                            />
                            <button
                                onClick={handleCopyLink}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${linkCopied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                                {linkCopied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            Share this link. Friends can join securely by signing in.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full" style={{ borderTop: '1px solid var(--border-primary)' }}></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-2 text-sm" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>OR</span>
                        </div>
                    </div>

                    {/* OPTION 2: Email Search */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--accent-indigo)' }}>
                                <Mail size={16} />
                            </div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Invite via Email</h3>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <div className="relative flex-1">
                                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="user@example.com"
                                    className="themed-input w-full pl-10 pr-4 py-2 rounded-lg"
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
                            <div className="p-3 rounded-lg text-sm mb-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
                                {error}
                            </div>
                        )}

                        {/* Search Results */}
                        {searchResults.length > 0 && !selectedUser && (
                            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg p-1" style={{ border: '1px solid var(--border-primary)' }}>
                                {searchResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="w-full p-2 rounded-md transition-colors text-left flex items-center gap-3"
                                        style={{ backgroundColor: 'var(--bg-card-hover)' }}
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--accent-indigo)' }}>
                                            {user.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected User */}
                        {selectedUser && (
                            <div className="space-y-4 pt-2">
                                <div className="p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: 'var(--accent-indigo)' }}>
                                        {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</p>
                                        <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-1 rounded hover:opacity-75"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        Role
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="themed-select w-full px-3 py-2 rounded-lg text-sm"
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
                <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-card-hover)', borderRadius: '0 0 12px 12px' }}>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
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
