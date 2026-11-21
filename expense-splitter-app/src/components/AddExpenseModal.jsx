import { allocateCents, expenseAllocation, toCents } from '../utils/splitLogic';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
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

const AddExpenseModal = ({ isOpen, onClose, onAdd, onEdit, participants, editExpense, archivePeriod }) => {
    const isEditing = !!editExpense;

    const [archiveDate, setArchiveDate] = useState('');
    const archiveExpenseId = useRef(null);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [category, setCategory] = useState('other');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [splitMode, setSplitMode] = useState('equal');
    const [customValues, setCustomValues] = useState({});
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState('monthly');
    const [splitChanged, setSplitChanged] = useState(false);
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

            const shareUserIds = Object.keys(editExpense.shares || {});
            setSelectedParticipants(shareUserIds);
            const legacy = editExpense.shares || {};
            const legacyTotal = Object.values(legacy).reduce((sum, value) => sum + toCents(value), 0);
            setCustomValues(editExpense.splitInputs ?? (editExpense.splitMode === 'percent'
                ? Object.fromEntries(shareUserIds.map(id => [id, legacyTotal ? toCents(legacy[id]) * 100 / legacyTotal : 0])) : legacy));
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
            setSplitChanged(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && archivePeriod) {
            setArchiveDate(format(new Date(archivePeriod.end_date || archivePeriod.closed_at || Date.now()), 'yyyy-MM-dd'));
            archiveExpenseId.current = null;
        }
    }, [archivePeriod, isOpen]);

    const handleSplitModeChange = (mode) => {
        setSplitChanged(true);
        setSplitMode(mode);
        const amt = parseFloat(amount) || 0;
        const next = mode === 'percent' ? allocateCents(10000, selectedParticipants)
            : mode === 'exact' ? allocateCents(toCents(amt), selectedParticipants)
            : Object.fromEntries(selectedParticipants.map(id => [id, 1]));
        setCustomValues(next);
    };

    const handleCustomValueChange = (userId, rawVal) => {
        setSplitChanged(true);
        const val = parseFloat(rawVal);
        setCustomValues(prev => ({
            ...prev,
            [userId]: isNaN(val) ? 0 : val
        }));
    };

    const { computedShares, allocationStatus } = useMemo(
        () => expenseAllocation(amount, selectedParticipants, splitMode, customValues),
        [amount, selectedParticipants, splitMode, customValues]);

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
        setSplitChanged(true);
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

        if (archivePeriod && !archiveDate) {
            setErrors(prev => ({ ...prev, submit: 'Enter the expense date.' }));
            return;
        }
        if (archivePeriod && !archiveExpenseId.current) archiveExpenseId.current = createExpenseId();

        const expenseData = {
            id: editExpense?.id ?? (archivePeriod ? archiveExpenseId.current : createExpenseId()),
            date: editExpense?.date || (archivePeriod ? archiveDate : new Date().toLocaleDateString()),
            expenseDate: editExpense?.expenseDate || (archivePeriod ? archiveDate : new Date().toISOString().split('T')[0]),
            description,
            amount: amountFloat,
            paidBy,
            category: category,
            shares: isEditing && !splitChanged && editExpense.amount === amountFloat &&
                Object.values(editExpense.shares || {}).reduce((sum, share) => sum + toCents(share), 0) === toCents(amountFloat)
                ? editExpense.shares : computedShares,
            splitInputs: Object.fromEntries(selectedParticipants.map(id => [id, customValues[id] ?? 0])),
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
            setErrors(prev => ({ ...prev, submit: archivePeriod || editExpense?.periodId ? error.message : 'Failed to save. Please try again.' }));
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
                                <span>{isEditing ? 'Edit expense' : archivePeriod ? 'Add archived expense' : 'New expense'}</span>
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

                        {archivePeriod && (
                            <label className="field-label block mb-3">
                                Expense date · {archivePeriod.name}
                                <input type="date" className="field" value={archiveDate}
                                    onChange={e => setArchiveDate(e.target.value)} />
                            </label>
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
                                <><Wallet size={16} /> {isEditing ? 'Save Changes' : archivePeriod ? 'Add to archive' : 'Add to the tab'}</>
                            )}
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddExpenseModal;
