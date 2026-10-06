// Convert dollars (float) to integer cents
export const toCents = (amount) => Math.round(Number(amount) * 100);

// Convert integer cents to dollars (float)
export const toDollars = (cents) => cents / 100;

// Calculate balances from expenses
export const calculateBalances = (expenses, participants) => {
    const balancesCents = {};
    const totalPaidCents = {};
    const totalShareCents = {};

    // Initialize for all known participants
    participants.forEach(person => {
        balancesCents[person.id] = 0;
        totalPaidCents[person.id] = 0;
        totalShareCents[person.id] = 0;
    });

    expenses.forEach(expense => {
        const amountCents = toCents(expense.amount);

        // Settlement transactions only affect balances, not total spending
        if (expense.isSettlement) {
            const payer = expense.paidBy;
            const payee = expense.paidTo;
            if (balancesCents[payer] === undefined) balancesCents[payer] = 0;
            if (balancesCents[payee] === undefined) balancesCents[payee] = 0;

            // Payer balance goes up (they paid debt), payee balance goes down
            balancesCents[payer] += amountCents;
            balancesCents[payee] -= amountCents;
            return;
        }

        const payer = expense.paidBy;

        // Add to payer's total paid
        if (totalPaidCents[payer] === undefined) {
            totalPaidCents[payer] = 0;
            totalShareCents[payer] = 0;
            balancesCents[payer] = 0;
        }
        totalPaidCents[payer] += amountCents;

        // Add to each person's share
        if (expense.shares) {
            Object.entries(expense.shares).forEach(([userId, shareAmount]) => {
                const shareCents = toCents(shareAmount);
                if (totalShareCents[userId] === undefined) {
                    totalShareCents[userId] = 0;
                    totalPaidCents[userId] = 0;
                    balancesCents[userId] = 0;
                }
                totalShareCents[userId] += shareCents;
            });
        }
    });

    // Calculate net balance: Paid - Share (plus any settlement adjustments)
    Object.keys(balancesCents).forEach(userId => {
        balancesCents[userId] += (totalPaidCents[userId] || 0) - (totalShareCents[userId] || 0);
    });

    // Convert back to dollars for external use
    const balances = {};
    const totalPaid = {};
    const totalShare = {};
    
    Object.keys(balancesCents).forEach(id => balances[id] = toDollars(balancesCents[id]));
    Object.keys(totalPaidCents).forEach(id => totalPaid[id] = toDollars(totalPaidCents[id]));
    Object.keys(totalShareCents).forEach(id => totalShare[id] = toDollars(totalShareCents[id]));

    return { balances, totalPaid, totalShare };
};

// Calculate optimal settlements - only include participants with non-zero balances
export const calculateSettlements = (balances, participants) => {
    const debtors = [];
    const creditors = [];

    // Work strictly in cents to avoid float drift during matching
    Object.entries(balances).forEach(([userId, amount]) => {
        const amountCents = toCents(amount);
        let person = participants.find(p => p.id === userId) || { id: userId, name: 'Unknown', color: '#9ca3af' };
        
        if (amountCents < 0) debtors.push({ user: person, amount: amountCents });
        if (amountCents > 0) creditors.push({ user: person, amount: amountCents });
    });

    // Stable sort: primary by amount, secondary by ID string to prevent jumping settlements
    debtors.sort((a, b) => a.amount - b.amount || a.user.id.localeCompare(b.user.id));
    creditors.sort((a, b) => b.amount - a.amount || a.user.id.localeCompare(b.user.id));

    const settlements = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amountCents = Math.min(Math.abs(debtor.amount), creditor.amount);
        if (amountCents === 0) break;

        settlements.push({
            from: debtor.user,
            to: creditor.user,
            amount: toDollars(amountCents)
        });

        debtor.amount += amountCents;
        creditor.amount -= amountCents;

        if (debtor.amount === 0) i++;
        if (creditor.amount === 0) j++;
    }

    return settlements;
};

// Map a Supabase auth user to their participant id in this group (participants use their own ids)
export const findParticipantIdForUser = (participants, user) => {
    if (!user || !participants?.length) return null;
    const byId = participants.find(p => p.id === user.id);
    if (byId) return byId.id;
    const email = user.email?.toLowerCase();
    if (!email) return null;
    return participants.find(p => p.email?.toLowerCase() === email)?.id || null;
};

// Get only active participants (those involved in at least one expense)
export const getActiveParticipants = (expenses, participants) => {
    const activeIds = new Set();

    expenses.forEach(expense => {
        if (expense.paidBy) activeIds.add(expense.paidBy);
        if (expense.shares) {
            Object.entries(expense.shares).forEach(([userId, shareAmount]) => {
                if (Number(shareAmount) > 0) activeIds.add(userId);
            });
        }
    });

    return participants.filter(p => activeIds.has(p.id));
};
