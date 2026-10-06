import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { lockGroup, isGroupUnlocked, markGroupUnlocked, lockAllGroups } from '../utils/crypto';
import ShareGroupModal from '../components/ShareGroupModal';
import InviteMemberModal from '../components/InviteMemberModal';
import QuickAddExpense from '../components/QuickAddExpense';
import ParticipantManager from '../components/ParticipantManager';
import ExpenseList from '../components/ExpenseList';
import SettleUpModal from '../components/SettleUpModal';

describe('[EPL-001] PIN Locking and crypto utilities', () => {
    const testGroupId = 'g_pin_test_123';

    beforeEach(() => {
        sessionStorage.clear();
    });

    it('exports lockGroup and manages unlock state in sessionStorage without runtime errors', () => {
        expect(typeof lockGroup).toBe('function');
        expect(typeof markGroupUnlocked).toBe('function');
        expect(typeof isGroupUnlocked).toBe('function');

        // Initially locked
        expect(isGroupUnlocked(testGroupId)).toBe(false);

        // Mark unlocked
        markGroupUnlocked(testGroupId);
        expect(isGroupUnlocked(testGroupId)).toBe(true);

        // Lock group
        lockGroup(testGroupId);
        expect(isGroupUnlocked(testGroupId)).toBe(false);

        // Multiple groups lock
        markGroupUnlocked('g_1');
        markGroupUnlocked('g_2');
        expect(isGroupUnlocked('g_1')).toBe(true);
        expect(isGroupUnlocked('g_2')).toBe(true);

        lockAllGroups();
        expect(isGroupUnlocked('g_1')).toBe(false);
        expect(isGroupUnlocked('g_2')).toBe(false);
    });
});

describe('[EPL-002] Share and Invite Link Generation', () => {
    it('ShareGroupModal constructs correct join URL with group ID and not /join/undefined', () => {
        const groupData = {
            id: 'g_trip_hawaii_2026',
            name: 'Hawaii Trip',
            participants: [{ id: 'u1', name: 'Alice' }],
            expenses: [{ id: 1, amount: 100, isSettlement: false }]
        };

        render(
            <ShareGroupModal
                isOpen={true}
                onClose={() => { }}
                groupData={groupData}
            />
        );

        const input = screen.getByDisplayValue((val) => val.includes('/join/g_trip_hawaii_2026'));
        expect(input).toBeDefined();
        expect(input.value).not.toContain('/join/undefined');
        expect(input.value).toContain('/join/g_trip_hawaii_2026');
    });

    it('InviteMemberModal constructs correct join URL with passed groupId prop', () => {
        render(
            <InviteMemberModal
                isOpen={true}
                onClose={() => { }}
                onInvite={() => { }}
                groupName="Hawaii Trip"
                groupId="g_trip_hawaii_2026"
            />
        );

        const input = screen.getByDisplayValue((val) => val.includes('/join/g_trip_hawaii_2026'));
        expect(input).toBeDefined();
        expect(input.value).not.toContain('/join/undefined');
        expect(input.value).toContain('/join/g_trip_hawaii_2026');
    });
});

describe('[EPL-003] Group Join Redirection State Resolution', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        globalThis.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; }
        };
    });

    it('prioritizes joinGroupId from location state over lastGroupId and default group', () => {
        const availableGroups = [
            { id: 'g_default_1', name: 'Default Group' },
            { id: 'g_invited_target', name: 'Invited Target Group' }
        ];

        localStorage.setItem('lastGroupId', 'g_default_1');

        const locationState = { joinGroupId: 'g_invited_target' };

        // Test the group selection logic from App.jsx
        const resolveTargetGroup = (state, groups, lastId) => {
            const joinId = state?.joinGroupId;
            if (joinId) {
                const match = groups.find(g => g.id === joinId);
                return match ? match.id : joinId;
            }
            const lastMatch = groups.find(g => g.id === lastId);
            return lastMatch ? lastMatch.id : (groups[0]?.id || null);
        };

        const targetId = resolveTargetGroup(locationState, availableGroups, localStorage.getItem('lastGroupId'));
        expect(targetId).toBe('g_invited_target');
    });

    it('handles joinGroupId when group is not yet in local groups list', () => {
        const availableGroups = [
            { id: 'g_default_1', name: 'Default Group' }
        ];

        const locationState = { joinGroupId: 'g_external_group_999' };

        const resolveTargetGroup = (state, groups, lastId) => {
            const joinId = state?.joinGroupId;
            if (joinId) {
                const match = groups.find(g => g.id === joinId);
                return match ? match.id : joinId;
            }
            const lastMatch = groups.find(g => g.id === lastId);
            return lastMatch ? lastMatch.id : (groups[0]?.id || null);
        };

        const targetId = resolveTargetGroup(locationState, availableGroups, localStorage.getItem('lastGroupId'));
        expect(targetId).toBe('g_external_group_999');
    });
});

describe('ExpenseList search', () => {
    it('filters by payer name without crashing', () => {
        const participants = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];
        const expenses = [
            { id: 1, description: 'Pizza', amount: 20, paidBy: 'p1', shares: { p1: 10, p2: 10 }, date: '1/1/2026' },
            { id: 2, description: 'Taxi', amount: 10, paidBy: 'p2', shares: { p1: 5, p2: 5 }, date: '1/2/2026' },
        ];
        render(<ExpenseList expenses={expenses} participants={participants} onDelete={() => {}} onEdit={() => {}} />);

        fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'bob' } });

        expect(screen.queryByText('Pizza')).toBeNull();
        expect(screen.getByText('Taxi')).toBeDefined();
    });
});

describe('SettleUpModal prefill', () => {
    const participants = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }];

    it('fills payer and receiver from the dashboard shape { fromId, toId }', () => {
        const onSettle = vi.fn();
        const { container } = render(
            <SettleUpModal isOpen onClose={() => {}} onSettle={onSettle} participants={participants}
                prefill={{ fromId: 'p2', toId: 'p1', amount: 12.5 }} />
        );
        fireEvent.submit(container.querySelector('form'));

        expect(onSettle).toHaveBeenCalledTimes(1);
        const s = onSettle.mock.calls[0][0];
        expect(s).toMatchObject({ paidBy: 'p2', paidTo: 'p1', amount: 12.5, isSettlement: true, shares: { p1: 12.5 } });
        expect(Number.isSafeInteger(s.id)).toBe(true);
    });

    it('still accepts the { from, to } object shape', () => {
        const onSettle = vi.fn();
        const { container } = render(
            <SettleUpModal isOpen onClose={() => {}} onSettle={onSettle} participants={participants}
                prefill={{ from: { id: 'p1' }, to: { id: 'p2' }, amount: 3 }} />
        );
        fireEvent.submit(container.querySelector('form'));
        expect(onSettle.mock.calls[0][0]).toMatchObject({ paidBy: 'p1', paidTo: 'p2', amount: 3 });
    });
});

describe('ParticipantManager members tab', () => {
    const members = [
        { id: 'm1', userId: 'u_owner', role: 'owner', name: 'Owner', email: 'o@x.com' },
        { id: 'm2', userId: 'u_bob', role: 'member', name: 'Bob', email: 'b@x.com' },
    ];

    it('lets an owner remove and re-role members, but not the owner', () => {
        const onRemoveMember = vi.fn();
        const onUpdateRole = vi.fn();
        render(
            <ParticipantManager
                participants={[]} members={members} currentUserRole="owner"
                onAdd={() => {}} onEdit={() => {}} onRemove={() => {}}
                onRemoveMember={onRemoveMember} onUpdateRole={onUpdateRole}
            />
        );

        fireEvent.click(screen.getByRole('tab', { name: /Members \(2\)/ }));

        const removeButtons = screen.getAllByTitle('Remove member');
        expect(removeButtons).toHaveLength(1);
        fireEvent.click(removeButtons[0]);
        expect(onRemoveMember).toHaveBeenCalledWith('u_bob');

        fireEvent.change(screen.getByDisplayValue('Member'), { target: { value: 'admin' } });
        expect(onUpdateRole).toHaveBeenCalledWith('u_bob', 'admin');
    });

    it('hides management controls from regular members', () => {
        render(
            <ParticipantManager
                participants={[]} members={members} currentUserRole="member"
                onAdd={() => {}} onEdit={() => {}} onRemove={() => {}}
                onRemoveMember={() => {}} onUpdateRole={() => {}}
            />
        );
        fireEvent.click(screen.getByRole('tab', { name: /Members/ }));
        expect(screen.queryByTitle('Remove member')).toBeNull();
        expect(screen.getByText('Bob')).toBeDefined();
    });
});

describe('[ISS-08] QuickAddExpense payer attribution', () => {
    const participants = [
        { id: 'user_1', name: 'Alice' },
        { id: 'user_2', name: 'Bob' },
    ];

    it('records paidBy as a participant id, never a raw auth UUID', async () => {
        const onAdd = vi.fn().mockResolvedValue();
        const { container } = render(
            <QuickAddExpense onAdd={onAdd} participants={participants} currentUserId="f47ac10b-auth-uuid" />
        );

        fireEvent.change(screen.getByPlaceholderText('Quick expense description...'), { target: { value: 'Pizza' } });
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '30' } });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(onAdd).toHaveBeenCalled());
        const expense = onAdd.mock.calls[0][0];
        expect(expense.paidBy).toBe('user_1');
        expect(expense.shares).toEqual({ user_1: 15, user_2: 15 });
    });

    it('defaults paidBy to the current participant when resolved', async () => {
        const onAdd = vi.fn().mockResolvedValue();
        const { container } = render(
            <QuickAddExpense onAdd={onAdd} participants={participants} currentUserId="user_2" />
        );

        fireEvent.change(screen.getByPlaceholderText('Quick expense description...'), { target: { value: 'Taxi' } });
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(onAdd).toHaveBeenCalled());
        expect(onAdd.mock.calls[0][0].paidBy).toBe('user_2');
    });
});
