import React, { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, Check } from 'lucide-react';

const QuickAddExpense = ({ onAdd, participants, currentUserId }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(currentUserId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!paidBy && currentUserId) {
            setPaidBy(currentUserId);
        } else if (!paidBy && participants.length > 0) {
            setPaidBy(participants[0].id);
        }
    }, [currentUserId, participants, paidBy]);

    // Auto-dismiss error
    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(t);
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const amountFloat = parseFloat(amount);
        if (!description.trim()) {
            setError('Enter a description');
            return;
        }
        if (isNaN(amountFloat) || amountFloat <= 0) {
            setError('Enter a valid amount');
            return;
        }

        const shares = {};
        if (participants.length > 0) {
            const amountCents = Math.round(amountFloat * 100);
            const baseShareCents = Math.floor(amountCents / participants.length);
            let remainderCents = amountCents % participants.length;

            participants.forEach(p => {
                let shareCents = baseShareCents;
                if (remainderCents > 0) {
                    shareCents += 1;
                    remainderCents -= 1;
                }
                shares[p.id] = shareCents / 100;
            });
        } else {
            shares[paidBy] = amountFloat;
        }

        const expenseData = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            expenseDate: new Date().toISOString().split('T')[0],
            description,
            amount: amountFloat,
            paidBy,
            category: 'other',
            shares,
            isSettlement: false
        };

        try {
            setIsSubmitting(true);
            await onAdd(expenseData);

            setDescription('');
            setAmount('');
            setPaidBy(currentUserId || (participants[0]?.id || ''));

            // Success flash
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        } catch (error) {
            console.error('Error adding expense:', error);
            setError('Failed to add expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mb-6 space-y-1">
            <form
                onSubmit={handleSubmit}
                className={`themed-card rounded-lg p-2 flex flex-col md:flex-row gap-2 items-center transition-all duration-300 ${showSuccess ? 'ring-2 ring-green-400 shadow-green-400/20 shadow-lg' : ''
                    }`}
            >
                {/* Description Input */}
                <div className="flex-grow w-full md:w-auto">
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); setError(''); }}
                        placeholder="Quick expense description..."
                        className="themed-input w-full p-2 rounded-md text-sm"
                    />
                </div>

                {/* Amount Input */}
                <div className="w-full md:w-32 relative">
                    <span className="absolute left-2 top-2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => { setAmount(e.target.value); setError(''); }}
                        placeholder="0.00"
                        step="0.01"
                        className="themed-input w-full p-2 pl-6 rounded-md text-sm"
                    />
                </div>

                {/* Paid By Selector */}
                <div className="w-full md:w-40">
                    <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="themed-select w-full p-2 rounded-md text-sm"
                    >
                        {participants.map(person => (
                            <option key={person.id} value={person.id}>
                                {person.id === currentUserId ? 'You' : person.name} paid
                            </option>
                        ))}
                    </select>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full md:w-auto px-4 py-2 rounded-md font-medium flex items-center justify-center gap-1 transition-all hover:scale-105 whitespace-nowrap text-sm disabled:opacity-70 ${showSuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    {isSubmitting ? (
                        <Loader size={16} className="animate-spin" />
                    ) : showSuccess ? (
                        <Check size={16} />
                    ) : (
                        <Plus size={16} />
                    )}
                    {showSuccess ? 'Added!' : 'Add'}
                </button>
            </form>

            {/* Inline error */}
            {error && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 animate-pulse">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default QuickAddExpense;
