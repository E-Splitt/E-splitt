import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDown, ArrowRight, Check, ChevronDown, CircleHelp, House,
    Moon, ReceiptText, RotateCcw, ShoppingBasket, Sun, Wifi
} from 'lucide-react';
import ESplitLogo from './ESplitLogo';
import { allocateCents, calculateBalances, calculateSettlements } from '../utils/splitLogic';

const people = [{ id: 'maya', name: 'Maya' }, { id: 'jordan', name: 'Jordan' }, { id: 'alex', name: 'Alex' }];
const bills = [
    { id: 'rent', description: 'November rent', date: 'Nov 1', paidBy: 'maya', amount: 1800, icon: House },
    { id: 'groceries', description: 'Groceries', date: 'Nov 6', paidBy: 'jordan', amount: 126.4, icon: ShoppingBasket },
    { id: 'wifi', description: 'Wi-Fi', date: 'Nov 9', paidBy: 'alex', amount: 72, icon: Wifi }
].map(bill => ({ ...bill, shares: allocateCents(Math.round(bill.amount * 100), people.map(person => person.id)) }));

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
const { balances } = calculateBalances(bills, people);
const exampleTransfers = calculateSettlements(balances, people);
const nameOf = id => people.find(person => person.id === id)?.name;

export default function LandingPage() {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('e-split-dark-mode') === 'true');
    const [view, setView] = useState('expenses');
    const [paid, setPaid] = useState([]);
    const [bill, setBill] = useState('120');
    const [count, setCount] = useState('3');
    const [tip, setTip] = useState('0');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('e-split-dark-mode', darkMode);
    }, [darkMode]);

    const splitTotal = Math.round(Number(bill) * (1 + Number(tip) / 100) * 100);
    const peopleCount = Number(count);
    const valid = Number.isSafeInteger(splitTotal) && splitTotal >= 0
        && Number(tip) >= 0 && Number.isInteger(peopleCount) && peopleCount >= 1 && peopleCount <= 100;
    const estimate = valid ? money.format(splitTotal / 100 / peopleCount) : '—';

    return (
        <div className="public-page">
            <header className="public-header">
                <div className="public-frame public-navigation">
                    <Link className="brand-link" to="/" aria-label="E-Split home"><ESplitLogo /> <span>E-Split</span></Link>
                    <nav className="public-links" aria-label="Main navigation">
                        <a href="#how-it-works">How it works</a>
                        <a href="#calculator">Split calculator</a>
                    </nav>
                    <div className="public-actions">
                        <button type="button" className="icon-btn ghost" onClick={() => setDarkMode(!darkMode)}
                            aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}>
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <Link className="text-link" to="/login">Sign in</Link>
                        <Link className="add-btn public-header-cta" to="/signup">Get started <ArrowRight size={16} /></Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="public-frame landing-hero">
                    <div className="landing-intro">
                        <p className="landing-context"><House size={15} /> Shared expenses for households</p>
                        <h1>Split the bills.<br />Keep the <em>peace.</em></h1>
                        <p className="landing-lede">From rent to the last grocery run, see what everyone paid and who owes what. Close out the month and keep a history you can go back to.</p>
                        <div className="landing-actions">
                            <Link to="/signup" className="add-btn">Create a group <ArrowRight size={18} /></Link>
                            <a href="#household-example" className="secondary-button">See an example <ArrowDown size={16} /></a>
                        </div>
                    </div>

                    <section className="household-example" id="household-example" aria-label="Interactive example household">
                        <div className="example-panel">
                            <header className="example-header">
                                <span className="example-icon"><House size={20} /></span>
                                <div><h2>Maple House</h2><p>November · 3 people</p></div>
                                <span className="example-label">Sample group</span>
                            </header>
                            <div className="example-summary">
                                <div><span>Household spending</span><strong>{money.format(total)}</strong></div>
                                <div className="example-avatars" aria-label="Maya, Jordan, and Alex">
                                    {people.map((person, i) => <span key={person.id} className="avatar-chip" data-hue={['teal', 'gold', 'coral'][i]}>{person.name[0]}</span>)}
                                </div>
                            </div>
                            <div className="example-tabs" aria-label="Example views">
                                <button type="button" aria-pressed={view === 'expenses'} onClick={() => setView('expenses')}>Expenses</button>
                                <button type="button" aria-pressed={view === 'balances'} onClick={() => setView('balances')}>Who owes what</button>
                            </div>
                            <ul className="example-rows">
                                {view === 'expenses' ? bills.map(({ id, icon: Icon, description, date, paidBy, amount }) => (
                                    <li key={id}>
                                        <span className="example-row-icon"><Icon size={17} /></span>
                                        <div><strong>{description}</strong><small>{date} · {nameOf(paidBy)} paid</small></div>
                                        <b>{money.format(amount)}</b>
                                    </li>
                                )) : exampleTransfers.map(({ from, to, amount }) => (
                                    <li key={from.id}>
                                        <span className="example-row-icon"><ArrowRight size={17} /></span>
                                        <div><strong>{from.name} to {to.name}</strong><small>{money.format(amount)}</small></div>
                                        <button type="button" className="mini-btn" disabled={paid.includes(from.id)}
                                            onClick={() => setPaid(current => [...current, from.id])}>
                                            {paid.includes(from.id) ? <><Check size={14} /> Recorded</> : 'Record payment'}
                                        </button>
                                    </li>
                                ))}
                                {view === 'balances' && paid.length > 0 && <li className="example-reset"><button type="button" className="text-link" onClick={() => setPaid([])}><RotateCcw size={14} /> Reset example</button></li>}
                            </ul>
                        </div>
                    </section>
                </section>

                <section id="how-it-works" className="landing-workflow">
                    <div className="public-frame">
                        <h2>A shared routine for shared bills</h2>
                        <div className="workflow-grid">
                            <article><House size={23} /><h3>Set up your household</h3><p>Create a group, add your roommates, and share the invite link.</p></article>
                            <article><ReceiptText size={23} /><h3>Log bills as they come in</h3><p>Choose who paid and split by equal shares, exact amounts, percentages, or weights.</p></article>
                            <article><Check size={23} /><h3>Settle up and close the month</h3><p>Record payments and archive the period. Correct missed bills later with a visible change history.</p></article>
                        </div>
                    </div>
                </section>

                <section id="calculator" className="public-frame landing-calculator">
                    <div><h2>Splitting one bill?</h2><p>Get a quick estimate for an even split, including the tip.</p></div>
                    <div className="calculator-panel">
                        <div className="calculator-fields">
                            <label>Bill amount ($)<input type="number" min="0" step="0.01" value={bill} onChange={e => setBill(e.target.value)} /></label>
                            <label>People<input type="number" min="1" max="100" value={count} onChange={e => setCount(e.target.value)} /></label>
                            <label>Tip (%)<input type="number" min="0" value={tip} onChange={e => setTip(e.target.value)} /></label>
                        </div>
                        <output aria-live="polite"><small>Approx. per person</small><strong>{estimate}</strong></output>
                    </div>
                    <details className="calculator-note"><summary><CircleHelp size={17} /> How are leftover cents handled? <ChevronDown size={16} /></summary><p>When you save a bill in a group, E-Split distributes leftover cents so everyone’s share adds up to the bill total.</p></details>
                </section>
            </main>

            <footer className="public-footer">
                <div className="public-frame">
                    <Link className="brand-link" to="/"><ESplitLogo size={28} /> E-Split</Link>
                    <div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Sign in</Link></div>
                </div>
            </footer>
        </div>
    );
}
