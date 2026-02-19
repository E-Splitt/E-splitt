import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Users, Edit, Camera, Loader, CheckSquare, Square } from 'lucide-react';
import { categories } from '../utils/categories';
import Tesseract from 'tesseract.js';

const AddExpenseModal = ({ isOpen, onClose, onAdd, onEdit, participants, editExpense }) => {
    const isEditing = !!editExpense;

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [category, setCategory] = useState('other');
    const [splitType, setSplitType] = useState('equal');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [customSplits, setCustomSplits] = useState({});
    const [receiptImage, setReceiptImage] = useState(null);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        if (editExpense) {
            setDescription(editExpense.description);
            setAmount(editExpense.amount.toString());
            setPaidBy(editExpense.paidBy);
            setCategory(editExpense.category || 'other');
            setExpenseDate(editExpense.expenseDate || new Date().toISOString().split('T')[0]);

            const shareUserIds = Object.keys(editExpense.shares || {});
            setSelectedParticipants(shareUserIds);

            const shares = Object.values(editExpense.shares || {});
            const isEqual = shares.every(s => Math.abs(s - shares[0]) < 0.01);
            setSplitType(isEqual ? 'equal' : 'exact');

            if (!isEqual) {
                const initialSplits = {};
                for (const [uid, val] of Object.entries(editExpense.shares || {})) {
                    initialSplits[uid] = val.toString();
                }
                setCustomSplits(initialSplits);
            }
        } else if (isOpen && participants.length > 0 && selectedParticipants.length === 0) {
            setPaidBy(participants[0].id);
            const uniqueIds = [...new Set(participants.map(p => p.id))];
            setSelectedParticipants(uniqueIds);
        }
    }, [editExpense, isOpen]);

    // Clear errors when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setTouched({});
        }
    }, [isOpen]);

    // Real-time validation
    useEffect(() => {
        const newErrors = {};
        if (touched.description && !description.trim()) newErrors.description = 'Description is required';
        if (touched.amount) {
            const amt = parseFloat(amount);
            if (!amount) newErrors.amount = 'Amount is required';
            else if (isNaN(amt) || amt <= 0) newErrors.amount = 'Enter a valid amount';
        }
        if (touched.participants && selectedParticipants.length === 0) newErrors.participants = 'Select at least one person';
        setErrors(newErrors);
    }, [description, amount, selectedParticipants, touched]);

    const handleParticipantToggle = (userId) => {
        setTouched(prev => ({ ...prev, participants: true }));
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleSelectAll = () => {
        setTouched(prev => ({ ...prev, participants: true }));
        const uniqueIds = [...new Set(participants.map(p => p.id))];
        if (selectedParticipants.length === uniqueIds.length) {
            setSelectedParticipants([]);
        } else {
            setSelectedParticipants(uniqueIds);
        }
    };

    const handleCustomSplitChange = (userId, value) => {
        setCustomSplits(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const handleReceiptUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setReceiptImage(event.target?.result);
        };
        reader.readAsDataURL(file);

        setIsProcessingOCR(true);
        try {
            const result = await Tesseract.recognize(file, 'eng');
            const text = result.data.text;

            const amountPattern = /total[:\s]*\$?([\d,]+\.\d{2})/i;
            const match = text.match(amountPattern);
            if (match) {
                const cleanAmount = match[1].replace(/,/g, '');
                setAmount(cleanAmount);
            }
        } catch (error) {
            console.error('OCR Error:', error);
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const calculateShares = () => {
        const shares = {};
        const amountFloat = parseFloat(amount) || 0;
        const selected = selectedParticipants;

        if (splitType === 'equal') {
            if (selected.length > 0) {
                const share = amountFloat / selected.length;
                selected.forEach(userId => shares[userId] = share);
            }
        } else if (splitType === 'exact') {
            selected.forEach(userId => {
                shares[userId] = parseFloat(customSplits[userId]) || 0;
            });
        }

        return shares;
    };

    // Remainder calculation for exact splits
    const splitRemainder = useMemo(() => {
        if (splitType !== 'exact') return null;
        const amountFloat = parseFloat(amount) || 0;
        const totalSplit = selectedParticipants.reduce((sum, uid) => sum + (parseFloat(customSplits[uid]) || 0), 0);
        return amountFloat - totalSplit;
    }, [splitType, amount, customSplits, selectedParticipants]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate all fields
        setTouched({ description: true, amount: true, participants: true });

        const amountFloat = parseFloat(amount);
        if (!description.trim() || isNaN(amountFloat) || amountFloat <= 0 || selectedParticipants.length === 0) {
            return;
        }

        const shares = calculateShares();
        const totalShares = Object.values(shares).reduce((sum, val) => sum + val, 0);

        if (splitType === 'exact' && Math.abs(totalShares - amountFloat) > 0.01) {
            setErrors(prev => ({ ...prev, splits: `Shares must equal $${amountFloat.toFixed(2)}. Current: $${totalShares.toFixed(2)}` }));
            return;
        }

        const expenseData = {
            id: editExpense?.id || Date.now(),
            date: editExpense?.date || new Date().toLocaleDateString(),
            expenseDate: expenseDate,
            description,
            amount: amountFloat,
            paidBy,
            category,
            shares,
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
        setSelectedParticipants([]);
        setCategory('other');
        setSplitType('equal');
        setCustomSplits({});
        setReceiptImage(null);
        setIsSubmitting(false);
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setErrors({});
        setTouched({});
    };

    if (!isOpen) return null;

    const shares = calculateShares();
    const allSelected = selectedParticipants.length === [...new Set(participants.map(p => p.id))].length;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto themed-card" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 p-6 flex justify-between items-center z-10 glass-strong" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {isEditing ? <><Edit size={20} /> Edit Expense</> : <><Plus size={20} /> Add New Expense</>}
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="hover:opacity-75">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                            className={`themed-input w-full p-3 rounded-lg ${errors.description ? 'ring-2 ring-red-400' : ''}`}
                            placeholder="What was this for?"
                        />
                        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }}>$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
                                className={`themed-input w-full p-3 pl-8 rounded-lg ${errors.amount ? 'ring-2 ring-red-400' : ''}`}
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
                    </div>

                    {/* Expense Date */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Date</label>
                        <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="themed-input w-full p-3 rounded-lg"
                            required
                        />
                    </div>

                    {/* Receipt Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Camera size={16} />
                            Receipt (Optional)
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'var(--border-primary)' }}>
                                        <Camera size={20} style={{ color: 'var(--text-muted)' }} />
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {receiptImage ? 'Change Receipt' : 'Upload Receipt'}
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReceiptUpload}
                                        className="hidden"
                                    />
                                </label>
                                {receiptImage && (
                                    <button
                                        type="button"
                                        onClick={() => setReceiptImage(null)}
                                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {isProcessingOCR && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-indigo)' }}>
                                    <Loader size={16} className="animate-spin" />
                                    Extracting amount from receipt...
                                </div>
                            )}
                            {receiptImage && (
                                <div className="relative">
                                    <img src={receiptImage} alt="Receipt" className="w-full max-h-32 object-contain rounded-lg" style={{ border: '1px solid var(--border-primary)' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category — Icon Grid */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Category</label>
                        <div className="grid grid-cols-5 gap-2">
                            {categories.map(cat => {
                                const CatIcon = cat.icon;
                                const isSelected = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all ${isSelected ? 'ring-2 scale-105' : 'hover:scale-105'}`}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                                            border: `1px solid ${isSelected ? 'var(--accent-indigo)' : 'var(--border-secondary)'}`,
                                            ringColor: isSelected ? 'var(--accent-indigo)' : undefined,
                                            color: 'var(--text-primary)'
                                        }}
                                        title={cat.name}
                                    >
                                        <div className={`p-1.5 rounded-md ${cat.color}`}>
                                            <CatIcon size={16} />
                                        </div>
                                        <span className="text-[10px] leading-tight text-center truncate w-full" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {cat.name.split(' ')[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Paid By */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Paid By</label>
                        <select
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            className="themed-input w-full p-3 rounded-lg"
                        >
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Split Between */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                <Users size={16} />
                                Split Between
                            </label>
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                                style={{ color: 'var(--accent-indigo)' }}
                            >
                                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {participants.map(person => (
                                <label key={person.id} className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all" style={{
                                    border: `1px solid ${selectedParticipants.includes(person.id) ? 'var(--accent-indigo)' : 'var(--border-primary)'}`,
                                    backgroundColor: selectedParticipants.includes(person.id) ? 'var(--bg-card-hover)' : 'transparent'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedParticipants.includes(person.id)}
                                        onChange={() => handleParticipantToggle(person.id)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ backgroundColor: person.color || '#6366f1' }}
                                    >
                                        {person.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{person.name}</span>
                                </label>
                            ))}
                        </div>
                        {errors.participants && <p className="text-red-400 text-xs mt-1">{errors.participants}</p>}
                    </div>

                    {/* Split Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Split Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSplitType('equal')}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors font-medium ${splitType === 'equal'
                                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-400'
                                    : ''
                                    }`}
                                style={splitType !== 'equal' ? { borderColor: 'var(--border-primary)', color: 'var(--text-primary)' } : {}}
                            >
                                Equal
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitType('exact')}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors font-medium ${splitType === 'exact'
                                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-400'
                                    : ''
                                    }`}
                                style={splitType !== 'exact' ? { borderColor: 'var(--border-primary)', color: 'var(--text-primary)' } : {}}
                            >
                                Exact Amounts
                            </button>
                        </div>
                    </div>

                    {/* Custom Splits with remainder */}
                    {splitType === 'exact' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Enter amounts for each person</label>
                            {selectedParticipants.map(userId => {
                                const person = participants.find(p => p.id === userId);
                                return (
                                    <div key={userId} className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                            style={{ backgroundColor: person?.color || '#6366f1' }}
                                        >
                                            {person?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium w-28 truncate" style={{ color: 'var(--text-primary)' }}>{person?.name}</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2" style={{ color: 'var(--text-muted)' }}>$</span>
                                            <input
                                                type="number"
                                                value={customSplits[userId] || ''}
                                                onChange={(e) => handleCustomSplitChange(userId, e.target.value)}
                                                className="themed-input w-full p-2 pl-8 rounded-lg"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Remainder indicator */}
                            {amount && splitRemainder !== null && (
                                <div className={`flex items-center justify-between p-2 rounded-lg text-sm font-medium ${Math.abs(splitRemainder) < 0.01
                                        ? 'bg-green-500/10 text-green-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                    <span>{Math.abs(splitRemainder) < 0.01 ? '✓ Fully allocated' : 'Remaining to allocate'}</span>
                                    <span>${Math.abs(splitRemainder).toFixed(2)}</span>
                                </div>
                            )}
                            {errors.splits && <p className="text-red-400 text-xs">{errors.splits}</p>}
                        </div>
                    )}

                    {/* Preview */}
                    {amount && selectedParticipants.length > 0 && splitType === 'equal' && (
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Split Preview</h4>
                            <div className="space-y-1">
                                {selectedParticipants.map(userId => {
                                    const person = participants.find(p => p.id === userId);
                                    const share = shares[userId] || 0;
                                    return (
                                        <div key={userId} className="flex justify-between text-sm">
                                            <span style={{ color: 'var(--text-secondary)' }}>{person?.name}</span>
                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>${share.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Submit error */}
                    {errors.submit && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm text-center">
                            {errors.submit}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Saving...
                                </>
                            ) : isEditing ? (
                                <><Edit size={20} /> Update Expense</>
                            ) : (
                                <><Plus size={20} /> Add Expense</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExpenseModal;
