export const HUES = ['teal', 'coral', 'gold', 'moss'];

/**
 * Assigns a stable hue to a participant based on their index in the array.
 */
export const getParticipantHue = (index) => {
    // Basic fallback if index is somehow invalid
    const i = typeof index === 'number' && index >= 0 ? index : 0;
    return HUES[i % HUES.length];
};
