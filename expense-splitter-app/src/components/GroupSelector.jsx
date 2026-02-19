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
    const [showGroupList, setShowGroupList] = useState(false); // New state for custom dropdown

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
                <Users size={20} style={{ color: 'var(--text-muted)' }} />

                {/* Custom Dropdown Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setShowGroupList(!showGroupList)}
                        className="flex items-center justify-between gap-2 p-3 rounded-lg text-base font-medium min-w-[200px] max-w-[300px] transition-colors text-left themed-input"
                    >
                        <span className="truncate">
                            {currentGroupObj ? (
                                <>
                                    {currentGroupObj.pinEnabled && (
                                        <span className="mr-1">{getUnlockedGroups().includes(currentGroupObj.id) ? '🔓' : '🔒'}</span>
                                    )}
                                    {currentGroupObj.name}
                                </>
                            ) : 'Select Group'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs">▼</span>
                    </button>

                    {/* Custom Dropdown List */}
                    {showGroupList && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowGroupList(false)} />
                            <div className="absolute top-full left-0 mt-1 w-full rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto themed-card">
                                {groups.map(group => {
                                    const unlockedGroups = getUnlockedGroups();
                                    const isUnlocked = unlockedGroups.includes(group.id);
                                    const isPinProtected = group.pinEnabled;
                                    const lockIcon = isPinProtected ? (isUnlocked ? '🔓 ' : '🔒 ') : '';
                                    const isSelected = group.id === currentGroup;

                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => {
                                                onSelectGroup(group.id);
                                                setShowGroupList(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${isSelected ? 'font-medium' : ''}`}
                                            style={{ color: isSelected ? 'var(--accent-indigo)' : 'var(--text-primary)', backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'transparent' }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-card-hover)'}
                                            onMouseLeave={(e) => { if (!isSelected) e.target.style.backgroundColor = 'transparent'; }}
                                        >
                                            <span>{lockIcon}</span>
                                            <span className="truncate">{group.name}</span>
                                            {isSelected && <Check size={14} className="ml-auto" />}
                                        </button>
                                    );
                                })}
                                {groups.length === 0 && (
                                    <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                                        No groups found
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={() => setIsCreating(true)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Create new group"
                >
                    <Plus size={20} />
                </button>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:opacity-75 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Group options"
                >
                    <Edit2 size={20} />
                </button>
            </div>

            {/* Group Menu */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 rounded-lg shadow-lg z-20 w-48 themed-card">
                        <button
                            onClick={() => {
                                setEditGroupName(currentGroupObj?.name || '');
                                setIsEditing(true);
                                setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <Edit2 size={14} />
                            Rename Group
                        </button>
                        <button
                            onClick={handleShare}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <Share2 size={14} />
                            Share Group
                        </button>
                        <button
                            onClick={() => {
                                onSetPin?.(currentGroup);
                                setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'var(--text-primary)' }}
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
                    <div className="absolute top-full left-0 mt-2 rounded-lg shadow-lg p-4 z-20 w-80 themed-card">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Create New Group</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Group Name *</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g., Beach Trip 2024"
                                    className="themed-input w-full p-2 rounded-lg text-sm"
                                    autoFocus
                                    autoComplete="off"
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
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
                                    autoComplete="new-password"
                                    className="themed-input w-full p-2 rounded-lg text-sm text-center tracking-widest"
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Leave blank for no PIN protection</p>
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
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
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
                    <div className="absolute top-full left-0 mt-2 rounded-lg shadow-lg p-3 z-20 w-64 themed-card">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                placeholder="Group name..."
                                className="themed-input flex-1 p-2 rounded-lg text-sm"
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
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
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
