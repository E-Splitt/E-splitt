import React, { useState, useMemo, useCallback } from 'react';
import {
    Search, MoreHorizontal, ShoppingBag, Home, Car, Utensils,
    Coffee, Trash2, Edit2, AlertTriangle, ChevronDown, ChevronUp,
    X, UserCheck, Repeat, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getParticipantHue } from '../utils/colors';

const CATEGORY_ICON = {
    groceries: ShoppingBag,
    stay: Home,
    transport: Car,
    food: Utensils,
    drinks: Coffee,
    other: MoreHorizontal,
};

const CATEGORY_COLORS = {
    stay: '#6366F1',
    food: '#F43F5E',
    groceries: '#10B981',
    transport: '#F59E0B',
    drinks: '#A855F7',
    other: '#64748B',
};

const ExpenseList = ({
    expenses,
    participants,
    onDelete,
    onEdit,
    selectedMemberId = null,
    onSelectMember = null,
}) => {
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [memberFilterMode, setMemberFilterMode] = useState('paid'); // 'paid' | 'involved'
    const [internalMemberId, setInternalMemberId] = useState(null);
    const [expandedExpenseId, setExpandedExpenseId] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const activeMemberId = selectedMemberId !== null ? selectedMemberId : internalMemberId;
    const handleMemberClick = (memberId) => {
        const nextId = activeMemberId === memberId ? null : memberId;
        if (onSelectMember) {
            onSelectMember(nextId);
        } else {
            setInternalMemberId(nextId);
        }
    };

    const getPersonName = useCallback((userId, expense = null) => {
        const person = participants.find(p => p.id === userId);
        if (person) return person.name;

        if (expense) {
            if (expense.paidBy === userId && expense.paidByName) return expense.paidByName;
            if (expense.paidTo === userId && expense.paidToName) return expense.paidToName;
        }

        return userId === 'Unknown' ? 'Unknown' : `Unknown (${userId})`;
    }, [participants]);

    const activeMemberName = useMemo(() => {
        if (!activeMemberId) return null;
        return getPersonName(activeMemberId);
    }, [activeMemberId, getPersonName]);

    // Interactive Category Breakdown Bar data
    const categoryBreakdown = useMemo(() => {
        const totals = {};
        let grandTotal = 0;
        expenses.filter(e => !e.isSettlement).forEach(e => {
            const cat = e.category || 'other';
            const amt = parseFloat(e.amount) || 0;
            totals[cat] = (totals[cat] || 0) + amt;
            grandTotal += amt;
        });
        if (grandTotal <= 0) return [];
        return Object.entries(totals)
            .map(([cat, amount]) => ({
                cat,
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
                amount,
                pct: (amount / grandTotal) * 100,
                color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [expenses]);

    const filteredAndSorted = useMemo(() => {
        let result = expenses.filter(expense => {
            if (filter === 'settlements' && !expense.isSettlement) return false;
            if (filter === 'expenses' && expense.isSettlement) return false;
            if (filter !== 'all' && filter !== 'settlements' && filter !== 'expenses' && (expense.category || 'other') !== filter) return false;

            if (activeMemberId) {
                if (memberFilterMode === 'paid') {
                    if (expense.paidBy !== activeMemberId) return false;
                } else {
                    const inShares = expense.shares && expense.shares[activeMemberId] > 0;
                    const isPayerOrReceiver = expense.paidBy === activeMemberId || expense.paidTo === activeMemberId;
                    if (!inShares && !isPayerOrReceiver) return false;
                }
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const desc = (expense.description || '').toLowerCase();
                const payerName = getPersonName(expense.paidBy, expense).toLowerCase();
                if (!desc.includes(q) && !payerName.includes(q)) return false;
            }

            return true;
        });

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
    }, [expenses, filter, searchQuery, sortBy, activeMemberId, memberFilterMode, getPersonName]);

    const memberFilteredTotal = useMemo(() => {
        return filteredAndSorted
            .filter(e => !e.isSettlement)
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    }, [filteredAndSorted]);

    const handleDelete = (id) => {
        if (pendingDeleteId === id) {
            onDelete(id);
            setPendingDeleteId(null);
        } else {
            setPendingDeleteId(id);
            setTimeout(() => setPendingDeleteId(prev => prev === id ? null : prev), 3000);
        }
    };

    const hasActiveFilters = searchQuery.trim() || filter !== 'all' || !!activeMemberId;

    const getAvatarHue = (id) => {
        const idx = participants.findIndex(p => p.id === id);
        return getParticipantHue(idx >= 0 ? idx : 0);
    };

    const getInitial = (id) => getPersonName(id).charAt(0).toUpperCase();

    return (
        <div id="expense-history-section" className="themed-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 space-y-3.5" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex justify-between items-center">
                    <h2 className="section-head mb-0">Expense History</h2>
                    <motion.span
                        key={`${filteredAndSorted.length}-${expenses.length}`}
                        initial={{ scale: 0.9, opacity: 0.7 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full mono"
                        style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}
                    >
                        {filteredAndSorted.length} of {expenses.length}
                    </motion.span>
                </div>

                {/* Feature 5: Interactive Category Spend Bar */}
                {categoryBreakdown.length > 0 && (
                    <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                                Category Spend Breakdown (Click to filter)
                            </span>
                            {filter !== 'all' && filter !== 'expenses' && filter !== 'settlements' && (
                                <button
                                    type="button"
                                    onClick={() => setFilter('all')}
                                    className="text-xs font-semibold cursor-pointer border-none bg-transparent"
                                    style={{ color: 'var(--coral)' }}
                                >
                                    Clear category ✕
                                </button>
                            )}
                        </div>
                        <div className="h-2.5 w-full rounded-full overflow-hidden flex gap-0.5" style={{ backgroundColor: 'var(--line)' }}>
                            {categoryBreakdown.map((item) => (
                                <motion.div
                                    key={item.cat}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.pct}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    onClick={() => setFilter(filter === item.cat ? 'all' : item.cat)}
                                    title={`${item.label}: $${item.amount.toFixed(2)} (${item.pct.toFixed(0)}%)`}
                                    className="h-full cursor-pointer transition-opacity hover:opacity-80"
                                    style={{
                                        backgroundColor: item.color,
                                        opacity: filter === 'all' || filter === item.cat ? 1 : 0.35
                                    }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categoryBreakdown.map((item) => {
                                const isActiveCat = filter === item.cat;
                                return (
                                    <button
                                        key={item.cat}
                                        type="button"
                                        onClick={() => setFilter(isActiveCat ? 'all' : item.cat)}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer border transition-all"
                                        style={{
                                            borderColor: isActiveCat ? item.color : 'transparent',
                                            backgroundColor: isActiveCat ? 'var(--card)' : 'transparent',
                                            color: 'var(--ink)'
                                        }}
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span>{item.label}</span>
                                        <span className="mono" style={{ color: 'var(--muted)' }}>${item.amount.toFixed(0)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quick Member Filter Pills */}
                {participants.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                        <button
                            type="button"
                            onClick={() => handleMemberClick(null)}
                            className={`person-chip flex-shrink-0 text-xs ${!activeMemberId ? 'selected' : ''}`}
                            style={{ padding: '5px 12px' }}
                        >
                            All Members
                        </button>
                        {participants.map((p, idx) => {
                            const isSelected = activeMemberId === p.id;
                            return (
                                <motion.button
                                    key={p.id}
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleMemberClick(p.id)}
                                    className={`person-chip flex-shrink-0 text-xs ${isSelected ? 'selected' : ''}`}
                                >
                                    <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 20, height: 20, fontSize: 10 }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{p.name}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                )}

                {/* Active Member Filter Banner */}
                <AnimatePresence>
                    {activeMemberId && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                            className="overflow-hidden"
                        >
                            <div
                                className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
                                style={{ backgroundColor: 'var(--teal-soft)', borderColor: 'rgba(99, 102, 241, 0.28)', color: 'var(--ink)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <UserCheck size={15} style={{ color: 'var(--teal)' }} />
                                    <span>
                                        Showing <strong>{activeMemberName}&apos;s</strong> expenses ·{' '}
                                        <span className="mono font-bold">${memberFilteredTotal.toFixed(2)}</span> total
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMemberFilterMode('paid')}
                                        className="px-2.5 py-1 rounded-lg font-semibold cursor-pointer border-none transition-colors"
                                        style={{
                                            backgroundColor: memberFilterMode === 'paid' ? 'var(--teal)' : 'transparent',
                                            color: memberFilterMode === 'paid' ? '#fff' : 'var(--muted)'
                                        }}
                                    >
                                        Paid by {activeMemberName}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMemberFilterMode('involved')}
                                        className="px-2.5 py-1 rounded-lg font-semibold cursor-pointer border-none transition-colors"
                                        style={{
                                            backgroundColor: memberFilterMode === 'involved' ? 'var(--teal)' : 'transparent',
                                            color: memberFilterMode === 'involved' ? '#fff' : 'var(--muted)'
                                        }}
                                    >
                                        Involved in Split
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMemberClick(null)}
                                        className="ml-1 p-1 rounded-lg hover:bg-black/10 cursor-pointer border-none bg-transparent flex items-center"
                                        style={{ color: 'var(--ink)' }}
                                        title="Clear member filter"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search expenses or payer..."
                        className="themed-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
                    />
                </div>

                {/* Filter + Sort row */}
                <div className="flex gap-2.5">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="themed-select p-2.5 rounded-xl text-sm flex-1"
                    >
                        <option value="all">All Transactions</option>
                        <option value="expenses">Expenses Only</option>
                        <option value="settlements">Settlements Only</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="themed-select p-2.5 rounded-xl text-sm flex-1"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className={`p-4 sm:p-6 scroll-smooth ${isExpanded ? 'max-h-none' : 'max-h-[600px] overflow-y-auto'}`}>
                {filteredAndSorted.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12 px-4"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {hasActiveFilters ? (
                            <>
                                <Search size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                                <p className="font-medium mb-1">No matching expenses</p>
                                <p className="text-sm">Try adjusting your search or filter.</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setFilter('all'); handleMemberClick(null); }}
                                    className="mt-3 text-sm font-semibold hover:opacity-80 cursor-pointer bg-transparent border-none"
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
                    </motion.div>
                ) : (
                    <motion.div layout className="stack-md">
                        {filteredAndSorted.map((expense) => {
                                const isSettlement = expense.isSettlement;
                                const isDeleting = pendingDeleteId === expense.id;
                                const isDrawerOpen = expandedExpenseId === expense.id;

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
                                    <motion.div
                                        layout
                                        key={expense.id}
                                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.94, x: -20 }}
                                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                                        whileHover={{ y: -2 }}
                                        className="stub cursor-pointer"
                                        onClick={() => !isSettlement && setExpandedExpenseId(isDrawerOpen ? null : expense.id)}
                                    >
                                        <div className="stub-top">
                                            <div
                                                className="stub-icon"
                                                style={isSettlement ? { backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' } : undefined}
                                            >
                                                <Icon size={16} />
                                            </div>
                                            <div className="stub-info">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="stub-desc">{isSettlement ? "Payment" : expense.description}</span>
                                                    {expense.isRecurring && (
                                                        <span
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                                            style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}
                                                        >
                                                            <Repeat size={10} /> {expense.recurringInterval || 'Monthly'}
                                                        </span>
                                                    )}
                                                    {expense.splitMode && expense.splitMode !== 'equal' && (
                                                        <span
                                                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                            style={{ backgroundColor: 'var(--gold-soft)', color: 'var(--gold)' }}
                                                        >
                                                            <Layers size={10} /> {expense.splitMode} split
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="stub-meta muted small">
                                                    {isSettlement ? (
                                                        <span>{payerName} paid {getPersonName(expense.paidTo, expense)} · {displayDate}</span>
                                                    ) : (
                                                        <span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleMemberClick(expense.paidBy); }}
                                                                className="hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                                                                style={{ color: 'inherit' }}
                                                                title={`Filter expenses by ${payerName}`}
                                                            >
                                                                {payerName}
                                                            </button>{' '}
                                                            paid · {displayDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="stub-amount mono font-bold">${expense.amount.toFixed(2)}</div>

                                            {!isSettlement && (
                                                <motion.button
                                                    whileHover={{ scale: 1.08 }}
                                                    whileTap={{ scale: 0.92 }}
                                                    className="icon-btn ghost"
                                                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                                                    title="Edit expense"
                                                >
                                                    <Edit2 size={15} />
                                                </motion.button>
                                            )}
                                            <motion.button
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.92 }}
                                                className={`icon-btn ghost ${isDeleting ? 'text-red-500' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }}
                                                title={isDeleting ? 'Click again to confirm' : 'Delete'}
                                            >
                                                {isDeleting ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
                                            </motion.button>
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
                                                    <div className="flex items-center gap-2">
                                                        <span className="muted small mono">${share.toFixed(2)} avg / person</span>
                                                        <span className="text-[11px]" style={{ color: 'var(--teal)' }}>
                                                            {isDrawerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Feature 3: Interactive Receipt Breakdown Drawer */}
                                                <AnimatePresence>
                                                    {isDrawerOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
                                                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                                                                    <span>Itemized Member Breakdown</span>
                                                                    <span>Category: {(expense.category || 'other').toUpperCase()}</span>
                                                                </div>
                                                                <div className="grid sm:grid-cols-2 gap-2">
                                                                    {splitIds.map((uid) => {
                                                                        const memberShare = expense.shares[uid] || 0;
                                                                        const memberPct = expense.amount > 0 ? Math.round((memberShare / expense.amount) * 100) : 0;
                                                                        return (
                                                                            <div
                                                                                key={uid}
                                                                                className="px-3 py-2 rounded-xl border flex items-center justify-between text-xs"
                                                                                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="avatar-chip" data-hue={getAvatarHue(uid)} style={{ width: 20, height: 20, fontSize: 9 }}>
                                                                                        {getInitial(uid)}
                                                                                    </div>
                                                                                    <span className="font-semibold">{getPersonName(uid)}</span>
                                                                                </div>
                                                                                <span className="mono font-semibold">
                                                                                    ${memberShare.toFixed(2)} <span style={{ color: 'var(--muted)' }}>({memberPct}%)</span>
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })}
                    </motion.div>
                )}
            </div>

            {filteredAndSorted.length > 5 && (
                <div className="border-t p-2.5 flex justify-center" style={{ borderColor: 'var(--line)' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-semibold uppercase tracking-wider py-2 px-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
                        style={{ color: 'var(--teal)' }}
                    >
                        {isExpanded ? <><ChevronUp size={14} /> Collapse List</> : <><ChevronDown size={14} /> Expand All Transactions</>}
                    </motion.button>
                </div>
            )}
        </div>
    );
};

export default ExpenseList;
