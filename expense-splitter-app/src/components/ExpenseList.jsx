import React, { useState } from 'react';
import { Calendar, Trash2, ArrowRight, Edit2 } from 'lucide-react';
import { getCategoryById } from '../utils/categories';

const ExpenseList = ({ expenses, participants, onDelete, onEdit }) => {
    const [filter, setFilter] = useState('all');

    const filteredExpenses = expenses.filter(expense => {
        if (filter === 'all') return true;
        if (filter === 'settlements') return expense.isSettlement;
        if (filter === 'expenses') return !expense.isSettlement;
        return expense.category === filter;
    });

    const getPersonName = (userId) => {
        const person = participants.find(p => p.id === userId);
        return person ? person.name : (userId === 'Unknown' ? 'Unknown' : `Unknown (${userId})`);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Expense History</h2>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">All Transactions</option>
                        <option value="expenses">Expenses Only</option>
                        <option value="settlements">Settlements Only</option>
                    </select>
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No expenses yet. Add your first expense to get started!
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredExpenses.map((expense) => {
                            const category = getCategoryById(expense.category);
                            const CategoryIcon = category.icon;
                            const isSettlement = expense.isSettlement;

                            return (
                                <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Category Icon & Info */}
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`p-2 rounded-lg ${category.color}`}>
                                                <CategoryIcon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                                                    {isSettlement && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                            <ArrowRight size={12} />
                                                            Payment
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        {expense.date}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <div
                                                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                            style={{ backgroundColor: participants.find(p => p.id === expense.paidBy)?.color || '#6366f1' }}
                                                        >
                                                            {getPersonName(expense.paidBy).charAt(0)}
                                                        </div>
                                                        {getPersonName(expense.paidBy)} paid
                                                    </span>
                                                </div>

                                                {/* Split Details */}
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {isSettlement ? (
                                                        <span className="text-xs text-gray-600">
                                                            → {getPersonName(expense.paidTo)}
                                                        </span>
                                                    ) : (
                                                        Object.entries(expense.shares || {}).map(([userId, share]) => (
                                                            share > 0 && (
                                                                <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                                                                    {getPersonName(userId)}: ${share.toFixed(2)}
                                                                </span>
                                                            )
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Amount & Actions */}
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-gray-900">
                                                    ${expense.amount.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {!isSettlement && (
                                                    <button
                                                        onClick={() => onEdit(expense)}
                                                        className="text-indigo-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit expense"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDelete(expense.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete expense"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseList;
