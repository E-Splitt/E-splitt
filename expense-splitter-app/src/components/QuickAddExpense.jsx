import React, { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createExpenseId } from '../utils/ids';

const QuickAddExpense = ({ onAdd, participants, currentUserId }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(currentUserId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const defaultPayer = participants.some(p => p.id === currentUserId)
        ? currentUserId
        : (participants[0]?.id || '');

    useEffect(() => {
        if (!participants.some(p => p.id === paidBy)) {
            setPaidBy(defaultPayer);
        }
    }, [participants, paidBy, defaultPayer]);

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
        if (!participants.some(p => p.id === paidBy)) {
            setError('Add a participant first');
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
        }

        const newExpense = {
            id: createExpenseId(),
            date: new Date().toLocaleDateString(),
            expenseDate: new Date().toISOString().split('T')[0],
            description: description.trim(),
            amount: amountFloat,
            paidBy,
            category: 'other',
            shares,
            isSettlement: false
        };

        try {
            setIsSubmitting(true);
            await onAdd(newExpense);
            setDescription('');
            setAmount('');
            setError('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1800);
        } catch (err) {
            console.error('QuickAdd failed:', err);
            setError('Failed to add expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="themed-card rounded-2xl p-4 sm:p-5"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                        <Sparkles size={14} />
                    </span>
                    <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                        Quick Split (Equal across {participants.length} {participants.length === 1 ? 'person' : 'people'})
                    </h3>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Quick expense description..."
                    className="themed-input flex-1 px-3.5 py-2.5 rounded-xl text-sm"
                    disabled={isSubmitting}
                />

                <div className="relative sm:w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm mono" style={{ color: 'var(--text-muted)' }}>$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="themed-input w-full pl-7 pr-3 py-2.5 rounded-xl text-sm mono"
                        disabled={isSubmitting}
                    />
                </div>

                {participants.length > 0 && (
                    <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="themed-select px-3 py-2.5 rounded-xl text-sm sm:w-36"
                        disabled={isSubmitting}
                    >
                        {participants.map(p => (
                            <option key={p.id} value={p.id}>Paid by {p.name}</option>
                        ))}
                    </select>
                )}

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="add-btn justify-center px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                    {isSubmitting ? (
                        <Loader size={16} className="animate-spin" />
                    ) : showSuccess ? (
                        <><Check size={16} /> Added</>
                    ) : (
                        <><Plus size={16} /> Split</>
                    )}
                </motion.button>
            </form>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex items-center gap-1.5 text-xs text-red-500 font-medium overflow-hidden"
                    >
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default QuickAddExpense;
