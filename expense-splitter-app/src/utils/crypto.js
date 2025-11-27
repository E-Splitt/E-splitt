// Simple PIN hashing utility using Web Crypto API
// Note: For production, use bcrypt on the server side

export const hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

export const verifyPin = async (inputPin, hashedPin) => {
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
