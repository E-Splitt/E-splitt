import { supabase } from '../supabase';

// --- Settlement Period Operations ---

/**
 * Create a new settlement period for a group
 * Automatically closes any active periods for the group
 */
export const createPeriod = async (groupId, name = null, startDate = new Date()) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate default name if not provided
        const periodName = name || `Period ${new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })}`;

        const { data, error } = await supabase
            .from('settlement_periods')
            .insert([
                {
                    group_id: groupId,
                    name: periodName,
                    start_date: startDate.toISOString(),
                    status: 'active'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating period:', error);
        throw error;
    }
};

/**
 * Close the current active period
 * Saves final balances and settlements snapshot
 */
export const closePeriod = async (periodId, finalBalances, finalSettlements, totalExpenses, transactionCount) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('settlement_periods')
            .update({
                status: 'closed',
                end_date: new Date().toISOString(),
                closed_at: new Date().toISOString(),
                closed_by: user.id,
                final_balances: finalBalances,
                final_settlements: finalSettlements,
                total_expenses: totalExpenses,
                transaction_count: transactionCount
            })
            .eq('id', periodId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error closing period:', error);
        throw error;
    }
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
    try {
        const activePeriod = await getActivePeriod(groupId);

        if (!activePeriod) {
            // Create first period
            return await createPeriod(groupId, 'Initial Period');
        }

        return activePeriod;
    } catch (error) {
        console.error('Error ensuring active period:', error);
        throw error;
    }
};
