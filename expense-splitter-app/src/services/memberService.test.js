// Jest test for addGroupMember flow (mocking Supabase RPC)
import { addGroupMember } from './memberService';

// Mock supabase client
jest.mock('../supabase', () => {
    return {
        supabase: {
            rpc: jest.fn()
        }
    };
});

const { supabase } = require('../supabase');

describe('addGroupMember', () => {
    const groupId = 'g_test123';
    const userEmail = 'test@example.com';
    const userId = '1111-2222-3333-4444';

    beforeEach(() => {
        jest.clearAllMocks();
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
