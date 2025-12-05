import React, { useState, useEffect } from 'react';
import { X, Plus, Users, Edit, Camera, Loader } from 'lucide-react';
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
    const [isSubmitting, setIsSubmitting] = useState(false); // For mobile fix

    useEffect(() => {
        if (editExpense) {
            setDescription(editExpense.description);
            setAmount(editExpense.amount.toString());
            setPaidBy(editExpense.paidBy);
            setCategory(editExpense.category || 'other');

            const shareUserIds = Object.keys(editExpense.shares || {});
            setSelectedParticipants(shareUserIds);

            // Check if it's equal split or custom
            const shares = Object.values(editExpense.shares || {});
            const isEqual = shares.every(s => Math.abs(s - shares[0]) < 0.01);
            setSplitType(isEqual ? 'equal' : 'exact');

            if (!isEqual) {
                setCustomSplits(editExpense.shares);
            }
        } else if (isOpen && participants.length > 0 && selectedParticipants.length === 0) {
            // Only set defaults when modal first opens and no participants selected
            setPaidBy(participants[0].id);
            setSelectedParticipants(participants.map(p => p.id));
        }
    }, [editExpense, isOpen]);

    const handleParticipantToggle = (userId) => {
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCustomSplitChange = (userId, value) => {
        setCustomSplits(prev => ({
            ...prev,
            [userId]: parseFloat(value) || 0
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
            const share = amountFloat / selected.length;
            selected.forEach(userId => shares[userId] = share);
        } else if (splitType === 'exact') {
            selected.forEach(userId => {
                shares[userId] = customSplits[userId] || 0;
            });
        }

        return shares;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // Prevent double submission

        const amountFloat = parseFloat(amount);
        if (!description || isNaN(amountFloat) || amountFloat <= 0 || selectedParticipants.length === 0) {
            alert('Please fill all fields and select at least one participant');
            return;
        }

        const shares = calculateShares();
        const totalShares = Object.values(shares).reduce((sum, val) => sum + val, 0);

        if (splitType === 'exact' && Math.abs(totalShares - amountFloat) > 0.01) {
            alert(`Shares must add up to ${amountFloat.toFixed(2)}. Current total: ${totalShares.toFixed(2)}`);
            return;
        }

        const expenseData = {
            id: editExpense?.id || Date.now(),
            date: editExpense?.date || new Date().toLocaleDateString(),
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
            alert('Failed to save expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setCategory('other');
        setSplitType('equal');
        setCustomSplits({});
        setReceiptImage(null);
        setIsSubmitting(false); // Reset for mobile
    };

    if (!isOpen) return null;

    const shares = calculateShares();

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {isEditing ? <><Edit size={20} /> Edit Expense</> : <><Plus size={20} /> Add New Expense</>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="What was this for?"
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {/* Receipt Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Camera size={16} />
                            Receipt (Optional)
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors">
                                        <Camera size={20} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">
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
                                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {isProcessingOCR && (
                                <div className="flex items-center gap-2 text-sm text-indigo-600">
                                    <Loader size={16} className="animate-spin" />
                                    Extracting amount from receipt...
                                </div>
                            )}
                            {receiptImage && (
                                <div className="relative">
                                    <img src={receiptImage} alt="Receipt" className="w-full max-h-32 object-contain rounded-lg border border-gray-200" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Paid By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
                        <select
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Split Between */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Users size={16} />
                            Split Between
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {participants.map(person => (
                                <label key={person.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedParticipants.includes(person.id)}
                                        onChange={() => handleParticipantToggle(person.id)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{person.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Split Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSplitType('equal')}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${splitType === 'equal'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                Equal
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitType('exact')}
                                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${splitType === 'exact'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                Exact Amounts
                            </button>
                        </div>
                    </div>

                    {/* Custom Splits */}
                    {splitType === 'exact' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Enter amounts for each person</label>
                            {selectedParticipants.map(userId => {
                                const person = participants.find(p => p.id === userId);
                                return (
                                    <div key={userId} className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700 w-32">{person?.name}</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                value={customSplits[userId] || ''}
                                                onChange={(e) => handleCustomSplitChange(userId, e.target.value)}
                                                className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Preview */}
                    {amount && selectedParticipants.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Split Preview</h4>
                            <div className="space-y-1">
                                {selectedParticipants.map(userId => {
                                    const person = participants.find(p => p.id === userId);
                                    const share = shares[userId] || 0;
                                    return (
                                        <div key={userId} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{person?.name}</span>
                                            <span className="font-medium text-gray-900">${share.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
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
