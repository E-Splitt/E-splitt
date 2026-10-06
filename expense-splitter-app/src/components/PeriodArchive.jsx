import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Users, Eye, Trash2, Download, Check, BarChart3, Trophy } from 'lucide-react';

const PeriodArchive = ({ periods = [], participants = [], expenses = [], onViewDetails, onDelete }) => {
    const [exportedId, setExportedId] = useState(null);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatMonth = (date) => {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    const getParticipantName = (userId) => {
        const p = participants.find(p => p.id === userId);
        return p?.name || userId;
    };

    const escapeCSV = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const closedPeriods = useMemo(() =>
        periods.filter(p => p.status === 'closed').sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
        [periods]
    );

    // ===== Analytics: Spending Trends by Period =====
    const spendingTrends = useMemo(() => {
        if (closedPeriods.length === 0) return [];
        const maxTotal = Math.max(...closedPeriods.map(p => p.total_expenses || 0), 1);
        return closedPeriods.map(p => ({
            id: p.id,
            name: p.name,
            label: formatMonth(p.start_date),
            total: p.total_expenses || 0,
            pct: ((p.total_expenses || 0) / maxTotal) * 100,
            transactions: p.transaction_count || 0
        }));
    }, [closedPeriods]);

    // ===== Analytics: Top Spenders across all archived periods =====
    const topSpenders = useMemo(() => {
        const archivedPeriodIds = new Set(closedPeriods.map(p => p.id));
        const archivedExpenses = expenses.filter(e => archivedPeriodIds.has(e.periodId) && !e.isSettlement);

        const spenderMap = {};
        archivedExpenses.forEach(exp => {
            const id = exp.paidBy;
            if (!spenderMap[id]) {
                spenderMap[id] = { userId: id, total: 0, count: 0 };
            }
            spenderMap[id].total += exp.amount || 0;
            spenderMap[id].count += 1;
        });

        const sorted = Object.values(spenderMap).sort((a, b) => b.total - a.total);
        const maxSpent = sorted.length > 0 ? sorted[0].total : 1;
        return sorted.slice(0, 5).map((s, i) => {
            const person = participants.find(p => p.id === s.userId);
            return {
                ...s,
                name: person?.name || s.userId,
                color: person?.color || '#6366f1',
                pct: (s.total / maxSpent) * 100,
                rank: i + 1
            };
        });
    }, [closedPeriods, expenses, participants]);

    // ===== Export =====
    const handleExport = (period) => {
        const lines = [];
        const periodExpenses = expenses.filter(e => e.periodId === period.id);

        lines.push('========== PERIOD SUMMARY ==========');
        lines.push(`Period Name,${escapeCSV(period.name)}`);
        lines.push(`Date Range,${formatDate(period.start_date)} - ${formatDate(period.end_date)}`);
        lines.push(`Total Expenses,$${(period.total_expenses || 0).toFixed(2)}`);
        lines.push(`Number of Transactions,${period.transaction_count || 0}`);
        lines.push(`Number of Participants,${period.final_balances ? Object.keys(period.final_balances).length : 0}`);
        lines.push('');

        if (periodExpenses.length > 0) {
            lines.push('========== ALL EXPENSES ==========');
            lines.push(['Date', 'Description', 'Amount', 'Paid By', 'Category', 'Type', 'Split Between'].join(','));
            periodExpenses.forEach(expense => {
                const paidByName = getParticipantName(expense.paidBy);
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
            lines.push('');
        }

        if (period.final_balances && Object.keys(period.final_balances).length > 0) {
            lines.push('========== FINAL BALANCES ==========');
            lines.push(['Participant Name', 'Balance', 'Status'].join(','));
            Object.entries(period.final_balances).forEach(([userId, balance]) => {
                const name = getParticipantName(userId);
                const status = balance > 0.01 ? 'Is Owed Money' : balance < -0.01 ? 'Owes Money' : 'Settled Up';
                lines.push([escapeCSV(name), `${balance > 0 ? '+' : ''}$${balance.toFixed(2)}`, status].join(','));
            });
            lines.push('');
        }

        if (period.final_settlements && period.final_settlements.length > 0) {
            lines.push('========== SUGGESTED SETTLEMENTS (WHO OWES WHAT) ==========');
            lines.push(['From (Payer)', 'To (Receiver)', 'Amount', 'Description'].join(','));
            period.final_settlements.forEach(s => {
                const fromName = s.from?.name || 'Unknown';
                const toName = s.to?.name || 'Unknown';
                lines.push([
                    escapeCSV(fromName), escapeCSV(toName), `$${s.amount.toFixed(2)}`,
                    escapeCSV(`${fromName} should pay ${toName} $${s.amount.toFixed(2)}`)
                ].join(','));
            });
            lines.push('');
        }

        // Top spenders for this period
        const periodOnlyExpenses = expenses.filter(e => e.periodId === period.id && !e.isSettlement);
        const periodSpenders = {};
        periodOnlyExpenses.forEach(exp => {
            const id = exp.paidBy;
            if (!periodSpenders[id]) periodSpenders[id] = { total: 0, count: 0 };
            periodSpenders[id].total += exp.amount || 0;
            periodSpenders[id].count += 1;
        });
        const sortedSpenders = Object.entries(periodSpenders).sort((a, b) => b[1].total - a[1].total);
        if (sortedSpenders.length > 0) {
            lines.push('========== TOP SPENDERS ==========');
            lines.push(['Rank', 'Name', 'Total Spent', 'Number of Expenses'].join(','));
            sortedSpenders.forEach(([userId, data], i) => {
                lines.push([i + 1, escapeCSV(getParticipantName(userId)), `$${data.total.toFixed(2)}`, data.count].join(','));
            });
            lines.push('');
        }

        lines.push(`Exported from E-Split on ${new Date().toLocaleString()}`);

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

        setExportedId(period.id);
        setTimeout(() => setExportedId(null), 2000);
    };

    // ===== Render =====
    if (closedPeriods.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Archived Periods</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Closed settlement periods will appear here for historical reference.
                </p>
            </div>
        );
    }

    const totalAcrossAll = closedPeriods.reduce((sum, p) => sum + (p.total_expenses || 0), 0);
    const avgPerPeriod = closedPeriods.length > 0 ? totalAcrossAll / closedPeriods.length : 0;

    const rankMedals = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Period Archive</h2>
                <p style={{ color: 'var(--text-secondary)' }}>View historical settlement periods, spending trends, and top spenders</p>
            </div>

            {/* ===== Summary Stats Row ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="themed-card rounded-lg p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Periods</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{closedPeriods.length}</p>
                </div>
                <div className="themed-card rounded-lg p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent-indigo)' }}>${totalAcrossAll.toFixed(0)}</p>
                </div>
                <div className="themed-card rounded-lg p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Avg / Period</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${avgPerPeriod.toFixed(0)}</p>
                </div>
                <div className="themed-card rounded-lg p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Txns</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{closedPeriods.reduce((s, p) => s + (p.transaction_count || 0), 0)}</p>
                </div>
            </div>

            {/* ===== Spending Trends Chart ===== */}
            {spendingTrends.length > 1 && (
                <div className="themed-card rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart3 size={20} style={{ color: 'var(--accent-indigo)' }} />
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Spending Trends by Period</h3>
                    </div>
                    <div className="flex items-end gap-2 h-44">
                        {spendingTrends.map(t => (
                            <div key={t.id} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                                    <div className="themed-card rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                                        <p style={{ color: 'var(--text-secondary)' }}>${t.total.toFixed(2)} • {t.transactions} txns</p>
                                    </div>
                                </div>
                                {/* Amount label */}
                                <span className="text-xs font-semibold truncate w-full text-center" style={{ color: 'var(--text-secondary)' }}>
                                    ${t.total >= 1000 ? `${(t.total / 1000).toFixed(1)}k` : t.total.toFixed(0)}
                                </span>
                                {/* Bar */}
                                <div
                                    className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                                    style={{
                                        height: `${Math.max(t.pct, 4)}%`,
                                        background: `linear-gradient(to top, var(--accent-indigo), var(--accent-indigo-hover))`,
                                        minHeight: '6px'
                                    }}
                                />
                                {/* Period label */}
                                <span className="text-xs truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                                    {t.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== Top Spenders ===== */}
            {topSpenders.length > 0 && (
                <div className="themed-card rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy size={20} style={{ color: '#f59e0b' }} />
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Top Spenders</h3>
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>across all archived periods</span>
                    </div>
                    <div className="space-y-3">
                        {topSpenders.map(s => (
                            <div key={s.userId} className="flex items-center gap-3">
                                {/* Rank */}
                                <span className="text-lg w-8 text-center flex-shrink-0">
                                    {s.rank <= 3 ? rankMedals[s.rank - 1] : (
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>#{s.rank}</span>
                                    )}
                                </span>
                                {/* Avatar */}
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                    style={{ backgroundColor: s.color }}
                                >
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                {/* Name + bar */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                            {s.name}
                                        </span>
                                        <span className="text-sm font-semibold flex-shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>
                                            ${s.total.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                                        />
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {s.count} expense{s.count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== Period Cards ===== */}
            <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>All Archived Periods</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {closedPeriods.map(period => (
                        <div
                            key={period.id}
                            className="themed-card rounded-lg p-5 hover:scale-[1.02] transition-all relative group"
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this archive?')) {
                                        onDelete(period.id);
                                    }
                                }}
                                className="absolute top-4 right-4 hover:text-red-500 transition-colors p-2 z-10"
                                style={{ color: 'var(--text-muted)' }}
                                title="Delete Archived Period"
                            >
                                <Trash2 size={20} />
                            </button>

                            <div className="mb-4 pr-6">
                                <h3 className="text-lg font-semibold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                                    {period.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    <Calendar size={14} />
                                    <span>{formatDate(period.start_date)} - {formatDate(period.end_date)}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        <DollarSign size={16} />
                                        <span className="text-sm">Total Expenses</span>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        ${(period.total_expenses || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        <TrendingUp size={16} />
                                        <span className="text-sm">Transactions</span>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {period.transaction_count || 0}
                                    </span>
                                </div>
                                {period.final_balances && Object.keys(period.final_balances).length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                            <Users size={16} />
                                            <span className="text-sm">Participants</span>
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {Object.keys(period.final_balances).length}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onViewDetails(period)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                    style={{ color: 'var(--accent-indigo)', backgroundColor: 'var(--bg-card-hover)' }}
                                >
                                    <Eye size={16} />
                                    View
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleExport(period);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${exportedId === period.id ? 'text-green-600 bg-green-50' : ''
                                        }`}
                                    style={exportedId !== period.id ? { color: 'var(--accent-indigo)', backgroundColor: 'var(--bg-card-hover)' } : {}}
                                >
                                    {exportedId === period.id ? (
                                        <><Check size={16} />Done!</>
                                    ) : (
                                        <><Download size={16} />Export</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PeriodArchive;
