import React, { useState } from 'react';
import { X, DollarSign, ArrowRightLeft, Info, QrCode, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createExpenseId } from '../utils/ids';

const SettleUpModal = ({ isOpen, onClose, onSettle, participants, prefill }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [prevPrefill, setPrevPrefill] = useState(null);
    const [swapRotation, setSwapRotation] = useState(0);
    const [showQr, setShowQr] = useState(false);

    if (prefill !== prevPrefill) {
        setPrevPrefill(prefill);
        if (prefill) {
            setFrom(prefill.fromId ?? prefill.from?.id ?? '');
            setTo(prefill.toId ?? prefill.to?.id ?? '');
            setAmount(prefill.amount?.toString() || '');
            setError('');
        }
    }

    const suggestedAmount = prefill?.amount;

    const withErrorReset = (setter) => (value) => {
        setter(value);
        setError('');
    };
    const changeFrom = withErrorReset(setFrom);
    const changeTo = withErrorReset(setTo);
    const changeAmount = withErrorReset(setAmount);

    const handleSwap = () => {
        setFrom(to);
        setTo(from);
        setError('');
        setSwapRotation(r => r + 180);
    };

    const fromPerson = participants.find(p => p.id === from);
    const toPerson = participants.find(p => p.id === to);
    const parsedAmt = parseFloat(amount) || 0;
    const memoText = encodeURIComponent(note || `E-Split settlement to ${toPerson?.name || 'group'}`);

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

        const settlement = {
            id: createExpenseId(),
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
        setShowQr(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className="rounded-2xl shadow-xl w-full max-w-md themed-card overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex justify-between items-center glass-strong" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                                Record Payment
                            </h2>
                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="icon-btn ghost"
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>From (Payer)</label>
                                <select
                                    value={from}
                                    onChange={(e) => changeFrom(e.target.value)}
                                    className="themed-select w-full p-3 rounded-xl"
                                >
                                    <option value="">Select person</option>
                                    {participants.map(person => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-center">
                                <motion.button
                                    type="button"
                                    onClick={handleSwap}
                                    animate={{ rotate: swapRotation }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.92 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className="p-2.5 rounded-full cursor-pointer border-none"
                                    style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}
                                    title="Swap payer and receiver"
                                >
                                    <ArrowRightLeft size={18} />
                                </motion.button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>To (Receiver)</label>
                                <select
                                    value={to}
                                    onChange={(e) => changeTo(e.target.value)}
                                    className="themed-select w-full p-3 rounded-xl"
                                >
                                    <option value="">Select person</option>
                                    {participants.map(person => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Amount</label>
                                    {suggestedAmount && (
                                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent-indigo)' }}>
                                            <Info size={12} />
                                            Suggested: ${suggestedAmount.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-3 mono" style={{ color: 'var(--text-muted)' }}>$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => changeAmount(e.target.value)}
                                        className="themed-input w-full p-3 pl-8 rounded-xl mono"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Note (Optional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="themed-input w-full p-3 rounded-xl"
                                    placeholder="Add a note..."
                                />
                            </div>

                            {/* Feature 4: Instant Payment Deep Links & QR Code */}
                            <div className="pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--line)' }}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                                        Instant Payment Rails
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowQr(q => !q)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer bg-transparent border-none"
                                        style={{ color: 'var(--teal)' }}
                                    >
                                        <QrCode size={13} /> {showQr ? 'Hide QR' : 'Show Pay QR'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <a
                                        href={`mailto:${toPerson?.email || ''}?subject=Interac%20e-Transfer%20$${parsedAmt.toFixed(2)}&body=${memoText}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 no-underline hover:opacity-85"
                                        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)', color: 'var(--ink)' }}
                                    >
                                        Interac <ExternalLink size={11} />
                                    </a>
                                    <a
                                        href={`https://venmo.com/?txn=pay&amount=${parsedAmt.toFixed(2)}&note=${memoText}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 no-underline hover:opacity-85"
                                        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)', color: 'var(--ink)' }}
                                    >
                                        Venmo <ExternalLink size={11} />
                                    </a>
                                    <a
                                        href={`https://www.paypal.com/myaccount/transfer/homepage`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 no-underline hover:opacity-85"
                                        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)', color: 'var(--ink)' }}
                                    >
                                        PayPal <ExternalLink size={11} />
                                    </a>
                                    <a
                                        href={`https://cash.app/`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 no-underline hover:opacity-85"
                                        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)', color: 'var(--ink)' }}
                                    >
                                        Cash App <ExternalLink size={11} />
                                    </a>
                                </div>

                                <AnimatePresence>
                                    {showQr && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                                                <svg width="64" height="64" viewBox="0 0 64 64" className="rounded-lg border p-1 bg-white flex-shrink-0">
                                                    <rect x="4" y="4" width="18" height="18" fill="#0F172A" />
                                                    <rect x="7" y="7" width="12" height="12" fill="#FFF" />
                                                    <rect x="10" y="10" width="6" height="6" fill="#4F46E5" />
                                                    <rect x="42" y="4" width="18" height="18" fill="#0F172A" />
                                                    <rect x="45" y="7" width="12" height="12" fill="#FFF" />
                                                    <rect x="48" y="10" width="6" height="6" fill="#4F46E5" />
                                                    <rect x="4" y="42" width="18" height="18" fill="#0F172A" />
                                                    <rect x="7" y="45" width="12" height="12" fill="#FFF" />
                                                    <rect x="10" y="48" width="6" height="6" fill="#4F46E5" />
                                                    <rect x="26" y="8" width="4" height="4" fill="#0F172A" />
                                                    <rect x="34" y="12" width="4" height="8" fill="#0F172A" />
                                                    <rect x="26" y="24" width="12" height="4" fill="#4F46E5" />
                                                    <rect x="12" y="28" width="8" height="4" fill="#0F172A" />
                                                    <rect x="28" y="34" width="6" height="6" fill="#0F172A" />
                                                    <rect x="40" y="28" width="16" height="4" fill="#0F172A" />
                                                    <rect x="44" y="38" width="6" height="10" fill="#4F46E5" />
                                                    <rect x="26" y="48" width="12" height="4" fill="#0F172A" />
                                                    <rect x="52" y="50" width="8" height="8" fill="#0F172A" />
                                                </svg>
                                                <div className="text-xs">
                                                    <div className="font-bold">Scan to Pay {toPerson?.name || 'Receiver'}</div>
                                                    <div className="mono font-semibold" style={{ color: 'var(--moss)' }}>${parsedAmt.toFixed(2)}</div>
                                                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                                        Pre-fills amount & E-Split settlement reference
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 cursor-pointer border-none"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                                >
                                    <DollarSign size={18} />
                                    Record Payment
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettleUpModal;
