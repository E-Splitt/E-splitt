// Calculate balances from expenses
export const calculateBalances = (expenses, participants) => {
    const balances = {};
    const totalPaid = {};
    const totalShare = {};

    // Initialize for all known participants
    participants.forEach(person => {
        balances[person.id] = 0;
        totalPaid[person.id] = 0;
        totalShare[person.id] = 0;
    });

    expenses.forEach(expense => {
        // Skip settlement transactions for balance calculation
        if (expense.isSettlement) {
            // For settlements, adjust balances directly
            // Ensure we handle unknown users if they appear in settlements
            if (totalPaid[expense.paidBy] === undefined) totalPaid[expense.paidBy] = 0;
            if (totalShare[expense.paidTo] === undefined) totalShare[expense.paidTo] = 0;

            totalPaid[expense.paidBy] += expense.amount;
            totalShare[expense.paidTo] += expense.amount;
            return;
        }

        const payer = expense.paidBy;
        const amount = expense.amount;

        // Add to payer's total paid (initialize if unknown)
        if (totalPaid[payer] === undefined) {
            totalPaid[payer] = 0;
            totalShare[payer] = 0; // Initialize share too
            balances[payer] = 0;
        }
        totalPaid[payer] += amount;

        // Add to each person's share
        if (expense.shares) {
            Object.entries(expense.shares).forEach(([userId, share]) => {
                if (totalShare[userId] === undefined) {
                    totalShare[userId] = 0;
                    totalPaid[userId] = 0;
                    balances[userId] = 0;
                }
                totalShare[userId] += share;
            });
        }
    });

    // Calculate net balance: Paid - Share
    // We iterate over totalPaid keys to include everyone involved, even if not in participants list
    Object.keys(totalPaid).forEach(userId => {
        balances[userId] = totalPaid[userId] - totalShare[userId];
    });

    return { balances, totalPaid, totalShare };
};

// Calculate optimal settlements - only include participants with non-zero balances
export const calculateSettlements = (balances, participants) => {
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([userId, amount]) => {
        // Find person or create a placeholder if unknown
        let person = participants.find(p => p.id === userId);
        if (!person) {
            person = { id: userId, name: 'Unknown', color: '#9ca3af' };
        }

        // Only include people who actually have a balance (participated in expenses)
        if (amount < -0.01) debtors.push({ user: person, amount });
        if (amount > 0.01) creditors.push({ user: person, amount });
    });

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        settlements.push({
            from: debtor.user,
            to: creditor.user,
            amount: Number(amount.toFixed(2))
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return settlements;
};

// Get only active participants (those involved in at least one expense)
export const getActiveParticipants = (expenses, participants) => {
    const activeIds = new Set();

    expenses.forEach(expense => {
        if (expense.paidBy) activeIds.add(expense.paidBy);
        if (expense.shares) {
            Object.keys(expense.shares).forEach(userId => {
                if (expense.shares[userId] > 0) activeIds.add(userId);
            });
        }
    });

    return participants.filter(p => activeIds.has(p.id));
};
