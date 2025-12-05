import React, { useState, useEffect } from 'react';
import { User, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const UserProfile = ({ onClose }) => {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tempName, setTempName] = useState('');

    useEffect(() => {
        // Load display name from user metadata
        const name = user?.user_metadata?.display_name || user?.user_metadata?.name || '';
        setDisplayName(name);
        setTempName(name);
    }, [user]);

    const handleSave = async () => {
        if (!tempName.trim()) {
            alert('Please enter a name');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    display_name: tempName.trim()
                }
            });

            if (error) throw error;

            setDisplayName(tempName.trim());
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setTempName(displayName);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">User Profile</h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Email (read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                        {user?.email}
                    </div>
                </div>

                {/* Display Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                    </label>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                placeholder="Enter your display name..."
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                autoFocus
                            />
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                <Check size={20} />
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-indigo-700 font-bold text-lg">
                                        {displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">
                                        {displayName || 'Not set'}
                                    </p>
                                    {!displayName && (
                                        <p className="text-xs text-gray-500">
                                            Set a display name for activity logs and chat
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <Edit2 size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Why set a display name?</strong>
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                        <li>Appears in activity logs instead of your email</li>
                        <li>Shows in chat messages to other members</li>
                        <li>Makes collaboration more personal and friendly</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
