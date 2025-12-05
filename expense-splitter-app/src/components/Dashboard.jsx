import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const Dashboard = ({ totalPaid, balances, participants }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {participants.map(person => {
                const balance = balances[person.id] || 0;
                const isOwed = balance > 0;

                return (
                    <div key={person.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                    style={{ backgroundColor: person.color || '#6366f1' }}
                                >
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">{person.name}</h3>
                            </div>
                            <div className={`p-2 rounded-full ${isOwed ? 'bg-green-100 text-green-600' : balance < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                {isOwed ? <ArrowUpRight size={20} /> : balance < 0 ? <ArrowDownLeft size={20} /> : <Wallet size={20} />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Total Paid</span>
                                <span className="font-medium text-gray-900">${(totalPaid[person.id] || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <span className="text-sm text-gray-500">Net Balance</span>
                                <span className={`text-xl font-bold ${isOwed ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
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
