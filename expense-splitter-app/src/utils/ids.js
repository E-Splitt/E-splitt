// Numeric like the legacy Date.now() ids (existing data compares ids by value),
// plus random low digits so two expenses created in the same millisecond don't collide.
// Stays below Number.MAX_SAFE_INTEGER until the year 2255.
export const createExpenseId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
