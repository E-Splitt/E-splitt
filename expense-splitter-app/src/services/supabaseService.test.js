import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mutateGroupData } from './supabaseService';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }));

// Minimal fake of the PostgREST builder chain used by mutateGroupData
const selectChain = (result) => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve(result) }) }),
});
const updateChain = (result, captured) => ({
    update: (payload) => {
        captured.push(payload);
        return { eq: () => ({ eq: () => ({ select: () => Promise.resolve(result) }) }) };
    },
});

describe('mutateGroupData', () => {
    let writes;

    beforeEach(() => {
        writes = [];
        vi.clearAllMocks();
    });

    it('writes with version + 1 when nobody else saved', async () => {
        supabase.from
            .mockReturnValueOnce(selectChain({ data: { data: { expenses: [] }, version: 4 }, error: null }))
            .mockReturnValueOnce(updateChain({ data: [{ group_id: 'g1' }], error: null }, writes));

        const saved = await mutateGroupData('g1', d => ({ ...d, expenses: [{ id: 1 }] }));

        expect(saved.expenses).toEqual([{ id: 1 }]);
        expect(writes).toEqual([{ data: { expenses: [{ id: 1 }] }, version: 5 }]);
    });

    it('re-reads and re-applies the change when another member saved first', async () => {
        supabase.from
            .mockReturnValueOnce(selectChain({ data: { data: { expenses: [] }, version: 1 }, error: null }))
            .mockReturnValueOnce(updateChain({ data: [], error: null }, writes)) // version moved on: 0 rows
            .mockReturnValueOnce(selectChain({ data: { data: { expenses: [{ id: 'theirs' }] }, version: 2 }, error: null }))
            .mockReturnValueOnce(updateChain({ data: [{ group_id: 'g1' }], error: null }, writes));

        const saved = await mutateGroupData('g1', d => ({ ...d, expenses: [{ id: 'mine' }, ...d.expenses] }));

        expect(saved.expenses).toEqual([{ id: 'mine' }, { id: 'theirs' }]);
        expect(writes[1].version).toBe(3);
    });

    it('gives up with a clear error after repeated conflicts', async () => {
        for (let i = 0; i < 5; i++) {
            supabase.from
                .mockReturnValueOnce(selectChain({ data: { data: {}, version: i }, error: null }))
                .mockReturnValueOnce(updateChain({ data: [], error: null }, writes));
        }
        await expect(mutateGroupData('g1', d => d)).rejects.toThrow(/edited by someone else/);
    });

    it('falls back to an unversioned write if the version column is not migrated yet', async () => {
        const missing = { code: '42703', message: 'column groups.version does not exist' };
        supabase.from
            .mockReturnValueOnce(selectChain({ data: null, error: missing }))
            .mockReturnValueOnce(selectChain({ data: { data: { n: 1 } }, error: null }))
            .mockReturnValueOnce({
                update: (payload) => {
                    writes.push(payload);
                    return { eq: () => Promise.resolve({ error: null }) };
                },
            });

        const saved = await mutateGroupData('g1', d => ({ n: d.n + 1 }));
        expect(saved).toEqual({ n: 2 });
        expect(writes).toEqual([{ data: { n: 2 } }]);
    });
});
