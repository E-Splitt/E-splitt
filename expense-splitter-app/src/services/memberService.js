import { supabase } from '../supabase';

// Table names
const GROUPS_TABLE = 'groups';
const GROUP_MEMBERS_TABLE = 'group_members';

// ============================================
// GROUP MEMBER MANAGEMENT
// ============================================

/**
 * Search for users by email
 * @param {string} email - Email to search for
 * @returns {Promise<Array>} - Array of users matching the email
 */
export const searchUsersByEmail = async (email) => {
    try {
        // Use secure RPC function to search users
        const { data, error } = await supabase
            .rpc('search_users_by_email', { search_email: email });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
};

/**
 * Add a member to a group
 * @param {string} groupId - Group ID
 * @param {string} userEmail - Email of user to add
 * @param {string} role - Role: 'owner', 'admin', or 'member'
 */
export const addGroupMember = async (groupId, userEmail, role = 'member') => {
    try {
        // First, find the user by email using secure RPC
        const { data: searchResults, error: searchError } = await supabase
            .rpc('search_users_by_email', { search_email: userEmail });

        if (searchError) throw searchError;

        // Find exact match
        const userData = searchResults?.find(u => u.email.toLowerCase() === userEmail.toLowerCase());

        if (!userData) {
            console.warn(`User not found for email: ${userEmail}`);
            return null; // Not a registered user, just return null
        }

        // Use secure RPC to add member (bypasses RLS)
        const { data, error } = await supabase
            .rpc('add_group_member', {
                p_group_id: groupId,
                p_user_id: userData.id,
                p_role: role
            });

        if (error) throw error;

        // Check if the function returned an error
        if (data && !data.success) {
            console.error('Error from add_group_member:', data.error);
            throw new Error(data.error);
        }

        console.log('Member added successfully:', data);
        return data;
    } catch (error) {
        console.error('Error adding group member:', error);
        throw error;
    }
};

/**
 * Remove a member from a group
 */
export const removeGroupMember = async (groupId, userId) => {
    try {
        const { error } = await supabase
            .from(GROUP_MEMBERS_TABLE)
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error removing group member:', error);
        throw error;
    }
};

/**
 * Update member role (promote/demote)
 */
export const updateMemberRole = async (groupId, userId, newRole) => {
    try {
        const { data, error } = await supabase
            .from(GROUP_MEMBERS_TABLE)
            .update({ role: newRole })
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating member role:', error);
        throw error;
    }
};

/**
 * Get all members of a group
 */
export const getGroupMembers = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from(GROUP_MEMBERS_TABLE)
            .select(`
                *,
                user:auth.users(id, email, raw_user_meta_data)
            `)
            .eq('group_id', groupId);

        if (error) throw error;

        return data.map(member => ({
            id: member.id,
            userId: member.user_id,
            role: member.role,
            joinedAt: member.joined_at,
            email: member.user?.email,
            name: member.user?.raw_user_meta_data?.name || 'Unknown'
        }));
    } catch (error) {
        console.error('Error getting group members:', error);
        return [];
    }
};

/**
 * Subscribe to group members changes (real-time)
 */
export const subscribeToGroupMembers = (groupId, callback) => {
    const channel = supabase
        .channel(`group_members:${groupId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: GROUP_MEMBERS_TABLE,
                filter: `group_id=eq.${groupId}`
            },
            async (payload) => {
                // Fetch fresh members data
                const members = await getGroupMembers(groupId);
                callback(members);
            }
        )
        .subscribe();

    // Initial fetch
    getGroupMembers(groupId).then(callback);

    return () => {
        supabase.removeChannel(channel);
    };
};

// ============================================
// PARTICIPANT EMAIL CLAIMING
// ============================================

/**
 * Find participants with matching email that can be claimed
 */
export const findClaimableParticipants = async (userEmail) => {
    try {
        const { data, error } = await supabase
            .from(GROUPS_TABLE)
            .select('group_id, data');

        if (error) throw error;

        const claimable = [];

        data.forEach(group => {
            const participants = group.data?.participants || [];
            participants.forEach(participant => {
                if (participant.email === userEmail && !participant.claimed_by) {
                    claimable.push({
                        groupId: group.group_id,
                        groupName: group.data?.name,
                        participantId: participant.id,
                        participantName: participant.name
                    });
                }
            });
        });

        return claimable;
    } catch (error) {
        console.error('Error finding claimable participants:', error);
        return [];
    }
};

/**
 * Claim a participant profile
 */
export const claimParticipant = async (groupId, participantId, userId) => {
    try {
        // Get current group data
        const { data: groupData, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data')
            .eq('group_id', groupId)
            .single();

        if (fetchError) throw fetchError;

        // Update participant with claimed_by
        const participants = groupData.data.participants.map(p => {
            if (p.id === participantId) {
                return {
                    ...p,
                    claimed_by: userId,
                    claimed_at: new Date().toISOString()
                };
            }
            return p;
        });

        // Save updated participants
        const { error: updateError } = await supabase
            .from(GROUPS_TABLE)
            .update({
                data: {
                    ...groupData.data,
                    participants
                }
            })
            .eq('group_id', groupId);

        if (updateError) throw updateError;

        // Also add user as a member to the group
        await addGroupMember(groupId, userId, 'member');

    } catch (error) {
        console.error('Error claiming participant:', error);
        throw error;
    }
};

/**
 * Add email to participant
 */
export const addParticipantEmail = async (groupId, participantId, email) => {
    try {
        const { data: groupData, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data')
            .eq('group_id', groupId)
            .single();

        if (fetchError) throw fetchError;

        const participants = groupData.data.participants.map(p => {
            if (p.id === participantId) {
                return { ...p, email };
            }
            return p;
        });

        const { error: updateError } = await supabase
            .from(GROUPS_TABLE)
            .update({
                data: {
                    ...groupData.data,
                    participants
                }
            })
            .eq('group_id', groupId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error('Error adding participant email:', error);
        throw error;
    }
};
