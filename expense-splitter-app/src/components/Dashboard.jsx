import React, { useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, User } from 'lucide-react';

const Dashboard = ({ totalPaid, balances, participants, currentUserId }) => {
    const totalGroupSpending = useMemo(() => {
        return Object.values(totalPaid || {}).reduce((sum, v) => sum + v, 0);
    }, [totalPaid]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {participants.map(person => {
                const balance = balances[person.id] || 0;
                const paid = totalPaid[person.id] || 0;
                const isOwed = balance > 0;
                const isCurrentUser = person.id === currentUserId;
                const spendPct = totalGroupSpending > 0 ? (paid / totalGroupSpending) * 100 : 0;

                return (
                    <div key={person.id} className={`themed-card p-4 sm:p-6 rounded-xl hover:scale-[1.02] transition-all duration-200 cursor-default ${isCurrentUser ? 'ring-2' : ''}`} style={isCurrentUser ? { ringColor: 'var(--accent-indigo)', borderColor: 'var(--accent-indigo)' } : {}}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                                    style={{ backgroundColor: person.color || '#6366f1' }}
                                >
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{person.name}</h3>
                                        {isCurrentUser && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--accent-indigo)', color: 'white' }}>
                                                <User size={10} />
                                                You
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 rounded-full" style={{
                                backgroundColor: isOwed ? 'rgba(34,197,94,0.15)' : balance < 0 ? 'rgba(239,68,68,0.15)' : 'var(--bg-card-hover)',
                                color: isOwed ? '#22c55e' : balance < 0 ? '#ef4444' : 'var(--text-muted)'
                            }}>
                                {isOwed ? <ArrowUpRight size={20} /> : balance < 0 ? <ArrowDownLeft size={20} /> : <Wallet size={20} />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                                <span>Total Paid</span>
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>${paid.toFixed(2)}</span>
                            </div>

                            {/* Spending share progress bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <span>Share of spending</span>
                                    <span>{spendPct.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${Math.min(spendPct, 100)}%`,
                                            backgroundColor: person.color || '#6366f1'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Net Balance</span>
                                <span className={`text-xl font-bold`} style={{
                                    color: isOwed ? '#22c55e' : balance < 0 ? '#ef4444' : 'var(--text-muted)'
                                }}>
                                    {balance > 0 ? '+' : ''}{balance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Dashboard;
