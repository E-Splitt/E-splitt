import React, { useState, useMemo, useCallback } from 'react';
import { Search, MoreHorizontal, ShoppingBag, Home, Car, Utensils, Coffee, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { getParticipantHue } from '../utils/colors';

const CATEGORY_ICON = {
    groceries: ShoppingBag,
    stay: Home,
    transport: Car,
    food: Utensils,
    drinks: Coffee,
    other: MoreHorizontal,
};

const ExpenseList = ({ expenses, participants, onDelete, onEdit }) => {
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const getPersonName = useCallback((userId, expense = null) => {
        const person = participants.find(p => p.id === userId);
        if (person) return person.name;

        if (expense) {
            if (expense.paidBy === userId && expense.paidByName) return expense.paidByName;
            if (expense.paidTo === userId && expense.paidToName) return expense.paidToName;
        }

        return userId === 'Unknown' ? 'Unknown' : `Unknown (${userId})`;
    }, [participants]);

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
    }, [expenses, filter, searchQuery, sortBy, getPersonName]);

    const handleDelete = (id) => {
        if (pendingDeleteId === id) {
            onDelete(id);
            setPendingDeleteId(null);
        } else {
            setPendingDeleteId(id);
            setTimeout(() => setPendingDeleteId(prev => prev === id ? null : prev), 3000);
        }
    };

    const hasActiveFilters = searchQuery.trim() || filter !== 'all';

    const getAvatarHue = (id) => {
        const idx = participants.findIndex(p => p.id === id);
        return getParticipantHue(idx >= 0 ? idx : 0);
    };

    const getInitial = (id) => getPersonName(id).charAt(0).toUpperCase();

    return (
        <div className="themed-card rounded-xl">
            {/* Header */}
            <div className="p-4 sm:p-6 space-y-3" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex justify-between items-center">
                    <h2 className="section-head mb-0">Expense History</h2>
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
                        className="themed-select p-2 rounded-lg text-sm flex-1"
                    >
                        <option value="all">All Transactions</option>
                        <option value="expenses">Expenses Only</option>
                        <option value="settlements">Settlements Only</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="themed-select p-2 rounded-lg text-sm flex-1"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className={`p-4 sm:p-6 ${isExpanded ? 'max-h-none' : 'max-h-[600px] overflow-y-auto'}`}>
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
                    <div className="stack-md">
                        {filteredAndSorted.map((expense) => {
                            const isSettlement = expense.isSettlement;
                            const isDeleting = pendingDeleteId === expense.id;
                            
                            const dateObj = new Date(expense.expenseDate || expense.date);
                            const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                            const day = dateObj.toLocaleDateString('en-US', { day: 'numeric' });
                            const displayDate = `${month} ${day}`;
                            
                            const payerName = getPersonName(expense.paidBy, expense);
                            const Icon = CATEGORY_ICON[expense.category] || MoreHorizontal;
                            
                            const splitIds = !isSettlement && expense.shares ? Object.keys(expense.shares).filter(id => expense.shares[id] > 0) : [];
                            const numPeople = splitIds.length;
                            const share = numPeople > 0 ? expense.amount / numPeople : 0;

                            return (
                                <div className="stub" key={expense.id}>
                                    <div className="stub-top">
                                        <div className="stub-icon">
                                            <Icon size={16} />
                                        </div>
                                        <div className="stub-info">
                                            <div className="stub-desc">{isSettlement ? "Payment" : expense.description}</div>
                                            <div className="stub-meta muted small">
                                                {isSettlement ? (
                                                    <span>{payerName} paid {getPersonName(expense.paidTo, expense)} · {displayDate}</span>
                                                ) : (
                                                    <span>{payerName} paid · {displayDate}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="stub-amount mono">${expense.amount.toFixed(2)}</div>
                                        
                                        {!isSettlement && (
                                            <button className="icon-btn ghost" onClick={() => onEdit(expense)} title="Edit expense">
                                                <Edit2 size={15} />
                                            </button>
                                        )}
                                        <button 
                                            className={`icon-btn ghost ${isDeleting ? 'text-red-500' : ''}`} 
                                            onClick={() => handleDelete(expense.id)}
                                            title={isDeleting ? 'Click again to confirm' : 'Delete'}
                                        >
                                            {isDeleting ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
                                        </button>
                                    </div>
                                    {!isSettlement && (
                                        <>
                                            <div className="stub-divider" />
                                            <div className="stub-bottom">
                                                <div className="avatar-stack">
                                                    {splitIds.map((id, i) => (
                                                        <div key={id} style={{ zIndex: splitIds.length - i }}>
                                                            <div className="avatar-chip" data-hue={getAvatarHue(id)} style={{ width: 26, height: 26, fontSize: 10 }}>
                                                                {getInitial(id)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="muted small">${share.toFixed(2)} / person</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {filteredAndSorted.length > 5 && (
                <div className="border-t p-2 flex justify-center" style={{ borderColor: 'var(--line)' }}>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-semibold uppercase tracking-wider py-2 px-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ color: 'var(--teal)' }}
                    >
                        {isExpanded ? 'Collapse List' : 'Expand All Transactions'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExpenseList;
