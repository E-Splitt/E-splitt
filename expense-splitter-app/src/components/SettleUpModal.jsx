import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowRightLeft, Info } from 'lucide-react';

const SettleUpModal = ({ isOpen, onClose, onSettle, participants, prefill }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (prefill) {
            setFrom(prefill.from?.id || '');
            setTo(prefill.to?.id || '');
            setAmount(prefill.amount?.toString() || '');
        }
    }, [prefill]);

    useEffect(() => {
        setError('');
    }, [from, to, amount]);

    const suggestedAmount = prefill?.amount;

    const handleSwap = () => {
        setFrom(to);
        setTo(from);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const amountFloat = parseFloat(amount);
        if (!from || !to) {
            setError('Select both a payer and receiver');
            return;
        }
        if (from === to) {
            setError('Payer and receiver must be different people');
            return;
        }
        if (isNaN(amountFloat) || amountFloat <= 0) {
            setError('Enter a valid amount');
            return;
        }

        const fromPerson = participants.find(p => p.id === from);
        const toPerson = participants.find(p => p.id === to);

        const settlement = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            description: note || `Settlement: ${fromPerson?.name} paid ${toPerson?.name}`,
            amount: amountFloat,
            paidBy: from,
            paidByName: fromPerson?.name,
            paidTo: to,
            paidToName: toPerson?.name,
            category: 'settlement',
            shares: { [to]: amountFloat },
            isSettlement: true
        };

        onSettle(settlement);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setFrom('');
        setTo('');
        setAmount('');
        setNote('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-xl shadow-xl w-full max-w-md themed-card" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center glass-strong" style={{ borderBottom: '1px solid var(--border-primary)', borderRadius: '12px 12px 0 0' }}>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Record Payment</h2>
                    <button onClick={onClose} className="hover:opacity-75" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* From */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>From (Payer)</label>
                        <select
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="themed-select w-full p-3 rounded-lg"
                        >
                            <option value="">Select person</option>
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Swap button */}
                    <div className="flex items-center justify-center">
                        <button
                            type="button"
                            onClick={handleSwap}
                            className="p-2 rounded-full hover:scale-110 transition-all"
                            style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}
                            title="Swap payer and receiver"
                        >
                            <ArrowRightLeft size={18} />
                        </button>
                    </div>

                    {/* To */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>To (Receiver)</label>
                        <select
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="themed-select w-full p-3 rounded-lg"
                        >
                            <option value="">Select person</option>
                            {participants.map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Amount</label>
                            {suggestedAmount && (
                                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-indigo)' }}>
                                    <Info size={12} />
                                    Suggested: ${suggestedAmount.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }}>$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="themed-input w-full p-3 pl-8 rounded-lg"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Note (Optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="themed-input w-full p-3 rounded-lg"
                            placeholder="Add a note..."
                        />
                    </div>

                    {/* Inline error */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

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
