import React, { useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';

const QuickAddExpense = ({ onAdd, participants }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        const amountFloat = parseFloat(amount);

        // Validate paidBy exists in participants
        const payerExists = participants.some(p => p.id === paidBy);

        if (!description || isNaN(amountFloat) || amountFloat <= 0 || !paidBy || !payerExists) {
            if (!payerExists && participants.length > 0) {
                setPaidBy(participants[0].id); // Reset to valid user
                alert("Please select a valid payer.");
            }
            return;
        }

        // Auto-split equally among all participants
        const share = amountFloat / participants.length;
        const shares = {};
        participants.forEach(p => shares[p.id] = share);

        const newExpense = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            description,
            amount: amountFloat,
            paidBy,
            category: 'other',
            shares,
            isSettlement: false
        };

        onAdd(newExpense);
        setDescription('');
        setAmount('');
    };

    // Set default payer to first participant
    React.useEffect(() => {
        if (participants.length > 0 && !paidBy) {
            setPaidBy(participants[0].id);
        }
    }, [participants, paidBy]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Plus size={16} />
                Quick Add Expense
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                />
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full p-2 pl-7 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                    />
                </div>
                <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    {participants.map(person => (
                        <option key={person.id} value={person.id}>{person.name} paid</option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Add & Split
                </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
                Amount will be split equally among all {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
};

export default QuickAddExpense;
