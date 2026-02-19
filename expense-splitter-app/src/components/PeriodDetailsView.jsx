import React, { useState } from 'react';
import { X, Calendar, DollarSign, TrendingUp, Users, Download, ArrowLeft, Check } from 'lucide-react';

const PeriodDetailsView = ({ period, expenses = [], participants = [], onClose }) => {
    const [exported, setExported] = useState(false);

    if (!period) return null;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getParticipantName = (userId) => {
        const participant = participants.find(p => p.id === userId);
        return participant?.name || userId;
    };

    const escapeCSV = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const handleExport = () => {
        const lines = [];

        // ========== PERIOD SUMMARY ==========
        lines.push('========== PERIOD SUMMARY ==========');
        lines.push(`Period Name,${escapeCSV(period.name)}`);
        lines.push(`Date Range,${formatDateShort(period.start_date)} - ${formatDateShort(period.end_date)}`);
        lines.push(`Total Expenses,$${(period.total_expenses || 0).toFixed(2)}`);
        lines.push(`Number of Transactions,${period.transaction_count || 0}`);
        lines.push(`Number of Participants,${period.final_balances ? Object.keys(period.final_balances).length : participants.length}`);
        lines.push('');

        // ========== PARTICIPANTS ==========
        if (participants.length > 0) {
            lines.push('========== PARTICIPANTS ==========');
            lines.push(['Name', 'Email'].join(','));
            participants.forEach(p => {
                lines.push([
                    escapeCSV(p.name),
                    escapeCSV(p.email || 'N/A')
                ].join(','));
            });
            lines.push('');
        }

        // ========== ALL EXPENSES ==========
        lines.push('========== ALL EXPENSES ==========');
        lines.push(['Date', 'Description', 'Amount', 'Paid By', 'Category', 'Type', 'Split Between'].join(','));

        if (expenses.length > 0) {
            expenses.forEach(expense => {
                const paidByName = expense.paidByName || getParticipantName(expense.paidBy);

                let splitDetails = '';
                if (expense.isSettlement) {
                    const toName = expense.paidToName || getParticipantName(expense.paidTo);
                    splitDetails = `Payment: ${paidByName} paid ${toName} $${expense.amount.toFixed(2)}`;
                } else if (expense.shares) {
                    splitDetails = Object.entries(expense.shares)
                        .map(([userId, share]) => `${getParticipantName(userId)}: $${share.toFixed(2)}`)
                        .join(' | ');
                }

                lines.push([
                    escapeCSV(expense.expenseDate || expense.date || ''),
                    escapeCSV(expense.description || ''),
                    `$${(expense.amount || 0).toFixed(2)}`,
                    escapeCSV(paidByName),
                    escapeCSV(expense.category || 'other'),
                    expense.isSettlement ? 'Settlement' : 'Expense',
                    escapeCSV(splitDetails)
                ].join(','));
            });
        } else {
            lines.push('No expenses recorded in this period');
        }
        lines.push('');

        // ========== FINAL BALANCES ==========
        if (period.final_balances && Object.keys(period.final_balances).length > 0) {
            lines.push('========== FINAL BALANCES ==========');
            lines.push(['Participant Name', 'Balance', 'Status'].join(','));
            Object.entries(period.final_balances).forEach(([userId, balance]) => {
                const name = getParticipantName(userId);
                const status = balance > 0.01 ? 'Is Owed Money' : balance < -0.01 ? 'Owes Money' : 'Settled Up';
                lines.push([
                    escapeCSV(name),
                    `${balance > 0 ? '+' : ''}$${balance.toFixed(2)}`,
                    status
                ].join(','));
            });
            lines.push('');
        }

        // ========== SUGGESTED SETTLEMENTS ==========
        if (period.final_settlements && period.final_settlements.length > 0) {
            lines.push('========== SUGGESTED SETTLEMENTS (WHO OWES WHAT) ==========');
            lines.push(['From (Payer)', 'To (Receiver)', 'Amount', 'Description'].join(','));
            period.final_settlements.forEach(s => {
                const fromName = s.from?.name || 'Unknown';
                const toName = s.to?.name || 'Unknown';
                lines.push([
                    escapeCSV(fromName),
                    escapeCSV(toName),
                    `$${s.amount.toFixed(2)}`,
                    escapeCSV(`${fromName} should pay ${toName} $${s.amount.toFixed(2)}`)
                ].join(','));
            });
            lines.push('');
        }

        // ========== FOOTER ==========
        lines.push(`Exported from E-Split on ${new Date().toLocaleString()}`);

        // Download
        const csvContent = lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = (period.name || 'period').replace(/[^a-zA-Z0-9]/g, '_');
        link.href = url;
        link.download = `e-split-${safeName}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExported(true);
        setTimeout(() => setExported(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 glass-strong" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg transition-colors hover:opacity-75"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{period.name}</h1>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {formatDateShort(period.start_date)} - {formatDateShort(period.end_date)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${exported
                                ? 'text-green-600 bg-green-50'
                                : ''
                                }`}
                            style={!exported ? { color: 'var(--accent-indigo)', backgroundColor: 'var(--bg-card-hover)' } : {}}
                        >
                            {exported ? (
                                <>
                                    <Check size={16} />
                                    Exported!
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Export CSV
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-2 text-indigo-200 mb-2">
                            <DollarSign size={20} />
                            <span className="text-sm font-medium">Total Expenses</span>
                        </div>
                        <p className="text-3xl font-bold">
                            ${(period.total_expenses || 0).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-2 text-green-200 mb-2">
                            <TrendingUp size={20} />
                            <span className="text-sm font-medium">Transactions</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {period.transaction_count || 0}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-2 text-blue-200 mb-2">
                            <Users size={20} />
                            <span className="text-sm font-medium">Participants</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {period.final_balances ? Object.keys(period.final_balances).length : 0}
                        </p>
                    </div>
                </div>

                {/* Final Balances */}
                {period.final_balances && Object.keys(period.final_balances).length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Final Balances</h2>
                        <div className="themed-card rounded-lg" style={{ borderColor: 'var(--border-primary)' }}>
                            {Object.entries(period.final_balances).map(([userId, balance], index, arr) => (
                                <div key={userId} className="flex items-center justify-between p-4" style={{ borderBottom: index < arr.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {getParticipantName(userId)}
                                    </span>
                                    <span className={`text-lg font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : ''}`} style={balance === 0 ? { color: 'var(--text-muted)' } : {}}>
                                        {balance > 0 ? '+' : ''} ${balance.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Final Settlements */}
                {period.final_settlements && period.final_settlements.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Settlements</h2>
                        <div className="themed-card rounded-lg">
                            {period.final_settlements.map((settlement, index) => (
                                <div key={index} className="flex items-center justify-between p-4" style={{ borderBottom: index < period.final_settlements.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{settlement.from.name}</span>
                                        {' pays '}
                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{settlement.to.name}</span>
                                    </span>
                                    <span className="text-lg font-semibold" style={{ color: 'var(--accent-indigo)' }}>
                                        ${settlement.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expenses List */}
                <div>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>All Expenses</h2>
                    {expenses.length === 0 ? (
                        <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                            <p>No expenses recorded in this period</p>
                        </div>
                    ) : (
                        <div className="themed-card rounded-lg">
                            {expenses.map((expense, index) => (
                                <div key={expense.id} className="p-4" style={{ borderBottom: index < expenses.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{expense.description}</h3>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                Paid by {getParticipantName(expense.paidBy)} • {formatDate(expense.date)}
                                            </p>
                                        </div>
                                        <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            ${expense.amount.toFixed(2)}
                                        </span>
                                    </div>
                                    {expense.shares && (
                                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            Split: {Object.entries(expense.shares).map(([userId, share]) =>
                                                `${getParticipantName(userId)} ($${share.toFixed(2)})`
                                            ).join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeriodDetailsView;
