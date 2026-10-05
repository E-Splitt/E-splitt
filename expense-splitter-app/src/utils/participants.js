/**
 * Resolve the group participant id for the signed-in user.
 * Prefers auth UUID, then email match, then first participant.
 */
export function findParticipantIdForUser(user, participants = []) {
    if (!user || participants.length === 0) return participants[0]?.id || '';

    const byAuthId = participants.find(
        (p) => p.id === user.id || p.authUserId === user.id
    );
    if (byAuthId) return byAuthId.id;

    if (user.email) {
        const emailLower = user.email.toLowerCase();
        const byEmail = participants.find(
            (p) => p.email && p.email.toLowerCase() === emailLower
        );
        if (byEmail) return byEmail.id;
    }

    return participants[0]?.id || '';
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
