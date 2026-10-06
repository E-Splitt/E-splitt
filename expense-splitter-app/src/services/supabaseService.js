import { supabase } from '../supabase';
import { appendChatMessage } from '../utils/groupMutations';

// Table name
const GROUPS_TABLE = 'groups';

// Generate secure random group ID
const generateGroupId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'g_';
    for (let i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

// --- Group Operations ---

// Create a new group
export const createGroupInSupabase = async (groupData, customId = null) => {
    try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const groupId = customId || generateGroupId();

        const newGroup = {
            ...groupData,
            id: groupId,
            createdAt: new Date().toISOString(),
            activityLog: [] // Initialize activity log
        };

        const { error } = await supabase
            .from(GROUPS_TABLE)
            .insert([
                {
                    group_id: groupId,
                    data: newGroup,
                    user_id: user.id // Automatically set from authenticated user
                }
            ]);

        if (error) throw error;
        return newGroup;
    } catch (error) {
        console.error("Error creating group:", error);
        throw error;
    }
};

const MAX_SAVE_ATTEMPTS = 5;

// Postgres "undefined column" / PostgREST "column not in schema cache"
const isMissingVersionColumn = (error) =>
    error && (error.code === '42703' || error.code === 'PGRST204') && /version/.test(error.message || '');

/**
 * Apply `mutate(latestData) => nextData` to a group with optimistic concurrency.
 * The write only succeeds if nobody else saved since we read; otherwise it re-reads and retries,
 * so concurrent edits from other members are never overwritten.
 * Returns the saved data.
 */
export const mutateGroupData = async (groupId, mutate) => {
    for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
        const { data: row, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data, version')
            .eq('group_id', groupId)
            .single();

        if (isMissingVersionColumn(fetchError)) return mutateGroupDataUnversioned(groupId, mutate);
        if (fetchError) throw fetchError;

        const version = row.version ?? 0;
        const nextData = mutate(row.data || {});

        const { data: updatedRows, error: updateError } = await supabase
            .from(GROUPS_TABLE)
            .update({ data: nextData, version: version + 1 })
            .eq('group_id', groupId)
            .eq('version', version)
            .select('group_id');

        if (updateError) throw updateError;
        if (updatedRows?.length) return nextData;
    }
    throw new Error('This group is being edited by someone else right now. Please try again.');
};

const mutateGroupDataUnversioned = async (groupId, mutate) => {
    const { data: row, error: fetchError } = await supabase
        .from(GROUPS_TABLE)
        .select('data')
        .eq('group_id', groupId)
        .single();
    if (fetchError) throw fetchError;

    const nextData = mutate(row.data || {});
    const { error } = await supabase
        .from(GROUPS_TABLE)
        .update({ data: nextData })
        .eq('group_id', groupId);
    if (error) throw error;
    return nextData;
};

// Update an existing group
export const updateGroupInSupabase = async (groupId, partialData) => {
    try {
        return await mutateGroupData(groupId, (current) => ({ ...current, ...partialData }));
    } catch (error) {
        console.error("Error updating group:", error);
        throw error;
    }
};

// Delete a group
export const deleteGroupInSupabase = async (groupId) => {
    try {
        const { error } = await supabase
            .from(GROUPS_TABLE)
            .delete()
            .eq('group_id', groupId);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
};

// --- Real-time Listeners ---

// Listen to all groups (RLS automatically filters to user's groups)
// Listen to all groups (Filtered by User ID for security)
// Listen to all groups (Filtered by User ID for security)
export const subscribeToGroups = (userId, callback) => {
    const fetchUserGroups = async () => {
        // If userId is passed, use it, otherwise try to get from auth (fallback)
        let currentUserId = userId;
        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) currentUserId = user.id;
        }

        if (!currentUserId) return;

        // 1. Get groups where user is a member
        const { data: memberGroups } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', currentUserId);
            
        const memberGroupIds = memberGroups ? memberGroups.map(mg => mg.group_id) : [];

        // 2. Fetch owned groups OR member groups
        let query = supabase.from(GROUPS_TABLE).select('*');
        if (memberGroupIds.length > 0) {
            query = query.or(`user_id.eq.${currentUserId},group_id.in.(${memberGroupIds.join(',')})`);
        } else {
            query = query.eq('user_id', currentUserId);
        }

        const { data, error } = await query;

        if (!error && data) {
            const groups = data.map(row => row.data);
            if (typeof callback === 'function') {
                callback(groups);
            } else {
                console.error('Callback provided to subscribeToGroups is not a function:', callback);
            }
        }
    };

    fetchUserGroups();

    // Subscribe to changes (Filter by user_id)
    const channel = supabase
        .channel('public:groups')
        .on('postgres_changes', { event: '*', schema: 'public', table: GROUPS_TABLE }, async () => {
            // Since payload might not have user_id on some events, safest to just refetch
            await fetchUserGroups();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Listen to a specific group's data
export const subscribeToGroupData = (groupId, callback) => {
    if (!groupId) return () => { };

    // 1. Fetch initial data
    supabase
        .from(GROUPS_TABLE)
        .select('data')
        .eq('group_id', groupId)
        .single()
        .then(({ data, error }) => {
            if (!error && data) {
                callback(data.data);
            } else {
                callback(null);
            }
        });

    // 2. Subscribe to changes for this specific row
    const channel = supabase
        .channel(`group:${groupId}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: GROUPS_TABLE,
                filter: `group_id=eq.${groupId}`
            },
            (payload) => {
                if (payload.eventType === 'DELETE') {
                    callback(null);
                } else {
                    // payload.new has the new row data
                    callback(payload.new.data);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// --- Import/Export ---

export const importGroupToSupabase = async (groupData) => {
    try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const groupId = generateGroupId();

        const newGroup = {
            ...groupData,
            id: groupId,
            name: `${groupData.name} (Imported)`,
            importedAt: new Date().toISOString(),
            activityLog: groupData.activityLog || []
        };

        const { error } = await supabase
            .from(GROUPS_TABLE)
            .insert([
                {
                    group_id: groupId,
                    data: newGroup,
                    user_id: user.id // Set from authenticated user
                }
            ]);

        if (error) throw error;
        return newGroup;
    } catch (error) {
        console.error("Error importing group:", error);
        throw error;
    }
};

export const sendMessage = async (groupId, message) => {
    try {
        await mutateGroupData(groupId, appendChatMessage(message));
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};
