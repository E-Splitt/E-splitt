import React, { useMemo } from 'react';
import { CheckCircle, DollarSign, ArrowRight } from 'lucide-react';
import { calculateSettlements } from '../utils/splitLogic';

const SettleUp = ({ balances, participants, onOpenSettleModal }) => {
    const settlements = calculateSettlements(balances, participants);

    const totalOutstanding = useMemo(() => {
        return settlements.reduce((s, st) => s + st.amount, 0);
    }, [settlements]);

    return (
        <div className="themed-card rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CheckCircle className="text-green-500" size={20} />
                How to Settle Up
            </h2>

            {settlements.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                    <p className="font-medium">All settled up!</p>
                    <p className="text-sm">No one owes anything.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Outstanding summary */}
                    <div className="flex items-center justify-between p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            {settlements.length} payment{settlements.length !== 1 ? 's' : ''} needed
                        </span>
                        <span className="font-bold" style={{ color: 'var(--accent-indigo)' }}>
                            ${totalOutstanding.toFixed(2)} total
                        </span>
                    </div>

                    {settlements.map((settlement, index) => {
                        // Calculate context: how much over/under the payer spent
                        const fromBalance = balances[settlement.from.id] || 0;

                        return (
                            <div key={index} className="p-4 rounded-lg transition-all hover:scale-[1.01] theme-transition" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-secondary)' }}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                            style={{ backgroundColor: settlement.from.color || '#6366f1' }}
                                        >
                                            {settlement.from.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{settlement.from.name}</span>
                                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                            style={{ backgroundColor: settlement.to.color || '#6366f1' }}
                                        >
                                            {settlement.to.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{settlement.to.name}</span>
                                    </div>
                                    <div className="font-bold text-lg" style={{ color: 'var(--accent-indigo)' }}>
                                        ${settlement.amount.toFixed(2)}
                                    </div>
                                </div>
                                <p className="text-xs ml-11 mb-2" style={{ color: 'var(--text-muted)' }}>
                                    {settlement.from.name} underpaid by ${Math.abs(fromBalance).toFixed(2)}
                                </p>
                                <button
                                    onClick={() => onOpenSettleModal({ from: settlement.from, to: settlement.to, amount: settlement.amount })}
                                    className="w-full mt-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                                >
                                    <DollarSign size={16} />
                                    Record this payment
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SettleUp;
