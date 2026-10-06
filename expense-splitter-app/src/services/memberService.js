import { supabase } from '../supabase';

// Table names
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
            .rpc('get_group_members', { p_group_id: groupId });

        if (error) throw error;

        return (data || []).map(member => ({
            id: member.id,
            userId: member.user_id,
            role: member.role,
            joinedAt: member.joined_at,
            email: member.email,
            name: member.name || 'Unknown'
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
            async () => {
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

