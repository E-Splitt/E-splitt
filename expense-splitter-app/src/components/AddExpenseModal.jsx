import React, { useState, useEffect } from 'react';
import { X, Plus, Users, Edit } from 'lucide-react';
import { categories } from '../utils/categories';

const AddExpenseModal = ({ isOpen, onClose, onAdd, onEdit, participants, editExpense }) => {
    const isEditing = !!editExpense;

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [category, setCategory] = useState('other');
    const [splitType, setSplitType] = useState('equal');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [customSplits, setCustomSplits] = useState({});

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
        } else if (participants.length > 0 && !paidBy) {
            setPaidBy(participants[0].id);
            setSelectedParticipants(participants.map(p => p.id));
        }
    }, [editExpense, participants, paidBy]);

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

    const handleSubmit = (e) => {
        e.preventDefault();

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

        if (isEditing) {
            onEdit(expenseData);
        } else {
            onAdd(expenseData);
        }

        onClose();
        resetForm();
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setCategory('other');
        setSplitType('equal');
        setCustomSplits({});
    };

    if (!isOpen) return null;

    const shares = calculateShares();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {isEditing ? <><Edit size={20} /> Update Expense</> : <><Plus size={20} /> Add Expense</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExpenseModal;
