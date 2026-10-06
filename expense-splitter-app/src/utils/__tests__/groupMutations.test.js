import { describe, it, expect } from 'vitest';
import {
    addExpense, replaceExpense, removeExpense, archiveActiveExpenses,
    addParticipant, updateParticipant, removeParticipant, removeActivity,
    appendChatMessage, compose
} from '../groupMutations';

describe('groupMutations', () => {
    // Server state that already contains another member's concurrent expense (id 2)
    const server = {
        name: 'Trip',
        participants: [{ id: 'p1', name: 'Alice' }],
        expenses: [{ id: 2, amount: 25 }, { id: 1, amount: 10 }],
        activityLog: [{ id: 'a1' }],
        chatMessages: [],
    };

    it('addExpense keeps expenses added concurrently by others', () => {
        const next = addExpense({ id: 3, amount: 50 }, { id: 'a2' })(server);
        expect(next.expenses.map(e => e.id)).toEqual([3, 2, 1]);
        expect(next.activityLog.map(a => a.id)).toEqual(['a2', 'a1']);
        expect(next.name).toBe('Trip');
    });

    it('addExpense does not duplicate an expense that is retried', () => {
        const once = addExpense({ id: 3, amount: 50 })(server);
        const twice = addExpense({ id: 3, amount: 50 })(once);
        expect(twice.expenses.filter(e => e.id === 3)).toHaveLength(1);
    });

    it('replaceExpense and removeExpense only touch the target', () => {
        expect(replaceExpense({ id: 1, amount: 99 })(server).expenses).toEqual([{ id: 2, amount: 25 }, { id: 1, amount: 99 }]);
        expect(removeExpense(1)(server).expenses).toEqual([{ id: 2, amount: 25 }]);
    });

    it('archiveActiveExpenses tags only unassigned expenses', () => {
        const data = { expenses: [{ id: 1, periodId: 'old' }, { id: 2 }] };
        expect(archiveActiveExpenses('p_new')(data).expenses).toEqual([{ id: 1, periodId: 'old' }, { id: 2, periodId: 'p_new' }]);
    });

    it('activity log is capped at 50 entries', () => {
        const data = { activityLog: Array.from({ length: 50 }, (_, i) => ({ id: i })) };
        const next = addExpense({ id: 'x' }, { id: 'new' })(data);
        expect(next.activityLog).toHaveLength(50);
        expect(next.activityLog[0].id).toBe('new');
    });

    it('participant updaters work on missing arrays and target by id', () => {
        expect(addParticipant({ id: 'p2' })({}).participants).toEqual([{ id: 'p2' }]);
        expect(updateParticipant('p1', { name: 'Al' })(server).participants).toEqual([{ id: 'p1', name: 'Al' }]);
        expect(removeParticipant('p1')(server).participants).toEqual([]);
    });

    it('compose applies updaters in order', () => {
        const next = compose(removeExpense(1), removeActivity('a1'), appendChatMessage({ id: 'm1' }))(server);
        expect(next.expenses).toEqual([{ id: 2, amount: 25 }]);
        expect(next.activityLog).toEqual([]);
        expect(next.chatMessages).toEqual([{ id: 'm1' }]);
    });
});
