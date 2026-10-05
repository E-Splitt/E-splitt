import { supabase } from '../supabase';
import { buildOwnerParticipant } from '../utils/participants';

// Table name
const GROUPS_TABLE = 'groups';
const MAX_UPDATE_RETRIES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Merge arrays by id; client entries override server for the same id (helps concurrent adds). */
export const mergeById = (serverArr = [], clientArr = [], idKey = 'id') => {
    const map = new Map();
    for (const item of serverArr) {
        if (item?.[idKey] != null) map.set(item[idKey], item);
    }
    for (const item of clientArr) {
        if (item?.[idKey] != null) map.set(item[idKey], item);
    }
    return Array.from(map.values());
};

const applyPartialToGroupData = (currentData, partialData) => {
    const merged = { ...currentData, ...partialData };

    if (partialData.expenses !== undefined) {
        merged.expenses = mergeById(currentData.expenses || [], partialData.expenses);
    }
    if (partialData.chatMessages !== undefined) {
        merged.chatMessages = mergeById(currentData.chatMessages || [], partialData.chatMessages);
    }
    if (partialData.activityLog !== undefined) {
        merged.activityLog = mergeById(currentData.activityLog || [], partialData.activityLog).slice(0, 100);
    }
    if (partialData.participants !== undefined) {
        merged.participants = mergeById(currentData.participants || [], partialData.participants);
    }

    merged.dataVersion = (currentData.dataVersion || 0) + 1;
    merged.updatedAt = new Date().toISOString();
    return merged;
};

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

        const ownerParticipant = buildOwnerParticipant(user);
        const newGroup = {
            participants: ownerParticipant ? [ownerParticipant] : [],
            expenses: [],
            activityLog: [],
            chatMessages: [],
            pinEnabled: false,
            ...groupData,
            id: groupId,
            createdAt: new Date().toISOString(),
        };
        if (!newGroup.participants?.length && ownerParticipant) {
            newGroup.participants = [ownerParticipant];
        }

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

// Update an existing group (read–merge–write with retries for concurrent edits)
export const updateGroupInSupabase = async (groupId, partialData) => {
    let lastError = null;

    for (let attempt = 0; attempt < MAX_UPDATE_RETRIES; attempt++) {
        try {
            const { data: currentRows, error: fetchError } = await supabase
                .from(GROUPS_TABLE)
                .select('data')
                .eq('group_id', groupId)
                .single();

            if (fetchError) throw fetchError;

            const currentData = currentRows.data || {};
            const updatedData = applyPartialToGroupData(currentData, partialData);

            const { error } = await supabase
                .from(GROUPS_TABLE)
                .update({ data: updatedData })
                .eq('group_id', groupId);

            if (error) throw error;
            return;
        } catch (error) {
            lastError = error;
            if (attempt < MAX_UPDATE_RETRIES - 1) {
                await sleep(40 * (attempt + 1));
            }
        }
    }

    console.error('Error updating group:', lastError);
    throw lastError;
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

// --- Analytics/Logging ---

export const logDeviceAccess = async (groupId = null) => {
    try {
        const { error } = await supabase
            .from('app_logs')
            .insert([
                {
                    user_agent: navigator.userAgent,
                    screen_width: window.screen.width,
                    screen_height: window.screen.height,
                    language: navigator.language,
                    platform: navigator.platform,
                    group_id: groupId
                }
            ]);

        if (error) {
            // Silently fail for logs, don't disrupt user
            console.warn("Error logging device:", error);
        }
    } catch (error) {
        console.warn("Error logging device:", error);
    }
};

export const fetchLogs = async () => {
    try {
        const { data, error } = await supabase
            .from('app_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
};

export const sendMessage = async (groupId, message) => {
    try {
        const { data: groupRow, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data')
            .eq('group_id', groupId)
            .single();

        if (fetchError) throw fetchError;

        const currentMessages = groupRow.data?.chatMessages || [];
        await updateGroupInSupabase(groupId, {
            chatMessages: [...currentMessages, message],
        });
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};
