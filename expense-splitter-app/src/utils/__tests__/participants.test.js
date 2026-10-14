import { describe, it, expect } from 'vitest';
import { findParticipantIdForUser, buildOwnerParticipant } from '../participants';

describe('participants', () => {
    it('findParticipantIdForUser matches auth uuid', () => {
        const user = { id: 'auth-uuid-1', email: 'a@test.com' };
        const participants = [{ id: 'auth-uuid-1', name: 'Alex' }];
        expect(findParticipantIdForUser(user, participants)).toBe('auth-uuid-1');
    });

    it('findParticipantIdForUser matches email when ids differ', () => {
        const user = { id: 'auth-uuid-1', email: 'a@test.com' };
        const participants = [{ id: 'user_123', email: 'a@test.com', name: 'Alex' }];
        expect(findParticipantIdForUser(user, participants)).toBe('user_123');
    });

    it('buildOwnerParticipant uses auth id', () => {
        const p = buildOwnerParticipant({ id: 'u1', email: 'x@y.com', user_metadata: { name: 'Sam' } });
        expect(p.id).toBe('u1');
        expect(p.email).toBe('x@y.com');
    });
});
