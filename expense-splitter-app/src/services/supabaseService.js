import { supabase } from '../supabase';

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

// Update an existing group
export const updateGroupInSupabase = async (groupId, partialData) => {
    try {
        // First, get the current data to merge
        const { data: currentRows, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data')
            .eq('group_id', groupId)
            .single();

        if (fetchError) throw fetchError;

        const currentData = currentRows.data;
        const updatedData = { ...currentData, ...partialData };

        const { error } = await supabase
            .from(GROUPS_TABLE)
            .update({ data: updatedData })
            .eq('group_id', groupId);

        if (error) throw error;
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
export const subscribeToGroups = (callback) => {
    // 1. Fetch initial data (RLS policies ensure only user's groups are returned)
    supabase
        .from(GROUPS_TABLE)
        .select('*')
        .then(({ data, error }) => {
            if (!error && data) {
                const groups = data.map(row => row.data);
                callback(groups);
            }
        });

    // 2. Subscribe to changes (RLS policies ensure only user's groups trigger updates)
    const channel = supabase
        .channel('public:groups')
        .on('postgres_changes', { event: '*', schema: 'public', table: GROUPS_TABLE }, (payload) => {
            // Re-fetch all groups to ensure consistency (RLS filters automatically)
            supabase
                .from(GROUPS_TABLE)
                .select('*')
                .then(({ data, error }) => {
                    if (!error && data) {
                        const groups = data.map(row => row.data);
                        callback(groups);
                    }
                });
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
        // 1. Get current group data
        const { data: groupRow, error: fetchError } = await supabase
            .from(GROUPS_TABLE)
            .select('data')
            .eq('group_id', groupId)
            .single();

        if (fetchError) throw fetchError;

        const currentData = groupRow.data;
        const currentMessages = currentData.chatMessages || [];

        // 2. Append new message
        const updatedMessages = [...currentMessages, message];

        //3. Update group
        const { error: updateError } = await supabase
            .from(GROUPS_TABLE)
            .update({
                data: { ...currentData, chatMessages: updatedMessages }
            })
            .eq('group_id', groupId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};
