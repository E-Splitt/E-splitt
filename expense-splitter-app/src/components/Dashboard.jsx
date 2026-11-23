import React, { useState } from 'react';
import {
    ArrowRight, CheckCircle2, ChevronDown, ReceiptText, Users,
    Wallet, CreditCard, Plus, ArrowUpRight, ArrowDownLeft,
    ShieldCheck, Sparkles, Share2, Layers, Calendar, ExternalLink,
    Coffee, ShoppingBag, Home, Zap, Car, Film, HelpCircle
} from 'lucide-react';
import { calculateSettlements, toCents } from '../utils/splitLogic';
import { getParticipantHue } from '../utils/colors';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatMoney = value => money.format(Math.abs(value));
const getId = value => typeof value === 'object' ? value.id : value;

const categoryIcons = {
    groceries: ShoppingBag,
    dining: Coffee,
    food: Coffee,
    rent: Home,
    housing: Home,
    utilities: Zap,
    transport: Car,
    entertainment: Film,
    other: HelpCircle,
};

const categoryColors = {
    groceries: 'var(--c1)',
    dining: 'var(--c6)',
    food: 'var(--c6)',
    rent: 'var(--c3)',
    housing: 'var(--c3)',
    utilities: 'var(--c5)',
    transport: 'var(--c2)',
    entertainment: 'var(--c4)',
    other: 'var(--c0)',
};

export default function Dashboard({
    participants = [],
    balances = {},
    settleUp,
    expenses = [],
    currentUserId,
    onSettle,
    onAddExpense,
    onClosePeriod,
    groupName = 'Household',
    periodName = 'Current Period'
}) {
    const [cardStackIdx, setCardStackIdx] = useState(0);
    const [flowFilter, setFlowFilter] = useState('all'); // 'all', 'personal', 'settled'

    const nameOf = id => participants.find(person => person.id === id)?.name || 'Former member';
    const currentUser = participants.find(p => p.id === currentUserId);
    const greetingName = currentUser?.name || 'there';
    const cardholderName = currentUser?.name || 'Household Member';

    const bills = expenses.filter(expense => !expense.isSettlement);
    const totalCents = bills.reduce((sum, expense) => sum + toCents(expense.amount), 0);
    const total = totalCents / 100;
    const unassignedCents = Object.values(balances).reduce((sum, balance) => sum + toCents(balance), 0);

    const settlements = (settleUp ?? calculateSettlements(balances, participants)).map(({ from, to, amt, amount }) => ({
        from: getId(from), to: getId(to), amount: amt ?? amount
    }));

    const personalBalance = balances[currentUserId];
    const personalTransfers = settlements.filter(({ from, to }) => from === currentUserId || to === currentUserId);
    const personalExpenses = expenses.filter(e => e.paidBy === currentUserId || e.paidTo === currentUserId || (e.shares && e.shares[currentUserId] > 0));

    // Calculate personal share total
    const personalSpentCents = expenses.reduce((sum, e) => {
        if (e.isSettlement) return sum;
        return sum + toCents(e.shares?.[currentUserId] || 0);
    }, 0);
    const personalSpent = personalSpentCents / 100;

    // Total settlements paid
    const settledTotalCents = expenses.filter(e => e.isSettlement).reduce((sum, e) => sum + toCents(e.amount), 0);
    const settledTotal = settledTotalCents / 100;

    // Category Breakdown ("Where it went")
    const categoryTotals = bills.reduce((acc, expense) => {
        const cat = (expense.category || 'other').toLowerCase();
        acc[cat] = (acc[cat] || 0) + toCents(expense.amount);
        return acc;
    }, {});

    const categoryList = Object.entries(categoryTotals)
        .map(([cat, cents]) => ({
            category: cat,
            amount: cents / 100,
            percent: totalCents > 0 ? (cents / totalCents) * 100 : 0,
            icon: categoryIcons[cat] || HelpCircle,
            color: categoryColors[cat] || 'var(--c0)'
        }))
        .sort((a, b) => b.amount - a.amount);

    // Recent Transactions (top 5)
    const recentExpenses = [...expenses].reverse().slice(0, 5);

    // Time of day greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const todayFormatted = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());

    // Cycle 3D card stack
    const cycleCards = () => {
        setCardStackIdx(prev => (prev + 1) % 3);
    };

    const avatar = id => (
        <span
            className="avatar-chip"
            data-hue={getParticipantHue(Math.max(0, participants.findIndex(person => person.id === id)))}
            aria-hidden="true"
        >
            {nameOf(id)[0]?.toUpperCase() || 'M'}
        </span>
    );

    return (
        <div className="view">
            <div className="page ov">
                {/* Verdin Page Header */}
                <header className="phead">
                    <div className="phead__text">
                        <span className="phead__title">
                            <h1>
                                {greeting}, {greetingName}
                                <span className="phead__mark phead__mark--lime" aria-hidden="true"></span>
                            </h1>
                        </span>
                        <p>
                            {todayFormatted} · <span style={{ color: 'var(--lime)' }}>{bills.length} {bills.length === 1 ? 'expense' : 'expenses'}</span> in {periodName}
                        </p>
                    </div>
                    <div className="phead__actions">
                        {onClosePeriod && (
                            <button type="button" className="btn" onClick={onClosePeriod}>
                                <Calendar size={16} /> Close period
                            </button>
                        )}
                        {onAddExpense && (
                            <button type="button" className="btn btn--primary" onClick={onAddExpense}>
                                <Plus size={16} /> Add expense
                            </button>
                        )}
                    </div>
                </header>

                {/* Verdin 2-Column Overview Grid */}
                <div className="ov__grid">
                    {/* Main Column */}
                    <div className="ov__main">
                        {/* Cash Flow / Spending Overview Card */}
                        <section className="card ov__flow" aria-labelledby="fl-h">
                            <div className="chead">
                                <div className="chead__text">
                                    <h2 id="fl-h">Household Cash Flow</h2>
                                    <p>Period spending overview and member settlements.</p>
                                </div>
                                <div className="seg" role="group" aria-label="Filter flow">
                                    <button
                                        type="button"
                                        className={flowFilter === 'all' ? 'active' : ''}
                                        onClick={() => setFlowFilter('all')}
                                    >
                                        All expenses
                                    </button>
                                    <button
                                        type="button"
                                        className={flowFilter === 'personal' ? 'active' : ''}
                                        onClick={() => setFlowFilter('personal')}
                                    >
                                        My share
                                    </button>
                                    <button
                                        type="button"
                                        className={flowFilter === 'settled' ? 'active' : ''}
                                        onClick={() => setFlowFilter('settled')}
                                    >
                                        Settlements
                                    </button>
                                </div>
                            </div>

                            {/* Visual Flow Plot Bars */}
                            <div className="ov__flowplot">
                                <div className="flow__cols">
                                    {(categoryList.length > 0 ? categoryList.slice(0, 6) : [
                                        { category: 'Rent', percent: 65, amount: total * 0.65 },
                                        { category: 'Groceries', percent: 45, amount: total * 0.45 },
                                        { category: 'Utilities', percent: 30, amount: total * 0.3 },
                                        { category: 'Dining', percent: 25, amount: total * 0.25 },
                                        { category: 'Transport', percent: 15, amount: total * 0.15 },
                                        { category: 'Other', percent: 10, amount: total * 0.1 }
                                    ]).map((col, idx) => {
                                        const isEven = idx % 2 === 0;
                                        return (
                                            <button
                                                key={col.category}
                                                type="button"
                                                className="flow__col"
                                                title={`${col.category}: ${formatMoney(col.amount)} (${Math.round(col.percent)}%)`}
                                            >
                                                <div
                                                    className={`flow__bar ${isEven ? '' : 'flow__bar--out'}`}
                                                    style={{ height: `${Math.max(12, Math.min(100, col.percent))}%` }}
                                                />
                                                <small className="flow__x">{col.category.slice(0, 4)}</small>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Summary Totals Row */}
                            <div className="ov__sum" aria-live="polite">
                                <div>
                                    <small><i className="dot dot--in"></i>Total spent</small>
                                    <b>{formatMoney(total)}</b>
                                </div>
                                <div>
                                    <small><i className="dot dot--out"></i>Your share</small>
                                    <b>{formatMoney(personalSpent)}</b>
                                </div>
                                <div>
                                    <small><i className="dot dot--sav"></i>Settled</small>
                                    <b>{formatMoney(settledTotal)}</b>
                                </div>
                                <div className="ov__net">
                                    <small>{personalBalance >= 0 ? 'You are owed' : 'You owe'}</small>
                                    <b>{personalBalance !== undefined ? formatMoney(personalBalance) : '$0.00'}</b>
                                </div>
                            </div>
                        </section>

                        {/* KPI Metric Cards */}
                        <div className="ov__row">
                            <article className="kpi">
                                <span className="kpi__label">
                                    <Wallet size={16} /> Household spending
                                </span>
                                <span className="kpi__value">{formatMoney(total)}</span>
                                <span className="kpi__foot">
                                    <span>{participants.length} {participants.length === 1 ? 'member' : 'members'}</span>
                                    <span className="inpill">
                                        avg {formatMoney(participants.length ? total / participants.length : 0)}
                                    </span>
                                </span>
                            </article>

                            <article className="kpi">
                                <span className="kpi__label">
                                    <Users size={16} /> Your status
                                </span>
                                <span className="kpi__value">
                                    {personalBalance !== undefined ? formatMoney(personalBalance) : '$0.00'}
                                </span>
                                <span className="kpi__foot">
                                    <span>Current period balance</span>
                                    <span className={personalBalance >= 0 ? "inpill" : "outpill"}>
                                        {personalBalance === 0 ? 'Settled' : personalBalance > 0 ? '+ Credit' : '− Due'}
                                    </span>
                                </span>
                            </article>
                        </div>

                        {/* "Where it went" — Category breakdown against budget */}
                        <section className="card" aria-labelledby="bw-h">
                            <div className="chead">
                                <div className="chead__text">
                                    <h2 id="bw-h">Where it went</h2>
                                    <p>Spending categories in this period</p>
                                </div>
                            </div>

                            {categoryList.length === 0 ? (
                                <p style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)', margin: '10px 0' }}>
                                    No category expenses recorded yet for this period.
                                </p>
                            ) : (
                                <ul className="budgets">
                                    {categoryList.map(cat => (
                                        <li key={cat.category} className="budget">
                                            <span className="budget__top">
                                                <span className="catdot" style={{ background: cat.color }}></span>
                                                <b style={{ textTransform: 'capitalize' }}>{cat.category}</b>
                                                <span>
                                                    {formatMoney(cat.amount)} <small>/ {Math.round(cat.percent)}%</small>
                                                </span>
                                            </span>
                                            <span className="meter" role="meter" aria-valuenow={Math.round(cat.percent)} aria-valuemin="0" aria-valuemax="100">
                                                <i style={{ transform: `scaleX(${cat.percent / 100})`, background: cat.color }}></i>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* "Who owes what" — Settlements */}
                        <section className="card" aria-labelledby="cu-h">
                            <div className="chead">
                                <div className="chead__text">
                                    <h2 id="cu-h">Who owes what</h2>
                                    <p>Optimized suggested settlement payments</p>
                                </div>
                                {!unassignedCents && settlements.length > 0 && (
                                    <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                                        {settlements.length} suggested
                                    </span>
                                )}
                            </div>

                            {unassignedCents !== 0 ? (
                                <p className="settlement-warning" role="alert" style={{
                                    padding: '12px 14px', borderRadius: '12px', background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 'var(--fs-sm)'
                                }}>
                                    The recorded shares differ from the bills by {formatMoney(unassignedCents / 100)}. Please review the split shares.
                                </p>
                            ) : settlements.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', color: 'var(--accent)' }}>
                                    <CheckCircle2 size={24} />
                                    <div>
                                        <b style={{ color: 'var(--ink)', fontSize: 'var(--fs-md)' }}>All settled up</b>
                                        <p style={{ color: 'var(--muted)', fontSize: 'var(--fs-xs)', margin: '2px 0 0' }}>
                                            No outstanding debts remain for this period!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <ul className="dues">
                                    {settlements.map(({ from, to, amount }) => {
                                        const isFromMe = from === currentUserId;
                                        const isToMe = to === currentUserId;
                                        const oweHeadline = isFromMe
                                            ? `You owe ${nameOf(to)}`
                                            : isToMe
                                                ? `${nameOf(from)} owes you`
                                                : `${nameOf(from)} owes ${nameOf(to)}`;
                                        const oweSub = isFromMe
                                            ? 'You send direct settlement'
                                            : isToMe
                                                ? 'You receive direct settlement'
                                                : 'Direct transfer settlement';

                                        return (
                                            <li key={from + ':' + to} className="due">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {avatar(from)}
                                                    <ArrowRight size={13} style={{ color: 'var(--muted)' }} />
                                                    {avatar(to)}
                                                </div>
                                                <span className="cell__text">
                                                    <b>{oweHeadline}</b>
                                                    <small>{oweSub}</small>
                                                </span>
                                                <span className="due__amt">
                                                    {formatMoney(amount)}
                                                </span>
                                                {onSettle && (
                                                    <button
                                                        type="button"
                                                        className="mini-btn"
                                                        onClick={() => onSettle(from, to, amount)}
                                                    >
                                                        Settle
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>

                    {/* Verdin Right Overview Panel */}
                    <aside className="ov__panel" aria-label="Cards and quick actions">
                        <div className="panel__head">
                            <h2>Household Cards</h2>
                            <button type="button" className="linkbtn" onClick={cycleCards}>
                                Cycle view
                            </button>
                        </div>

                        {/* Interactive 3D Card Stack */}
                        <div className="cstack">
                            {/* Card 1: Everyday Debit (Green) */}
                            <div
                                className="cstack__card"
                                style={{
                                    transform: cardStackIdx === 0
                                        ? 'translate(0px, 0px) scale(1)'
                                        : cardStackIdx === 1
                                            ? 'translate(0px, -18px) scale(0.94)'
                                            : 'translate(0px, -36px) scale(0.88)',
                                    zIndex: cardStackIdx === 0 ? 10 : cardStackIdx === 1 ? 9 : 8,
                                    opacity: 1
                                }}
                            >
                                <div className="bcard bcard--green" role="img" aria-label="Everyday Household Card">
                                    <i className="bcard__arc"></i>
                                    <i className="bcard__arc"></i>
                                    <div className="bcard__top">
                                        <b>{groupName}</b>
                                        <small>E-Split · Active</small>
                                    </div>
                                    <span className="bcard__chip"></span>
                                    <span className="bcard__num">•••• •••• •••• 4417</span>
                                    <div className="bcard__foot">
                                        <span>{cardholderName}</span>
                                        <span>{periodName}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Personal Split (Deep) */}
                            <div
                                className="cstack__card"
                                style={{
                                    transform: cardStackIdx === 1
                                        ? 'translate(0px, 0px) scale(1)'
                                        : cardStackIdx === 2
                                            ? 'translate(0px, -18px) scale(0.94)'
                                            : 'translate(0px, -36px) scale(0.88)',
                                    zIndex: cardStackIdx === 1 ? 10 : cardStackIdx === 2 ? 9 : 8,
                                    opacity: 1
                                }}
                            >
                                <div className="bcard bcard--deep" role="img" aria-label="Instant Settlement Card">
                                    <i className="bcard__arc"></i>
                                    <i className="bcard__arc"></i>
                                    <div className="bcard__top">
                                        <b>Auto-Split</b>
                                        <small>E-Split · Instant</small>
                                    </div>
                                    <span className="bcard__chip"></span>
                                    <span className="bcard__num">•••• •••• •••• 8820</span>
                                    <div className="bcard__foot">
                                        <span>Instant Ledger</span>
                                        <span>Verified</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Reserve Pool (Lime) */}
                            <div
                                className="cstack__card"
                                style={{
                                    transform: cardStackIdx === 2
                                        ? 'translate(0px, 0px) scale(1)'
                                        : cardStackIdx === 0
                                            ? 'translate(0px, -18px) scale(0.94)'
                                            : 'translate(0px, -36px) scale(0.88)',
                                    zIndex: cardStackIdx === 2 ? 10 : cardStackIdx === 0 ? 9 : 8,
                                    opacity: 1
                                }}
                            >
                                <div className="bcard bcard--lime" role="img" aria-label="Reserve Vault Card">
                                    <i className="bcard__arc"></i>
                                    <i className="bcard__arc"></i>
                                    <div className="bcard__top">
                                        <b>Vault Reserve</b>
                                        <small>Protected Pool</small>
                                    </div>
                                    <span className="bcard__chip"></span>
                                    <span className="bcard__num">•••• •••• •••• 2051</span>
                                    <div className="bcard__foot">
                                        <span>Shared Pool</span>
                                        <span>100% Backed</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="cstack__hit"
                                aria-label="Show next card"
                                onClick={cycleCards}
                            ></button>
                        </div>

                        {/* Balance Overview */}
                        <div className="ov__bal">
                            <small>Total period spending</small>
                            <span className="ov__balfig">{formatMoney(total)}</span>
                            <small>{bills.length} active bills · {participants.length} contributors</small>
                        </div>

                        {/* Quick Actions Row (.qa) */}
                        <div className="qa" role="group" aria-label="Quick actions">
                            <button
                                type="button"
                                className="qa__btn"
                                onClick={onAddExpense}
                                title="Add an expense"
                            >
                                <span><Plus size={20} /></span>
                                Add
                            </button>
                            <button
                                type="button"
                                className="qa__btn"
                                onClick={() => {
                                    if (onSettle) {
                                        if (settlements.length > 0) {
                                            onSettle(settlements[0].from, settlements[0].to, settlements[0].amount);
                                        } else {
                                            onSettle();
                                        }
                                    }
                                }}
                                title="Settle up balances"
                            >
                                <span><ArrowRight size={18} /></span>
                                Settle
                            </button>
                            <button
                                type="button"
                                className="qa__btn"
                                onClick={onClosePeriod}
                                title="Close current period"
                            >
                                <span><Calendar size={18} /></span>
                                Period
                            </button>
                            <button
                                type="button"
                                className="qa__btn"
                                onClick={cycleCards}
                                title="Cycle virtual card"
                            >
                                <span><CreditCard size={18} /></span>
                                Cards
                            </button>
                        </div>

                        {/* Recent Activity Feed (.ov__latest) */}
                        <div className="ov__latest">
                            <div className="panel__head">
                                <h3>Recent activity</h3>
                                <span style={{ color: 'var(--panel-muted)', fontSize: 'var(--fs-2xs)', fontWeight: 600 }}>
                                    Latest {recentExpenses.length}
                                </span>
                            </div>

                            {recentExpenses.length === 0 ? (
                                <p style={{ color: 'var(--panel-muted)', fontSize: 'var(--fs-xs)', padding: '8px' }}>
                                    No activity recorded yet.
                                </p>
                            ) : (
                                recentExpenses.map(item => {
                                    const IconComponent = categoryIcons[(item.category || 'other').toLowerCase()] || HelpCircle;
                                    const isPayout = item.isSettlement;
                                    return (
                                        <div key={item.id} className="tx">
                                            <span className={`catico ${isPayout ? 'catico--in' : ''}`}>
                                                <IconComponent size={16} />
                                            </span>
                                            <span className="cell__text">
                                                <b>{item.description}</b>
                                                <small>{nameOf(item.paidBy)} · {item.date || 'Recent'}</small>
                                            </span>
                                            <span className={`amt ${isPayout ? 'amt--in' : 'amt--out'}`}>
                                                {isPayout ? '+' : '−'}{formatMoney(item.amount)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
