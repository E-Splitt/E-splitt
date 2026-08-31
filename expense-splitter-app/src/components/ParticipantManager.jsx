import React, { useState, useEffect } from 'react';
import { UserPlus, X, Trash2, Mail, Crown, Shield, User, Users, AlertCircle, Edit2, Check } from 'lucide-react';
import { searchUsersByEmail } from '../services/memberService';

const ParticipantManager = ({
    participants,
    members = [],
    currentUserRole = 'member',
    currentUserEmail,
    onAdd,
    onEdit,
    onRemove,
    onInviteMember,
    onRemoveMember,
    onUpdateRole
}) => {
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [activeTab, setActiveTab] = useState('participants');
    const [emailCheckResult, setEmailCheckResult] = useState(null);
    const [foundUser, setFoundUser] = useState(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [editingDetails, setEditingDetails] = useState(null);

    const startEditing = (person) => {
        setEditingDetails({
            id: person.id,
            name: person.name,
            email: person.email || ''
        });
    };

    const handleUpdateParticipant = async (id) => {
        if (!editingDetails.name.trim()) return;

        if (onEdit) {
            await onEdit(id, {
                name: editingDetails.name.trim(),
                email: editingDetails.email.trim() || null
            });
        }
        setEditingDetails(null);
    };

    useEffect(() => {
        const checkEmail = async () => {
            if (!newEmail.trim() || !newEmail.includes('@')) {
                setEmailCheckResult(null);
                return;
            }

            setIsCheckingEmail(true);
            try {
                const results = await searchUsersByEmail(newEmail);
                if (results.length > 0) {
                    setEmailCheckResult('registered');
                    setFoundUser(results[0]);
                    if (!newName && results[0].name && results[0].name !== 'Unknown') {
                        setNewName(results[0].name);
                    }
                } else {
                    setEmailCheckResult('not_found');
                    setFoundUser(null);
                }
            } catch (error) {
                console.error('Error checking email:', error);
                setEmailCheckResult(null);
            } finally {
                setIsCheckingEmail(false);
            }
        };

        const debounce = setTimeout(checkEmail, 500);
        return () => clearTimeout(debounce);
    }, [newEmail]);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const email = newEmail.trim().toLowerCase();

        if (email && currentUserEmail && email === currentUserEmail.toLowerCase()) {
            alert("You are already in the group!");
            return;
        }

        if (email && participants.some(p => p.email?.toLowerCase() === email)) {
            alert("This person is already in the group!");
            return;
        }

        if (participants.some(p => p.name.toLowerCase() === newName.trim().toLowerCase())) {
            if (!confirm(`"${newName}" is already in the group. Add another person with the same name?`)) {
                return;
            }
        }

        const newParticipant = {
            id: `user_${Date.now()}`,
            name: newName.trim(),
            email: email || null,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };

        onAdd(newParticipant);
        setNewName('');
        setNewEmail('');
        setEmailCheckResult(null);
        setIsAdding(false);
    };

    const handleInviteInstead = () => {
        setIsAdding(false);
        if (onInviteMember) {
            onInviteMember();
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner':
                return <Crown size={14} className="text-yellow-600" />;
            case 'admin':
                return <Shield size={14} className="text-blue-600" />;
            default:
                return <User size={14} style={{ color: 'var(--text-muted)' }} />;
        }
    };

    const getRoleBadge = (role) => {
        const badges = {
            owner: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            admin: 'bg-blue-100 text-blue-800 border-blue-200',
            member: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return badges[role] || badges.member;
    };

    const canManageMembers = ['owner', 'admin'].includes(currentUserRole);

    return (
        <div className="themed-card rounded-xl p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="px-4 py-2 font-medium text-sm" style={{ borderBottom: '2px solid var(--accent-indigo)', color: 'var(--accent-indigo)' }}>
                    <div className="flex items-center gap-2">
                        <Users size={16} />
                        Participants ({participants.length})
                    </div>
                </div>
            </div>

            {/* Participants Tab */}
            {activeTab === 'participants' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expense Participants</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                People to track in expenses (not authenticated)
                            </p>
                        </div>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent-indigo)' }}
                        >
                            <UserPlus size={16} />
                            Add Person
                        </button>
                    </div>

                    {isAdding && (
                        <form onSubmit={handleAdd} className="mb-4 space-y-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter name..."
                                    className="themed-input w-full p-2 rounded-lg text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="themed-input w-full p-2 rounded-lg text-sm"
                                />

                                {/* Email Check Result */}
                                {isCheckingEmail && (
                                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                        <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-indigo)', borderTopColor: 'transparent' }}></span>
                                        Checking email...
                                    </p>
                                )}

                                {emailCheckResult === 'registered' && !isCheckingEmail && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <p className="text-green-800 font-medium">
                                                    User found: {foundUser?.name}
                                                </p>
                                                <p className="text-green-700 mt-1">
                                                    This email is registered. Click "Add" to add them to the group.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {emailCheckResult === 'not_found' && !isCheckingEmail && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        💡 If they sign up with this email, they can claim their expense history
                                    </p>
                                )}

                                {!newEmail && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        💡 If they sign up with this email, they can claim their expense history
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add as Participant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAdding(false);
                                        setNewName('');
                                        setNewEmail('');
                                        setEmailCheckResult(null);
                                    }}
                                    className="px-4 py-2 rounded-lg transition-colors text-sm"
                                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-2">
                        {participants.map(person => (
                            <div key={person.id} className="person-row">
                                {activeTab === 'participants' && editingDetails?.id === person.id ? (
                                    // Edit Mode
                                    <div className="flex-1 flex gap-2 items-center w-full">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={editingDetails.name}
                                                onChange={(e) => setEditingDetails({ ...editingDetails, name: e.target.value })}
                                                className="themed-input w-full p-2 rounded text-sm"
                                                placeholder="Name"
                                                autoFocus
                                            />
                                            <input
                                                type="email"
                                                value={editingDetails.email}
                                                onChange={(e) => setEditingDetails({ ...editingDetails, email: e.target.value })}
                                                className="themed-input w-full p-2 rounded text-sm"
                                                placeholder="Email (optional)"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => handleUpdateParticipant(person.id)}
                                                className="icon-btn"
                                                title="Save"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingDetails(null)}
                                                className="icon-btn"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className="ledger-avatar"
                                                style={{ backgroundColor: person.color || '#6366f1', color: '#fff' }}
                                            >
                                                {person.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="person-info">
                                                <div className="flex items-center gap-2">
                                                    <span className="person-name">{person.name}</span>
                                                    {person.email && <Mail size={12} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" title={person.email} />}
                                                    {person.claimed_by && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex-shrink-0">
                                                            Claimed
                                                        </span>
                                                    )}
                                                </div>
                                                {person.email && (
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{person.email}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="person-actions">
                                            {onEdit && (
                                                <button
                                                    onClick={() => startEditing(person)}
                                                    className="icon-btn"
                                                    title="Edit participant"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onRemove(person.id)}
                                                className="icon-btn danger"
                                                title="Remove participant"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {participants.length === 0 && (
                        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No participants yet. Add someone to get started!
                        </div>
                    )}
                </>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Authenticated Members</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                Users with accounts who can access this group
                            </p>
                        </div>
                        {canManageMembers && onInviteMember && (
                            <button
                                onClick={onInviteMember}
                                className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
                                style={{ color: 'var(--accent-indigo)' }}
                            >
                                <UserPlus size={16} />
                                Invite Member
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                                        {member.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.name || 'Unknown'}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0 ${getRoleBadge(member.role)}`}>
                                                {getRoleIcon(member.role)}
                                                {member.role}
                                            </span>
                                        </div>
                                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    {canManageMembers && member.role !== 'owner' && onUpdateRole && (
                                        <select
                                            value={member.role}
                                            onChange={(e) => onUpdateRole(member.userId, e.target.value)}
                                            className="themed-select text-xs px-2 py-1 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    )}
                                    {canManageMembers && member.role !== 'owner' && onRemoveMember && (
                                        <button
                                            onClick={() => onRemoveMember(member.userId)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Remove member"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {members.length === 0 && (
                        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                            {canManageMembers
                                ? 'No members yet. Invite someone to collaborate!'
                                : 'No other members in this group.'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ParticipantManager;
