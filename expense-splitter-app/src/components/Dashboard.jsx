import React from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ReceiptText, Users, Wallet } from 'lucide-react';
import { calculateSettlements, toCents } from '../utils/splitLogic';
import { getParticipantHue } from '../utils/colors';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatMoney = value => money.format(Math.abs(value));
const getId = value => typeof value === 'object' ? value.id : value;

export default function Dashboard({ participants, balances, settleUp, expenses, currentUserId, onSettle }) {
    const nameOf = id => participants.find(person => person.id === id)?.name || 'Former member';
    const bills = expenses.filter(expense => !expense.isSettlement);
    const total = bills.reduce((sum, expense) => sum + toCents(expense.amount), 0) / 100;
    const unassignedCents = Object.values(balances).reduce((sum, balance) => sum + toCents(balance), 0);
    const settlements = (settleUp ?? calculateSettlements(balances, participants)).map(({ from, to, amt, amount }) => ({
        from: getId(from), to: getId(to), amount: amt ?? amount
    }));
    const personalBalance = balances[currentUserId];
    const personalTransfers = settlements.filter(({ from, to }) => from === currentUserId || to === currentUserId);
    const personalExpenses = expenses.filter(e => e.paidBy === currentUserId || e.paidTo === currentUserId || e.shares?.[currentUserId] > 0);

    const avatar = id => (
        <span className="avatar-chip" data-hue={getParticipantHue(Math.max(0, participants.findIndex(person => person.id === id)))} aria-hidden="true">
            {nameOf(id)[0]}
        </span>
    );

    return (
        <div className="dashboard-overview">
            <section className="overview-cards" aria-label="Period summary">
                <article className="overview-spending">
                    <div className="overview-label"><Wallet size={17} /> Household spending</div>
                    <strong>{formatMoney(total)}</strong>
                    <div className="overview-meta">
                        <span><ReceiptText size={15} /> {bills.length} {bills.length === 1 ? 'expense' : 'expenses'}</span>
                        <span><Users size={15} /> {participants.length} {participants.length === 1 ? 'person' : 'people'}</span>
                    </div>
                </article>
                {personalBalance !== undefined ? (
                    <article className="overview-personal">
                        <p className="overview-label">Your balance</p>
                        <strong>{formatMoney(personalBalance)}</strong>
                        <p className="overview-status" data-credit={personalBalance >= 0}>
                            {personalBalance < 0 ? 'You owe' : personalBalance > 0 ? 'You are owed' : 'Settled up'}
                        </p>
                        {(personalTransfers.length > 0 || personalExpenses.length > 0) && (
                            <details className="overview-detail">
                                <summary>See balance details <ChevronDown size={16} /></summary>
                                {!unassignedCents && <ul>{personalTransfers.map(({ from, to, amount }) => (
                                    <li key={from + ':' + to}>
                                        <span>{from === currentUserId ? `You owe ${nameOf(to)}` : `${nameOf(from)} owes you`}</span>
                                        <b>{formatMoney(amount)}</b>
                                    </li>
                                ))}</ul>}
                                <ul>{personalExpenses.map(expense => (
                                    <li key={expense.id}><span>{expense.description}</span><span>{formatMoney(expense.amount)} total</span></li>
                                ))}</ul>
                            </details>
                        )}
                    </article>
                ) : (
                    <article className="overview-personal">
                        <p className="overview-label">Average per person</p>
                        <strong>{formatMoney(participants.length ? total / participants.length : 0)}</strong>
                    </article>
                )}
            </section>

            <section className="settlement-panel">
                <header className="section-head-row"><h2 className="section-head">Who owes what</h2>
                    {!unassignedCents && settlements.length > 0 && <span>{settlements.length} {settlements.length === 1 ? 'payment' : 'payments'} suggested</span>}
                </header>
                {unassignedCents !== 0 ? (
                    <p className="settlement-warning" role="alert">The recorded shares differ from the bills by {formatMoney(unassignedCents / 100)}. Review the splits before settling.</p>
                ) : settlements.length === 0 ? (
                    <div className="settlement-empty">
                        <CheckCircle2 size={24} />
                        <div><strong>All settled</strong><p>There are no outstanding balances for this period.</p></div>
                    </div>
                ) : (
                    <ul className="settlement-list">
                        {settlements.map(({ from, to, amount }) => (
                            <li key={from + ':' + to}>
                                <div className="settlement-avatars">{avatar(from)}<ArrowRight size={14} />{avatar(to)}</div>
                                <p><strong>{nameOf(from)}</strong> owes <strong>{nameOf(to)}</strong></p>
                                <b>{formatMoney(amount)}</b>
                                {onSettle && <button type="button" className="mini-btn" onClick={() => onSettle(from, to, amount)}>Settle</button>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
