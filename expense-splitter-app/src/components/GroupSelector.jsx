import React, { useState } from 'react';
import { Users, Plus, X, Check, Edit2, Trash2, Share2, Lock, Unlock } from 'lucide-react';
import { getUnlockedGroups } from '../utils/crypto';

const GroupSelector = ({ groups, currentGroup, onSelectGroup, onCreateGroup, onEditGroup, onDeleteGroup, onShareGroup, onSetPin }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupPin, setNewGroupPin] = useState('');
    const [editGroupName, setEditGroupName] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const handleCreate = () => {
        if (newGroupName.trim()) {
            onCreateGroup(newGroupName.trim(), newGroupPin);
            setNewGroupName('');
            setNewGroupPin('');
            setIsCreating(false);
        }
    };

    const handleEdit = () => {
        if (editGroupName.trim()) {
            onEditGroup(currentGroup, editGroupName.trim());
            setEditGroupName('');
            setIsEditing(false);
            setShowMenu(false);
        }
    };

    const handleDelete = () => {
        if (groups.length <= 1) {
            alert('Cannot delete the last group!');
            return;
        }
        if (confirm('Are you sure you want to delete this group? All expenses and participants will be lost.')) {
            onDeleteGroup(currentGroup);
            setShowMenu(false);
        }
    };

    const handleShare = () => {
        onShareGroup(currentGroup);
        setShowMenu(false);
    };

    const currentGroupObj = groups.find(g => g.id === currentGroup);

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                <select
                    value={currentGroup}
                    onChange={(e) => onSelectGroup(e.target.value)}
                    className="p-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                    {groups.map(group => {
                        const unlockedGroups = getUnlockedGroups();
                        const isUnlocked = unlockedGroups.includes(group.id);
                        const isPinProtected = group.pinEnabled;
                        const lockIcon = isPinProtected ? (isUnlocked ? '🔓 ' : '🔒 ') : '';

                        return (
                            <option key={group.id} value={group.id}>
                                {lockIcon}{group.name}
                            </option>
                        );
                    })}
                </select>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Create new group"
                >
                    <Plus size={16} />
                </button>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Group options"
                >
                    <Edit2 size={16} />
                </button>
            </div>

            {/* Group Menu */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48">
                        <button
                            onClick={() => {
                                setEditGroupName(currentGroupObj?.name || '');
                                setIsEditing(true);
                                setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Edit2 size={14} />
                            Rename Group
                        </button>
                        <button
                            onClick={handleShare}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Share2 size={14} />
                            Share Group
                        </button>
                        <button
                            onClick={() => {
                                onSetPin?.(currentGroup);
                                setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Lock size={14} />
                            Set/Change PIN
                        </button>
                        <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Delete Group
                        </button>
                    </div>
                </>
            )}

            {/* Create Group Modal */}
            {isCreating && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => {
                        setIsCreating(false);
                        setNewGroupName('');
                        setNewGroupPin('');
                    }} />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20 w-80">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Create New Group</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Group Name *</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g., Beach Trip 2024"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    autoFocus
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    <Lock size={12} className="inline mr-1" />
                                    PIN (optional, 4 digits)
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={newGroupPin}
                                    onChange={(e) => setNewGroupPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank for no PIN protection</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleCreate}
                                className="flex-1 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewGroupName('');
                                    setNewGroupPin('');
                                }}
                                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Edit Group Modal */}
            {isEditing && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => {
                        setIsEditing(false);
                        setEditGroupName('');
                    }} />
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 w-64">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                placeholder="Group name..."
                                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
                            />
                            <button
                                onClick={handleEdit}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditGroupName('');
                                }}
                                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default GroupSelector;
