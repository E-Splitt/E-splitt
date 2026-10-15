import React, { useState, useEffect, useMemo } from 'react';
import { createExpenseId } from '../utils/ids';
import { X, Loader, Check, Receipt, Wallet, Repeat, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getParticipantHue } from '../utils/colors';
import { categories } from '../utils/categories';

const SPLIT_MODES = [
    { id: 'equal', label: '= Equal' },
    { id: 'exact', label: '$ Exact' },
    { id: 'percent', label: '% Percent' },
    { id: 'shares', label: '1x Shares' },
];

const AddExpenseModal = ({ isOpen, onClose, onAdd, onEdit, participants, editExpense }) => {
    const isEditing = !!editExpense;

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [category, setCategory] = useState('other');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [splitMode, setSplitMode] = useState('equal');
    const [customValues, setCustomValues] = useState({});
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState('monthly');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        if (editExpense) {
            setDescription(editExpense.description);
            setAmount(editExpense.amount.toString());
            setPaidBy(editExpense.paidBy);
            setCategory(editExpense.category || 'other');
            setSplitMode(editExpense.splitMode || 'equal');
            setIsRecurring(!!editExpense.isRecurring);
            setRecurringInterval(editExpense.recurringInterval || 'monthly');

            const shareUserIds = Object.keys(editExpense.shares || {}).filter(id => editExpense.shares[id] > 0);
            setSelectedParticipants(shareUserIds);
            setCustomValues(editExpense.shares || {});
        } else if (isOpen && participants.length > 0) {
            setPaidBy(participants[0].id);
            const uniqueIds = [...new Set(participants.map(p => p.id))];
            setSelectedParticipants(uniqueIds);
            setSplitMode('equal');
            setIsRecurring(false);
            setRecurringInterval('monthly');
            const initialShares = {};
            uniqueIds.forEach(id => { initialShares[id] = 1; });
            setCustomValues(initialShares);
        }
    }, [editExpense, isOpen, participants]);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setTouched({});
        }
    }, [isOpen]);

    const handleSplitModeChange = (mode) => {
        setSplitMode(mode);
        const amt = parseFloat(amount) || 0;
        const count = Math.max(1, selectedParticipants.length);
        const next = {};
        selectedParticipants.forEach((id) => {
            if (mode === 'exact') next[id] = +(amt / count).toFixed(2);
            else if (mode === 'percent') next[id] = +(100 / count).toFixed(1);
            else if (mode === 'shares') next[id] = 1;
        });
        setCustomValues(next);
    };

    const handleCustomValueChange = (userId, rawVal) => {
        const val = parseFloat(rawVal);
        setCustomValues(prev => ({
            ...prev,
            [userId]: isNaN(val) ? 0 : val
        }));
    };

    const { computedShares, allocationStatus } = useMemo(() => {
        const shares = {};
        const amountFloat = parseFloat(amount) || 0;
        const totalCents = Math.round(amountFloat * 100);
        const selected = selectedParticipants;

        if (selected.length === 0 || amountFloat <= 0) {
            return { computedShares: shares, allocationStatus: { valid: true, text: '' } };
        }

        if (splitMode === 'equal') {
            const baseShareCents = Math.floor(totalCents / selected.length);
            let remainderCents = totalCents % selected.length;
            selected.forEach(userId => {
                let shareCents = baseShareCents;
                if (remainderCents > 0) {
                    shareCents += 1;
                    remainderCents -= 1;
                }
                shares[userId] = shareCents / 100;
            });
            return {
                computedShares: shares,
                allocationStatus: { valid: true, text: `$${(amountFloat / selected.length).toFixed(2)} / person` }
            };
        }

        if (splitMode === 'exact') {
            let sum = 0;
            selected.forEach(id => {
                const v = Math.max(0, parseFloat(customValues[id]) || 0);
                shares[id] = +v.toFixed(2);
                sum += shares[id];
            });
            const diff = +(amountFloat - sum).toFixed(2);
            return {
                computedShares: shares,
                allocationStatus: {
                    valid: Math.abs(diff) <= 0.02,
                    text: Math.abs(diff) <= 0.02
                        ? 'Exact total matched ✓'
                        : diff > 0
                        ? `$${diff.toFixed(2)} left to assign`
                        : `$${Math.abs(diff).toFixed(2)} over total`
                }
            };
        }

        if (splitMode === 'percent') {
            let pctSum = 0;
            selected.forEach(id => {
                const pct = Math.max(0, parseFloat(customValues[id]) || 0);
                pctSum += pct;
                shares[id] = +((amountFloat * pct) / 100).toFixed(2);
            });
            const diff = +(100 - pctSum).toFixed(1);
            return {
                computedShares: shares,
                allocationStatus: {
                    valid: Math.abs(diff) <= 0.5,
                    text: Math.abs(diff) <= 0.5 ? '100% allocated ✓' : `${pctSum.toFixed(1)}% / 100%`
                }
            };
        }

        // shares mode (1x, 2x, etc.)
        let totalUnits = 0;
        selected.forEach(id => {
            totalUnits += Math.max(0, parseFloat(customValues[id]) || 0);
        });
        if (totalUnits <= 0) totalUnits = selected.length;
        selected.forEach(id => {
            const units = Math.max(0, parseFloat(customValues[id]) || 0);
            shares[id] = +((amountFloat * units) / totalUnits).toFixed(2);
        });
        return {
            computedShares: shares,
            allocationStatus: { valid: true, text: `${totalUnits} total share units` }
        };
    }, [amount, selectedParticipants, splitMode, customValues]);

    useEffect(() => {
        const newErrors = {};
        if (touched.description && !description.trim()) newErrors.description = 'Description is required';
        if (touched.amount) {
            const amt = parseFloat(amount);
            if (!amount) newErrors.amount = 'Amount is required';
            else if (isNaN(amt) || amt <= 0) newErrors.amount = 'Enter a valid amount';
        }
        if (touched.participants && selectedParticipants.length === 0) newErrors.participants = 'Select at least one person';
        if (!allocationStatus.valid) newErrors.split = allocationStatus.text;
        setErrors(newErrors);
    }, [description, amount, selectedParticipants, touched, allocationStatus]);

    const handleParticipantToggle = (userId) => {
        setTouched(prev => ({ ...prev, participants: true }));
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setTouched({ description: true, amount: true, participants: true });

        const amountFloat = parseFloat(amount);
        if (!description.trim() || isNaN(amountFloat) || amountFloat <= 0 || selectedParticipants.length === 0 || !allocationStatus.valid) {
            return;
        }

        const expenseData = {
            id: editExpense?.id || createExpenseId(),
            date: editExpense?.date || new Date().toLocaleDateString(),
            expenseDate: editExpense?.expenseDate || new Date().toISOString().split('T')[0],
            description,
            amount: amountFloat,
            paidBy,
            category: category,
            shares: computedShares,
            splitMode,
            isRecurring,
            recurringInterval: isRecurring ? recurringInterval : null,
            isSettlement: false
        };

        try {
            setIsSubmitting(true);
            if (isEditing) {
                await onEdit(expenseData);
            } else {
                await onAdd(expenseData);
            }
            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving expense:', error);
            setErrors(prev => ({ ...prev, submit: 'Failed to save. Please try again.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setPaidBy('');
        setCategory('other');
        setSelectedParticipants([]);
        setSplitMode('equal');
        setIsRecurring(false);
        setIsSubmitting(false);
        setErrors({});
        setTouched({});
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="overlay"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <motion.div
                        className="modal"
                        style={{ maxWidth: 480 }}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.94, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    >
                        <div className="modal-head">
                            <div className="modal-title">
                                <span className="p-2 rounded-xl" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                                    <Receipt size={18} />
                                </span>
                                <span>{isEditing ? 'Edit expense' : 'New expense'}</span>
                            </div>
                            <motion.button className="icon-btn ghost" onClick={onClose} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}>
                                <X size={18} />
                            </motion.button>
                        </div>

                        {errors.submit && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                                {errors.submit}
                            </div>
                        )}

                        <label className="field-label">What was it for?</label>
                        <input
                            className={`field ${errors.description && touched.description ? 'border-red-500' : ''}`}
                            placeholder="e.g. Firewood, Airbnb, Monthly Internet"
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); setTouched(prev => ({ ...prev, description: true })); }}
                        />
                        {errors.description && touched.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="field-label">Amount ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`field mono ${errors.amount && touched.amount ? 'border-red-500' : ''}`}
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setTouched(prev => ({ ...prev, amount: true })); }}
                                />
                                {errors.amount && touched.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                            </div>

                            <div>
                                <label className="field-label">Recurring / Subscription</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRecurring(r => !r)}
                                        className={`field flex items-center justify-center gap-1.5 font-semibold text-xs cursor-pointer ${isRecurring ? 'border-indigo-500' : ''}`}
                                        style={{
                                            backgroundColor: isRecurring ? 'var(--teal-soft)' : 'var(--bg-input)',
                                            color: isRecurring ? 'var(--teal)' : 'var(--muted)'
                                        }}
                                    >
                                        <Repeat size={14} />
                                        <span>{isRecurring ? 'Recurring: ON' : 'One-time'}</span>
                                    </button>
                                    {isRecurring && (
                                        <select
                                            value={recurringInterval}
                                            onChange={(e) => setRecurringInterval(e.target.value)}
                                            className="field text-xs py-2.5"
                                            style={{ width: 105 }}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>

                        <label className="field-label">Category</label>
                        <div className="chip-row overflow-x-auto flex-nowrap no-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
                            {categories.map((cat) => {
                                const CatIcon = cat.icon;
                                return (
                                    <motion.button
                                        key={cat.id}
                                        type="button"
                                        className={`person-chip flex-shrink-0 ${category === cat.id ? "selected" : ""}`}
                                        onClick={() => setCategory(cat.id)}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <CatIcon size={14} /> {cat.name}
                                    </motion.button>
                                );
                            })}
                        </div>

                        <label className="field-label">Paid by</label>
                        <div className="chip-row">
                            {participants.map((p, idx) => (
                                <motion.button
                                    key={p.id}
                                    type="button"
                                    className={`person-chip ${paidBy === p.id ? "selected" : ""}`}
                                    onClick={() => setPaidBy(p.id)}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 22, height: 22, fontSize: 10 }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    {p.name}
                                </motion.button>
                            ))}
                        </div>

                        {/* Split Mode Selector */}
                        <div className="flex items-center justify-between mt-4 mb-2">
                            <label className="field-label m-0 flex items-center gap-1.5">
                                <Sliders size={13} /> Split Method
                            </label>
                            {allocationStatus.text && (
                                <span
                                    className="text-[11px] mono font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: allocationStatus.valid ? 'var(--moss-soft)' : 'var(--coral-soft)',
                                        color: allocationStatus.valid ? 'var(--moss)' : 'var(--coral)'
                                    }}
                                >
                                    {allocationStatus.text}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border mb-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                            {SPLIT_MODES.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSplitModeChange(m.id)}
                                    className="py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer border-none transition-colors"
                                    style={{
                                        backgroundColor: splitMode === m.id ? 'var(--teal)' : 'transparent',
                                        color: splitMode === m.id ? '#fff' : 'var(--muted)'
                                    }}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <label className="field-label">Split between</label>
                        <div className="chip-row">
                            {participants.map((p, idx) => (
                                <motion.button
                                    key={p.id}
                                    type="button"
                                    className={`person-chip ${selectedParticipants.includes(p.id) ? "selected" : ""}`}
                                    onClick={() => handleParticipantToggle(p.id)}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 22, height: 22, fontSize: 10 }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    {p.name}
                                    {selectedParticipants.includes(p.id) && <Check size={13} />}
                                </motion.button>
                            ))}
                        </div>

                        {/* Custom Split Inputs when mode !== 'equal' */}
                        <AnimatePresence>
                            {splitMode !== 'equal' && selectedParticipants.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 space-y-2 overflow-hidden"
                                >
                                    {selectedParticipants.map((uid) => {
                                        const person = participants.find(p => p.id === uid);
                                        if (!person) return null;
                                        return (
                                            <div key={uid} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                                                <span className="text-xs font-semibold">{person.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={customValues[uid] ?? ''}
                                                        onChange={(e) => handleCustomValueChange(uid, e.target.value)}
                                                        className="field mono text-xs py-1 px-2.5 text-right"
                                                        style={{ width: 90 }}
                                                    />
                                                    <span className="text-xs mono" style={{ color: 'var(--muted)', minWidth: 58, textAlign: 'right' }}>
                                                        {splitMode === 'exact' ? '$' : splitMode === 'percent' ? `% ($${(computedShares[uid] || 0).toFixed(2)})` : `x ($${(computedShares[uid] || 0).toFixed(2)})`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {errors.participants && touched.participants && <p className="text-red-500 text-xs mt-1">{errors.participants}</p>}

                        <motion.button
                            className="add-btn full"
                            onClick={handleSubmit}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting || !allocationStatus.valid}
                            style={{ marginTop: 22 }}
                        >
                            {isSubmitting ? (
                                <><Loader size={16} className="animate-spin" /> Saving...</>
                            ) : (
                                <><Wallet size={16} /> {isEditing ? 'Save Changes' : 'Add to the tab'}</>
                            )}
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddExpenseModal;
