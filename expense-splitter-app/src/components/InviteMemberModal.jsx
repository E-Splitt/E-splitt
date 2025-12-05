import React, { useState } from 'react';
import { X, Search, UserPlus, Mail, Loader } from 'lucide-react';
import { searchUsersByEmail } from '../services/memberService';

const InviteMemberModal = ({ isOpen, onClose, onInvite, groupName }) => {
    const [email, setEmail] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [role, setRole] = useState('member');
    const [isSearching, setIsSearching] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState('');

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
                <div className="p-6 space-y-6">
                    {/* Email Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search by Email
                        </label>
                        <div className="flex gap-2">
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
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                                Found {searchResults.length} user{searchResults.length > 1 ? 's' : ''}
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {searchResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="w-full p-3 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <span className="text-indigo-600 font-medium">
                                                    {user.name?.charAt(0).toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected User */}
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center">
                                        <span className="text-indigo-700 font-bold text-lg">
                                            {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                                        <p className="text-sm text-gray-600 truncate">{selectedUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-1 hover:bg-indigo-100 rounded transition-colors"
                                    >
                                        <X size={16} className="text-indigo-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="member">👤 Member - Can view and manage expenses</option>
                                    <option value="admin">🛡️ Admin - Can manage members and expenses</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {role === 'admin'
                                        ? 'Admins can invite/remove members, promote users, and manage all expenses'
                                        : 'Members can add, edit, and delete expenses but cannot manage members'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={!selectedUser || isInviting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {isInviting ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Inviting...
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Invite Member
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
