import React, { useState } from 'react';
import { CheckCircle, DollarSign } from 'lucide-react';
import { calculateSettlements } from '../utils/splitLogic';

const SettleUp = ({ balances, participants, onOpenSettleModal }) => {
    const settlements = calculateSettlements(balances, participants);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                How to Settle Up
            </h2>

            {settlements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                    <p className="font-medium">All settled up!</p>
                    <p className="text-sm">No one owes anything.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {settlements.map((settlement, index) => (
                        <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                        style={{ backgroundColor: settlement.from.color || '#6366f1' }}
                                    >
                                        {settlement.from.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-900">{settlement.from.name}</span>
                                    <span className="text-gray-400">→</span>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                        style={{ backgroundColor: settlement.to.color || '#6366f1' }}
                                    >
                                        {settlement.to.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-900">{settlement.to.name}</span>
                                </div>
                                <div className="font-bold text-indigo-600 text-lg">
                                    ${settlement.amount.toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenSettleModal({ from: settlement.from, to: settlement.to, amount: settlement.amount })}
                                className="w-full mt-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <DollarSign size={16} />
                                Record this payment
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SettleUp;
