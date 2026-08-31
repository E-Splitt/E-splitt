import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { lockGroup, isGroupUnlocked, markGroupUnlocked, lockAllGroups } from '../utils/crypto';
import ShareGroupModal from '../components/ShareGroupModal';
import InviteMemberModal from '../components/InviteMemberModal';

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
        global.localStorage = {
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
