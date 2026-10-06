import { findParticipantIdForUser as findInGroup } from './splitLogic';

/**
 * Map auth user → participant id (argument order matches Quick Add / UI usage).
 */
export function findParticipantIdForUser(user, participants = []) {
    return findInGroup(participants, user) || participants[0]?.id || '';
}

export function buildOwnerParticipant(user) {
    if (!user) return null;
    const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'You';

    return {
        id: user.id,
        authUserId: user.id,
        name,
        email: user.email || null,
    };
}
