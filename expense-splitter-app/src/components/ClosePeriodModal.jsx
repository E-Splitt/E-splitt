import React, { useState } from 'react';
import { X, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';

const ClosePeriodModal = ({
    isOpen,
    onClose,
    balances = {},
    settlements = [],
    totalExpenses = 0,
    transactionCount = 0,

    expenses = [],
    participants = [],
    onConfirm
}) => {
    const [periodName, setPeriodName] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    if (!isOpen) return null;

    const formatDate = (date) => {
        if (!date) return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleClose = async () => {
        setIsClosing(true);
        try {
            let dateRange = formatDate(new Date());

            if (expenses && expenses.length > 0) {
                const dates = expenses.map(e => new Date(e.expenseDate || e.date)).filter(d => !isNaN(d));
                if (dates.length > 0) {
                    const minDate = new Date(Math.min(...dates));
                    const startDateStr = formatDate(minDate);
                    const endDateStr = formatDate(new Date());

                    if (startDateStr !== endDateStr) {
                        dateRange = `${startDateStr} - ${endDateStr}`;
                    }
                }
            }
            const generatedName = `Settlement (${dateRange})`;

            await onConfirm(periodName || generatedName);
            onClose();
        } catch (error) {
            console.error('Error closing period:', error);
            alert('Failed to close period. Please try again.');
        } finally {
            setIsClosing(false);
        }
    };

    const getParticipantName = (userId) => {
        const participant = participants.find(p => p.id === userId);
        return participant?.name || 'Unknown';
    };

    const hasOutstandingBalances = settlements.length > 0;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay">
            <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto themed-card">
                {/* Header */}
                <div className="flex items-center justify-between p-6 glass-strong" style={{ borderBottom: '1px solid var(--border-primary)', borderRadius: '8px 8px 0 0' }}>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Close Settlement Period</h2>
                    <button
                        onClick={onClose}
                        className="transition-colors hover:opacity-75"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Warning if balances exist */}
                    {hasOutstandingBalances && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                            <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">Outstanding Balances</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    There are unsettled balances in this period. Closing will save these balances for reference, but they won't carry over to the next period.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Period Summary */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Period Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    <DollarSign size={16} />
                                    <span className="text-sm font-medium">Total Expenses</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${totalExpenses.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    <TrendingUp size={16} />
                                    <span className="text-sm font-medium">Transactions</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{transactionCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Final Balances */}
                    {Object.keys(balances).length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Final Balances</h3>
                            <div className="space-y-2">
                                {Object.entries(balances).map(([userId, balance]) => {
                                    if (Math.abs(balance) < 0.01) return null;
                                    return (
                                        <div key={userId} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {getParticipantName(userId)}
                                            </span>
                                            <span className={`text-sm font-semibold ${balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {balance > 0 ? '+' : ''} ${balance.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Suggested Settlements */}
                    {settlements.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Suggested Settlements</h3>
                            <div className="space-y-2">
                                {settlements.map((settlement, index) => (
                                    <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-secondary)' }}>
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                            <span className="font-medium">{settlement.from.name}</span>
                                            {' pays '}
                                            <span className="font-medium">{settlement.to.name}</span>
                                        </span>
                                        <span className="text-sm font-semibold" style={{ color: 'var(--accent-indigo)' }}>
                                            ${settlement.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Period Name Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Period Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={periodName}
                            onChange={(e) => setPeriodName(e.target.value)}
                            placeholder={`Settlement (${formatDate(new Date())})`}
                            className="themed-input w-full px-3 py-2 rounded-lg"
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Give this period a memorable name (e.g., "December 2024", "Holiday Trip")
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-card-hover)' }}>
                    <button
                        onClick={onClose}
                        disabled={isClosing}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={isClosing}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isClosing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Closing...
                            </>
                        ) : (
                            'Close Period & Start New'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClosePeriodModal;
