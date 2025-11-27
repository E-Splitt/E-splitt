// Browser notification utility
// No login required - uses browser's Notification API

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const sendNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/logo.png',
            badge: '/logo.png',
            ...options
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        return notification;
    }
};

// Notification templates
export const notifyNewExpense = (expenseName, amount, addedBy) => {
    const currentUser = localStorage.getItem('actorName');

    // Don't notify if you added it yourself
    if (addedBy === currentUser) return;

    sendNotification('New Expense Added', {
        body: `${addedBy} added "${expenseName}" for $${amount.toFixed(2)}`,
        tag: 'new-expense'
    });
};

export const notifyPaymentRecorded = (fromName, toName, amount) => {
    sendNotification('Payment Recorded', {
        body: `${fromName} paid ${toName} $${amount.toFixed(2)}`,
        tag: 'payment'
    });
};

export const notifyExpenseEdited = (expenseName, editedBy) => {
    const currentUser = localStorage.getItem('actorName');

    if (editedBy === currentUser) return;

    sendNotification('Expense Updated', {
        body: `${editedBy} modified "${expenseName}"`,
        tag: 'expense-edit'
    });
};

export const notifyExpenseDeleted = (expenseName, deletedBy) => {
    const currentUser = localStorage.getItem('actorName');

    if (deletedBy === currentUser) return;

    sendNotification('Expense Deleted', {
        body: `${deletedBy} removed "${expenseName}"`,
        tag: 'expense-delete'
    });
};

// Check if notifications are enabled
export const areNotificationsEnabled = () => {
    return Notification.permission === 'granted';
};

// Get notification settings from localStorage
export const getNotificationSettings = () => {
    const settings = localStorage.getItem('notificationSettings');
    return settings ? JSON.parse(settings) : {
        enabled: false,
        newExpense: true,
        payments: true,
        edits: true,
        deletes: true
    };
};

// Save notification settings
export const saveNotificationSettings = (settings) => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
};
