import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addGroupMember, getGroupMembers } from './memberService';
import { supabase } from '../supabase';

// Mock supabase client
vi.mock('../supabase', () => {
    return {
        supabase: {
            rpc: vi.fn()
        }
    };
});

describe('addGroupMember', () => {
    const groupId = 'g_test123';
    const userEmail = 'test@example.com';
    const userId = '1111-2222-3333-4444';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('adds a member when user exists', async () => {
        // Mock search_users_by_email RPC to return matching user
        supabase.rpc
            .mockResolvedValueOnce({ data: [{ id: userId, email: userEmail }], error: null }) // search RPC
            .mockResolvedValueOnce({ data: { success: true, memberId: 'm_123' }, error: null }); // add_group_member RPC

        const result = await addGroupMember(groupId, userEmail);

        expect(supabase.rpc).toHaveBeenCalledTimes(2);
        // First call: search_users_by_email
        expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'search_users_by_email', { search_email: userEmail });
        // Second call: add_group_member
        expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'add_group_member', {
            p_group_id: groupId,
            p_user_id: userId,
            p_role: 'member'
        });
        expect(result).toEqual({ success: true, memberId: 'm_123' });
    });

    it('returns null when user not found', async () => {
        supabase.rpc.mockResolvedValueOnce({ data: [], error: null }); // search returns empty

        const result = await addGroupMember(groupId, 'nonexistent@example.com');
        expect(result).toBeNull();
        expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('throws when RPC returns an error', async () => {
        supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC error') });

        await expect(addGroupMember(groupId, userEmail)).rejects.toThrow('RPC error');
    });
});

describe('getGroupMembers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads members via the get_group_members RPC and maps fields', async () => {
        supabase.rpc.mockResolvedValueOnce({
            data: [{ id: 'm1', user_id: 'u1', role: 'owner', joined_at: '2026-01-01', email: 'a@x.com', name: 'Alice' }],
            error: null
        });

        const members = await getGroupMembers('g_test123');

        expect(supabase.rpc).toHaveBeenCalledWith('get_group_members', { p_group_id: 'g_test123' });
        expect(members).toEqual([
            { id: 'm1', userId: 'u1', role: 'owner', joinedAt: '2026-01-01', email: 'a@x.com', name: 'Alice' }
        ]);
    });

    it('returns an empty list when the RPC fails', async () => {
        supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('missing function') });
        expect(await getGroupMembers('g_test123')).toEqual([]);
    });
});
