import { supabase } from '../supabase';

// --- Settlement Period Operations ---

export const closePeriod = async (groupId, periodId, name, activity) => {
    const { data, error } = await supabase.rpc('esplit_close_period', {
        p_group: groupId, p_period: periodId, p_name: name, p_activity: activity
    });
    if (error) throw error;
    return data;
};

export const editArchivedExpense = async (groupId, previous, changes) => {
    const { data, error } = await supabase.rpc('esplit_edit_archived_expense', {
        p_group: groupId, p_previous: previous, p_changes: changes
    });
    if (error) throw new Error(error.message);
    return data;
};

export const addArchivedExpense = async (groupId, periodId, expense) => {
    const { data, error } = await supabase.rpc('esplit_add_archived_expense', {
        p_group: groupId, p_period: periodId, p_expense: expense
    });
    if (error) throw new Error(error.message);
    return data;
};

export const getArchivedExpenseEdits = async (periodId) => {
    const { data, error } = await supabase.from('archived_expense_edits')
        .select('id, expense_id, actor_name, edited_at, before_expense, after_expense')
        .eq('period_id', periodId)
        .order('edited_at', { ascending: false });
    if (error) throw error;
    return data;
};

/**
 * Get all periods for a group
 * Returns both active and closed periods, sorted by start date (newest first)
 */
export const getPeriodsForGroup = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from('settlement_periods')
            .select('*')
            .eq('group_id', groupId)
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching periods:', error);
        throw error;
    }
};

/**
 * Get the active period for a group
 * Returns null if no active period exists
 */
export const getActivePeriod = async (groupId) => {
    try {
        const { data, error } = await supabase
            .from('settlement_periods')
            .select('*')
            .eq('group_id', groupId)
            .eq('status', 'active')
            .single();

        if (error) {
            // No active period found
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error fetching active period:', error);
        throw error;
    }
};

/**
 * Get details of a specific period
 */
export const getPeriodDetails = async (periodId) => {
    try {
        const { data, error } = await supabase
            .from('settlement_periods')
            .select('*')
            .eq('id', periodId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching period details:', error);
        throw error;
    }
};

/**
 * Subscribe to period changes for a group
 * Calls callback whenever periods are created, updated, or deleted
 */
export const subscribeToPeriods = (groupId, callback) => {
    // 1. Fetch initial data immediately
    getPeriodsForGroup(groupId).then(callback);

    // 2. Subscribe to changes
    const subscription = supabase
        .channel(`periods:${groupId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'settlement_periods',
                filter: `group_id=eq.${groupId}`
            },
            () => {
                // Fetch updated periods and call callback
                getPeriodsForGroup(groupId).then(callback);
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
};

/**
 * Delete a period (e.g. clean up archives)
 */
export const deletePeriod = async (periodId) => {
    try {
        const { error } = await supabase
            .from('settlement_periods')
            .delete()
            .eq('id', periodId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting period:', error);
        throw error;
    }
};

/**
 * Initialize first period for a group if none exists
 * Called when user first accesses a group
 */
export const ensureActivePeriod = async (groupId) => {
    const { data, error } = await supabase.rpc('esplit_ensure_period', { p_group: groupId });
    if (error) throw error;
    return data;
};
