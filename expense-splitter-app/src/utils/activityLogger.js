// Activity logger utility for tracking changes to groups

export const createActivity = (action, actorName, targetType, targetId, description, details = {}) => {
    return {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action, // 'added', 'edited', 'deleted'
        actorName,
        targetType, // 'expense', 'participant', 'settlement'
        targetId,
        description,
        details // Store previous state for undo
    };
};

// Helper to format activity description
export const formatActivityDescription = (action, targetType, data) => {
    switch (targetType) {
        case 'expense':
            if (action === 'added') {
                return `Added '${data.description}' expense ($${data.amount.toFixed(2)})`;
            } else if (action === 'edited') {
                return `Edited '${data.description}' expense`;
            } else if (action === 'deleted') {
                return `Deleted '${data.description}' expense ($${data.amount.toFixed(2)})`;
            }
            break;
        case 'participant':
            if (action === 'added') {
                return `Added participant '${data.name}'`;
            } else if (action === 'deleted') {
                return `Removed participant '${data.name}'`;
            }
            break;
        case 'settlement':
            if (action === 'added') {
                return `Recorded settlement: ${data.from} → ${data.to} ($${data.amount.toFixed(2)})`;
            }
            break;
        default:
            return `${action} ${targetType}`;
    }
    return `${action} ${targetType}`;
};

// Get actor name from display name or use default
export const getActorName = (displayName = '', userEmail = '') => {
    // Use display name if available
    if (displayName && displayName.trim()) {
        return displayName.trim();
    }

    // Fallback to email username (part before @)
    if (userEmail) {
        return userEmail.split('@')[0];
    }

    // Default to "Someone" if no name is set
    return 'Someone';
};
