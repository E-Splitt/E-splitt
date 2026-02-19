import React, { useState, useMemo } from 'react';
import { Calendar, Trash2, ArrowRight, Edit2, Search, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { getCategoryById } from '../utils/categories';
import { motion, AnimatePresence } from 'framer-motion';

const ExpenseList = ({ expenses, participants, onDelete, onEdit }) => {
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const filteredAndSorted = useMemo(() => {
        let result = expenses.filter(expense => {
            // Filter by type
            if (filter === 'settlements' && !expense.isSettlement) return false;
            if (filter === 'expenses' && expense.isSettlement) return false;
            if (filter !== 'all' && filter !== 'settlements' && filter !== 'expenses' && expense.category !== filter) return false;

            // Filter by search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const desc = (expense.description || '').toLowerCase();
                const payerName = getPersonName(expense.paidBy, expense).toLowerCase();
                if (!desc.includes(q) && !payerName.includes(q)) return false;
            }

            return true;
        });

        // Sort
        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.expenseDate || a.date) - new Date(b.expenseDate || b.date);
                case 'highest':
                    return b.amount - a.amount;
                case 'lowest':
                    return a.amount - b.amount;
                case 'newest':
                default:
                    return new Date(b.expenseDate || b.date) - new Date(a.expenseDate || a.date);
            }
        });

        return result;
    }, [expenses, filter, searchQuery, sortBy]);

    const getPersonName = (userId, expense = null) => {
        const person = participants.find(p => p.id === userId);
        if (person) return person.name;

        if (expense) {
            if (expense.paidBy === userId && expense.paidByName) return expense.paidByName;
            if (expense.paidTo === userId && expense.paidToName) return expense.paidToName;
        }

        return userId === 'Unknown' ? 'Unknown' : `Unknown (${userId})`;
    };

    const handleDelete = (id) => {
        if (pendingDeleteId === id) {
            onDelete(id);
            setPendingDeleteId(null);
        } else {
            setPendingDeleteId(id);
            // Auto-dismiss after 3 seconds
            setTimeout(() => setPendingDeleteId(prev => prev === id ? null : prev), 3000);
        }
    };

    const hasActiveFilters = searchQuery.trim() || filter !== 'all';

    return (
        <div className="themed-card rounded-xl">
            {/* Header */}
            <div className="p-4 sm:p-6 space-y-3" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Expense History</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}>
                        {filteredAndSorted.length} of {expenses.length}
                    </span>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search expenses..."
                        className="themed-input w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                    />
                </div>

                {/* Filter + Sort row */}
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="themed-select p-2 rounded-lg text-sm flex-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">All Transactions</option>
                        <option value="expenses">Expenses Only</option>
                        <option value="settlements">Settlements Only</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="themed-select p-2 rounded-lg text-sm flex-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="max-h-[600px] overflow-y-auto">
                {filteredAndSorted.length === 0 ? (
                    <div className="text-center py-12 px-4" style={{ color: 'var(--text-muted)' }}>
                        {hasActiveFilters ? (
                            <>
                                <Search size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                                <p className="font-medium mb-1">No matching expenses</p>
                                <p className="text-sm">Try adjusting your search or filter.</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setFilter('all'); }}
                                    className="mt-3 text-sm font-medium hover:opacity-80"
                                    style={{ color: 'var(--accent-indigo)' }}
                                >
                                    Clear filters
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="font-medium">No expenses yet</p>
                                <p className="text-sm mt-1">Add your first expense to get started!</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        <AnimatePresence>
                            {filteredAndSorted.map((expense, index) => {
                                const category = getCategoryById(expense.category);
                                const CategoryIcon = category.icon;
                                const isSettlement = expense.isSettlement;
                                const isDeleting = pendingDeleteId === expense.id;

                                return (
                                    <motion.div
                                        key={expense.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        className="p-4 transition-colors theme-transition"
                                        style={{ borderBottom: '1px solid var(--border-secondary)' }}
                                        whileHover={{ backgroundColor: 'var(--bg-card-hover)' }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: Category Icon & Info */}
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`p-2 rounded-lg ${category.color}`}>
                                                    <CategoryIcon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{expense.description}</h3>
                                                        {isSettlement && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                                <ArrowRight size={12} />
                                                                Payment
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {expense.expenseDate || expense.date}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <div
                                                                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                                style={{ backgroundColor: participants.find(p => p.id === expense.paidBy)?.color || '#6366f1' }}
                                                            >
                                                                {getPersonName(expense.paidBy, expense).charAt(0)}
                                                            </div>
                                                            {getPersonName(expense.paidBy, expense)} paid
                                                        </span>
                                                    </div>

                                                    {/* Split Details */}
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {isSettlement ? (
                                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                                → {getPersonName(expense.paidTo, expense)}
                                                            </span>
                                                        ) : (
                                                            Object.entries(expense.shares || {}).map(([userId, share]) => (
                                                                share > 0 && (
                                                                    <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                                                                        {getPersonName(userId, expense)}: ${share.toFixed(2)}
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
                                                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        ${expense.amount.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    {!isSettlement && (
                                                        <button
                                                            onClick={() => onEdit(expense)}
                                                            className="p-2 rounded-lg transition-colors"
                                                            style={{ color: 'var(--accent-indigo)' }}
                                                            title="Edit expense"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(expense.id)}
                                                        className={`p-2 rounded-lg transition-all ${isDeleting
                                                            ? 'bg-red-600 text-white scale-105'
                                                            : 'text-red-400 hover:text-red-600'
                                                            }`}
                                                        title={isDeleting ? 'Click again to confirm' : 'Delete'}
                                                    >
                                                        {isDeleting ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseList;
