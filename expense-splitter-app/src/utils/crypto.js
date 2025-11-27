// Simple PIN hashing utility using Web Crypto API
// Note: For production, use bcrypt on the server side

const simpleHash = (pin) => {
    let hash = 5381;
    for (let i = 0; i < pin.length; i++) {
        hash = ((hash << 5) + hash) + pin.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
};

export const hashPin = async (pin) => {
    if (window.crypto && window.crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            console.warn("Crypto API failed, falling back to simple hash", e);
        }
    }

    return simpleHash(pin);
};

export const verifyPin = async (inputPin, hashedPin) => {
    // If the stored hash is a simple hash (short), use simple hashing to verify
    // regardless of whether we are in a secure context or not.
    if (hashedPin && hashedPin.length < 64) {
        return simpleHash(inputPin) === hashedPin;
    }

    // Otherwise, try to use the standard hashing (which might fallback if API is missing)
    const inputHash = await hashPin(inputPin);
    return inputHash === hashedPin;
};

// Session storage for unlocked groups
const UNLOCKED_GROUPS_KEY = 'unlockedGroups';

export const markGroupUnlocked = (groupId) => {
    const unlocked = getUnlockedGroups();
    if (!unlocked.includes(groupId)) {
        unlocked.push(groupId);
        sessionStorage.setItem(UNLOCKED_GROUPS_KEY, JSON.stringify(unlocked));
    }
};

export const isGroupUnlocked = (groupId) => {
    const unlocked = getUnlockedGroups();
    return unlocked.includes(groupId);
};

export const lockGroup = (groupId) => {
    const unlocked = getUnlockedGroups();
    const filtered = unlocked.filter(id => id !== groupId);
    sessionStorage.setItem(UNLOCKED_GROUPS_KEY, JSON.stringify(filtered));
};

export const lockAllGroups = () => {
    sessionStorage.removeItem(UNLOCKED_GROUPS_KEY);
};

export const getUnlockedGroups = () => {
    const stored = sessionStorage.getItem(UNLOCKED_GROUPS_KEY);
    return stored ? JSON.parse(stored) : [];
};
