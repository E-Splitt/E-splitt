import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';

const SettleUpModal = ({ isOpen, onClose, onSettle, participants, prefill }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    // Update state when prefill changes
    useEffect(() => {
        if (prefill) {
            setFrom(prefill.from?.id || '');
            setTo(prefill.to?.id || '');
            setAmount(prefill.amount?.toString() || '');
        }
    }, [prefill]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const amountFloat = parseFloat(amount);
        if (!from || !to || isNaN(amountFloat) || amountFloat <= 0) {
            alert('Please fill all required fields');
            return;
        }

        if (from === to) {
            alert('Payer and receiver must be different people');
            return;
        }

        const settlement = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            description: note || `Settlement: ${participants.find(p => p.id === from)?.name} paid ${participants.find(p => p.id === to)?.name}`,
            amount: amountFloat,
            paidBy: from,
            paidTo: to,
            category: 'settlement',
            shares: { [to]: amountFloat },
            isSettlement: true
        };

        onSettle(settlement);
        onClose();
        resetForm();
    };

    const resetForm = () => {
        setFrom('');
        setTo('');
        setAmount('');
        setNote('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From (Payer)</label>
                        <select
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select person</option>
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-gray-400">→</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To (Receiver)</label>
                        <select
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select person</option>
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Add a note..."
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <DollarSign size={20} />
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettleUpModal;
