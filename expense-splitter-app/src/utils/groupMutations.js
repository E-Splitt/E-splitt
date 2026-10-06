// Pure updaters applied to the latest server copy of a group's `data`.
// Each one expresses a single change, so concurrent edits by other users are preserved.

const ACTIVITY_LOG_LIMIT = 50;

const withActivity = (data, activity) =>
    activity
        ? [activity, ...(data.activityLog || [])].slice(0, ACTIVITY_LOG_LIMIT)
        : (data.activityLog || []);

export const addExpense = (expense, activity) => (data) => ({
    ...data,
    expenses: [expense, ...(data.expenses || []).filter(e => e.id !== expense.id)],
    activityLog: withActivity(data, activity),
});

export const replaceExpense = (expense, activity) => (data) => ({
    ...data,
    expenses: (data.expenses || []).map(e => (e.id === expense.id ? expense : e)),
    activityLog: withActivity(data, activity),
});

export const removeExpense = (expenseId, activity) => (data) => ({
    ...data,
    expenses: (data.expenses || []).filter(e => e.id !== expenseId),
    activityLog: withActivity(data, activity),
});

export const archiveActiveExpenses = (periodId, activity) => (data) => ({
    ...data,
    expenses: (data.expenses || []).map(e => (e.periodId ? e : { ...e, periodId })),
    activityLog: withActivity(data, activity),
});

export const addParticipant = (participant) => (data) => ({
    ...data,
    participants: [...(data.participants || []).filter(p => p.id !== participant.id), participant],
});

export const updateParticipant = (participantId, updates) => (data) => ({
    ...data,
    participants: (data.participants || []).map(p => (p.id === participantId ? { ...p, ...updates } : p)),
});

export const removeParticipant = (participantId) => (data) => ({
    ...data,
    participants: (data.participants || []).filter(p => p.id !== participantId),
});

export const removeActivity = (activityId) => (data) => ({
    ...data,
    activityLog: (data.activityLog || []).filter(a => a.id !== activityId),
});

export const appendChatMessage = (message) => (data) => ({
    ...data,
    chatMessages: [...(data.chatMessages || []), message],
});

export const compose = (...updaters) => (data) => updaters.reduce((acc, fn) => fn(acc), data);
