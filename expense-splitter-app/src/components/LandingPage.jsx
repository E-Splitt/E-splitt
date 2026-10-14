import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, CheckCircle2, Shield, Zap, Users, Sparkles,
    Receipt, TrendingUp, Lock, MessageSquare, RotateCcw,
    Moon, Sun, ChevronRight, Layers, Calculator, Check, Wallet
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import ESplitLogo from './ESplitLogo';
import { useSmoothScroll, useScrollProgress, smoothScrollTo } from '../utils/smoothScroll';

const HERO_DEMO_EXPENSES = [
    { id: 'd1', title: 'Airbnb Lakehouse Tahoe', payer: 'Alex', amount: 840.00, tag: 'Stay', split: 4, hue: 'teal' },
    { id: 'd2', title: 'Whole Foods Groceries & Drinks', payer: 'Maya', amount: 216.40, tag: 'Groceries', split: 4, hue: 'coral' },
    { id: 'd3', title: 'Ski Lift Passes & Gear Rental', payer: 'Jordan', amount: 460.00, tag: 'Activity', split: 4, hue: 'gold' },
    { id: 'd4', title: 'Aprés-Ski Woodfire Dinner', payer: 'Sam', amount: 184.60, tag: 'Food', split: 4, hue: 'moss' },
];

const INITIAL_DEMO_SETTLEMENTS = [
    { id: 's1', from: 'Sam', fromHue: 'moss', to: 'Alex', toHue: 'teal', amount: 240.65 },
    { id: 's2', from: 'Maya', fromHue: 'coral', to: 'Alex', toHue: 'teal', amount: 174.10 },
    { id: 's3', from: 'Maya', fromHue: 'coral', to: 'Jordan', toHue: 'gold', amount: 34.75 },
];

const fadeUpVariant = {
    hidden: { opacity: 0, y: 24 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 260, damping: 26, delay }
    })
};

const LandingPage = () => {
    useSmoothScroll(null, true);
    const { progress, scrolled } = useScrollProgress(20);

    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('e-split-dark-mode');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('e-split-dark-mode', darkMode);
    }, [darkMode]);

    // Interactive Hero Mockup State
    const [demoTab, setDemoTab] = useState('ledger');
    const [demoSettlements, setDemoSettlements] = useState(INITIAL_DEMO_SETTLEMENTS);

    // 3D Perspective Tilt on Hero Mockup
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 25 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 25 });

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    // Interactive Split Calculator State
    const [calcBill, setCalcBill] = useState(480);
    const [calcPeople, setCalcPeople] = useState(4);
    const [calcTip, setCalcTip] = useState(15);

    const totalWithTip = calcBill * (1 + calcTip / 100);
    const perPersonShare = totalWithTip / calcPeople;
    const naiveTransfers = calcPeople * (calcPeople - 1);
    const optimizedTransfers = Math.max(1, calcPeople - 1);

    const handleSettleDemoItem = (id) => {
        setDemoSettlements(prev => prev.filter(item => item.id !== id));
    };

    const handleResetDemo = () => {
        setDemoSettlements(INITIAL_DEMO_SETTLEMENTS);
    };

    return (
        <div
            className="min-h-screen relative saas-mesh-bg selection:bg-indigo-500 selection:text-white"
            style={{ backgroundColor: 'var(--page)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}
        >
            {/* Top Scroll Progress Indicator */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-[3px] z-50 origin-left"
                style={{
                    scaleX: progress,
                    background: 'var(--brand-gradient)'
                }}
            />

            {/* Decorative Architectural Grid */}
            <div className="pointer-events-none fixed inset-0 saas-grid-bg opacity-70" />

            {/* Sticky Glass Navbar */}
            <header
                className={`sticky top-0 z-40 transition-all duration-300 ${
                    scrolled ? 'py-3 saas-glass shadow-lg shadow-black/5' : 'py-5 bg-transparent'
                }`}
            >
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="side-mark" style={{ width: 36, height: 36 }}>
                            <ESplitLogo size={24} />
                        </div>
                        <span
                            className="text-xl font-bold tracking-tight"
                            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}
                        >
                            E-Split
                        </span>
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full saas-shimmer-badge">
                            v2.0 SaaS
                        </span>
                    </div>

                    {/* Smooth Scroll Section Links */}
                    <nav className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                        <button
                            onClick={() => smoothScrollTo('#preview', { offset: -90 })}
                            className="hover:text-indigo-500 transition-colors cursor-pointer bg-transparent border-none"
                            style={{ color: 'inherit' }}
                        >
                            Live Preview
                        </button>
                        <button
                            onClick={() => smoothScrollTo('#features', { offset: -90 })}
                            className="hover:text-indigo-500 transition-colors cursor-pointer bg-transparent border-none"
                            style={{ color: 'inherit' }}
                        >
                            Features
                        </button>
                        <button
                            onClick={() => smoothScrollTo('#calculator', { offset: -90 })}
                            className="hover:text-indigo-500 transition-colors cursor-pointer bg-transparent border-none"
                            style={{ color: 'inherit' }}
                        >
                            Split Calculator
                        </button>
                        <button
                            onClick={() => smoothScrollTo('#workflow', { offset: -90 })}
                            className="hover:text-indigo-500 transition-colors cursor-pointer bg-transparent border-none"
                            style={{ color: 'inherit' }}
                        >
                            How It Works
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setDarkMode(d => !d)}
                            className="icon-btn ghost border"
                            style={{ borderColor: 'var(--line)' }}
                            title="Toggle Theme"
                        >
                            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                        </motion.button>
                        <Link
                            to="/login"
                            className="text-sm font-semibold px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--ink)' }}
                        >
                            Log in
                        </Link>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/signup"
                                className="add-btn text-sm px-4 py-2.5 rounded-xl no-underline"
                            >
                                Sign Up Free <ArrowRight size={15} />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-14 pb-20 md:pt-20 md:pb-28 px-6 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        variants={fadeUpVariant}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7 saas-shimmer-badge"
                    >
                        <Sparkles size={14} />
                        <span>Realtime Cloud Ledger · Minimum-Transfer Debt Solver</span>
                        <ChevronRight size={13} />
                    </motion.div>

                    <motion.h1
                        initial="hidden"
                        animate="visible"
                        custom={0.08}
                        variants={fadeUpVariant}
                        className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.06] mb-6"
                        style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}
                    >
                        Split expenses,{' '}
                        <span className="saas-gradient-text">
                            not friendships.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={0.16}
                        variants={fadeUpVariant}
                        className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
                        style={{ color: 'var(--muted)' }}
                    >
                        The modern financial workspace for shared trips, housemates, and group events.
                        Instant Supabase sync, smart debt simplification, and period archiving—wrapped in a fast, tactile interface.
                    </motion.p>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={0.24}
                        variants={fadeUpVariant}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/signup"
                                className="add-btn px-8 py-4 text-base font-bold rounded-2xl no-underline"
                            >
                                Start Splitting Now <ArrowRight size={19} />
                            </Link>
                        </motion.div>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => smoothScrollTo('#calculator', { offset: -90 })}
                            className="px-7 py-4 text-base font-semibold rounded-2xl border cursor-pointer transition-colors flex items-center gap-2"
                            style={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--line)',
                                color: 'var(--ink)',
                                boxShadow: 'var(--surface-glow)'
                            }}
                        >
                            <Calculator size={18} style={{ color: 'var(--teal)' }} />
                            Try Interactive Split Demo
                        </motion.button>
                    </motion.div>
                </div>

                {/* Interactive 3D-Tilted Live Product Preview */}
                <motion.div
                    id="preview"
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.32 }}
                    className="mt-16 md:mt-20"
                    style={{ perspective: 1200 }}
                >
                    <motion.div
                        ref={cardRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{
                            rotateX,
                            rotateY,
                            transformStyle: 'preserve-3d',
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--line)',
                            boxShadow: 'var(--surface-glow-hover)'
                        }}
                        className="rounded-3xl border overflow-hidden max-w-5xl mx-auto"
                    >
                        {/* Window Chrome Header */}
                        <div
                            className="px-5 py-3.5 border-b flex items-center justify-between"
                            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page-subtle)' }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-rose-400/80" />
                                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                                <span className="ml-3 text-xs font-semibold mono" style={{ color: 'var(--muted)' }}>
                                    app.e-split.io / tahoe-winter- retreat
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--card)' }}>
                                {[
                                    { id: 'ledger', label: 'Live Ledger' },
                                    { id: 'settle', label: `Smart Settle (${demoSettlements.length})` },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDemoTab(t.id)}
                                        className="relative px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer border-none bg-transparent transition-colors"
                                        style={{ color: demoTab === t.id ? 'var(--teal)' : 'var(--muted)' }}
                                    >
                                        {demoTab === t.id && (
                                            <motion.div
                                                layoutId="heroPreviewTab"
                                                className="absolute inset-0 rounded-lg"
                                                style={{ backgroundColor: 'var(--teal-soft)' }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interactive Preview Body */}
                        <div className="p-6 md:p-8 grid lg:grid-cols-12 gap-6 items-start">
                            {/* Left Column: KPI Strip + Active View */}
                            <div className="lg:col-span-8 space-y-5">
                                <div className="grid grid-cols-3 gap-3.5">
                                    <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Total Group Spend</div>
                                        <div className="text-xl sm:text-2xl font-bold mono">$1,701.00</div>
                                        <div className="text-[11px] mt-1 font-medium" style={{ color: 'var(--moss)' }}>● Live synced</div>
                                    </div>
                                    <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Per Person Share</div>
                                        <div className="text-xl sm:text-2xl font-bold mono accent-gold">$425.25</div>
                                        <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>4 active members</div>
                                    </div>
                                    <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Pending Transfers</div>
                                        <div className="text-xl sm:text-2xl font-bold mono" style={{ color: 'var(--teal)' }}>
                                            {demoSettlements.length}
                                        </div>
                                        <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>Simplified from 12</div>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {demoTab === 'ledger' ? (
                                        <motion.div
                                            key="ledger-tab"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2.5"
                                        >
                                            {HERO_DEMO_EXPENSES.map((item, idx) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.06 }}
                                                    whileHover={{ scale: 1.01, x: 3 }}
                                                    className="p-3.5 rounded-xl border flex items-center justify-between"
                                                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="avatar-chip" data-hue={item.hue} style={{ width: 34, height: 34, fontSize: 13 }}>
                                                            {item.payer[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold">{item.title}</div>
                                                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                                                                Paid by <strong>{item.payer}</strong> · Split {item.split} ways ({item.tag})
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="mono font-bold text-sm">${item.amount.toFixed(2)}</div>
                                                        <div className="text-[11px] mono" style={{ color: 'var(--muted)' }}>
                                                            ${(item.amount / item.split).toFixed(2)}/ea
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="settle-tab"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2.5"
                                        >
                                            <AnimatePresence mode="popLayout">
                                                {demoSettlements.length === 0 ? (
                                                    <motion.div
                                                        key="all-settled"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="p-8 rounded-2xl border text-center"
                                                        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                                                    >
                                                        <div className="stamp mx-auto mb-3">
                                                            <Check size={14} /> All Settled Up
                                                        </div>
                                                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                                                            Every balance in Tahoe Winter Retreat is reconciled to $0.00.
                                                        </p>
                                                        <button
                                                            onClick={handleResetDemo}
                                                            className="mini-btn inline-flex items-center gap-1.5"
                                                        >
                                                            <RotateCcw size={13} /> Reset Demo Balances
                                                        </button>
                                                    </motion.div>
                                                ) : (
                                                    demoSettlements.map((s) => (
                                                        <motion.div
                                                            layout
                                                            key={s.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9, x: 30 }}
                                                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                                            className="p-3.5 rounded-xl border flex items-center justify-between"
                                                            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                                                        >
                                                            <div className="flex items-center gap-2.5 text-sm">
                                                                <div className="avatar-chip" data-hue={s.fromHue} style={{ width: 30, height: 30, fontSize: 12 }}>
                                                                    {s.from[0]}
                                                                </div>
                                                                <span className="font-semibold">{s.from}</span>
                                                                <ArrowRight size={14} className="muted" />
                                                                <div className="avatar-chip" data-hue={s.toHue} style={{ width: 30, height: 30, fontSize: 12 }}>
                                                                    {s.to[0]}
                                                                </div>
                                                                <span className="font-semibold">{s.to}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="mono font-bold text-sm amt-coral">${s.amount.toFixed(2)}</span>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.94 }}
                                                                    onClick={() => handleSettleDemoItem(s.id)}
                                                                    className="mini-btn"
                                                                >
                                                                    Mark Paid
                                                                </motion.button>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right Column: Live Member Net Balances */}
                            <div
                                className="lg:col-span-4 p-5 rounded-2xl border space-y-4"
                                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                                        Net Member Standing
                                    </span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                                        Auto-balanced
                                    </span>
                                </div>

                                {[
                                    { name: 'Alex', paid: 840.00, net: +414.75, hue: 'teal', pct: 85 },
                                    { name: 'Jordan', paid: 460.00, net: +34.75, hue: 'gold', pct: 55 },
                                    { name: 'Maya', paid: 216.40, net: -208.85, hue: 'coral', pct: 32 },
                                    { name: 'Sam', paid: 184.60, net: -240.65, hue: 'moss', pct: 26 },
                                ].map((m) => (
                                    <div key={m.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="avatar-chip" data-hue={m.hue} style={{ width: 24, height: 24, fontSize: 10 }}>
                                                    {m.name[0]}
                                                </div>
                                                <span className="font-semibold">{m.name}</span>
                                            </div>
                                            <span
                                                className="mono font-semibold"
                                                style={{ color: m.net >= 0 ? 'var(--moss)' : 'var(--coral)' }}
                                            >
                                                {m.net >= 0 ? `+$${m.net.toFixed(2)}` : `-$${Math.abs(m.net).toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--line)' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${m.pct}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                className="h-full rounded-full"
                                                style={{ background: m.net >= 0 ? 'var(--moss)' : 'var(--coral)' }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-2 border-t text-xs flex items-center justify-between" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                                    <span>Try clicking &ldquo;Smart Settle&rdquo; above</span>
                                    <Sparkles size={13} style={{ color: 'var(--teal)' }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Bento Grid Features Section */}
            <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full saas-shimmer-badge">
                        Engineered for Speed
                    </span>
                    <h2
                        className="text-3xl sm:text-5xl font-bold mt-4 mb-4 tracking-tight"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                        Everything a shared ledger needs. Zero spreadsheet clutter.
                    </h2>
                    <p className="text-base sm:text-lg" style={{ color: 'var(--muted)' }}>
                        Designed like a top-tier fintech product so your group spends less time auditing receipts and more time enjoying the trip.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: 'Instant Realtime Sync',
                            desc: 'Powered by Supabase Postgres Realtime channels. Add a receipt on your phone and watch balances update live across every member’s screen.',
                            badge: 'Sub-100ms WebSocket',
                            hue: 'var(--teal)',
                            bg: 'var(--teal-soft)',
                            span: 'md:col-span-2'
                        },
                        {
                            icon: Layers,
                            title: 'Minimum-Transfer Graph',
                            desc: 'Our greedy debt-simplification engine collapses tangled multi-person IOUs into the fewest possible payments.',
                            badge: 'Smart Solver',
                            hue: 'var(--moss)',
                            bg: 'var(--moss-soft)',
                            span: 'md:col-span-1'
                        },
                        {
                            icon: Receipt,
                            title: 'Tactile Receipt Stubs & Search',
                            desc: 'Filter by category, sort by highest spend, or search by payer with fluid FLIP layout animations and penny-exact remainder distribution.',
                            badge: 'Zero Rounding Drift',
                            hue: 'var(--gold)',
                            bg: 'var(--gold-soft)',
                            span: 'md:col-span-1'
                        },
                        {
                            icon: Shield,
                            title: 'Closable Settlement Periods & PIN Lock',
                            desc: 'Archive monthly rent cycles or trip legs into immutable snapshots, and protect sensitive group ledgers with SHA-256 PIN locks.',
                            badge: 'Period Snapshots',
                            hue: 'var(--coral)',
                            bg: 'var(--coral-soft)',
                            span: 'md:col-span-2'
                        }
                    ].map((feat, idx) => {
                        const Icon = feat.icon;
                        return (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ type: 'spring', stiffness: 240, damping: 24, delay: idx * 0.08 }}
                                whileHover={{ y: -4 }}
                                className={`${feat.span} p-7 rounded-3xl border flex flex-col justify-between transition-shadow`}
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--line)',
                                    boxShadow: 'var(--surface-glow)'
                                }}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                            style={{ backgroundColor: feat.bg, color: feat.hue }}
                                        >
                                            <Icon size={24} />
                                        </div>
                                        <span
                                            className="text-xs font-semibold px-3 py-1 rounded-full"
                                            style={{ backgroundColor: feat.bg, color: feat.hue }}
                                        >
                                            {feat.badge}
                                        </span>
                                    </div>
                                    <h3
                                        className="text-xl font-bold mb-2.5"
                                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                    >
                                        {feat.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                                        {feat.desc}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Interactive Split Calculator Section */}
            <section id="calculator" className="py-20 px-6 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="p-8 md:p-12 rounded-3xl border grid md:grid-cols-12 gap-8 items-center"
                    style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--line)',
                        boxShadow: 'var(--surface-glow-hover)'
                    }}
                >
                    <div className="md:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full saas-shimmer-badge">
                            <Calculator size={13} /> Interactive Sandbox
                        </div>
                        <h2
                            className="text-2xl sm:text-4xl font-bold tracking-tight"
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                            Test the instant split & transfer optimizer
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                            Drag the sliders below to see how E-Split computes exact per-person shares and reduces group reimbursement chaos.
                        </p>

                        <div className="space-y-4 pt-2">
                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1.5">
                                    <span style={{ color: 'var(--muted)' }}>Shared Bill / Trip Subtotal</span>
                                    <span className="mono text-sm">${calcBill}</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="2400"
                                    step="20"
                                    value={calcBill}
                                    onChange={(e) => setCalcBill(Number(e.target.value))}
                                    className="w-full accent-indigo-600 cursor-pointer"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span style={{ color: 'var(--muted)' }}>Group Size</span>
                                        <span className="mono text-sm">{calcPeople} people</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="10"
                                        step="1"
                                        value={calcPeople}
                                        onChange={(e) => setCalcPeople(Number(e.target.value))}
                                        className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span style={{ color: 'var(--muted)' }}>Tax & Tip %</span>
                                        <span className="mono text-sm">{calcTip}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="25"
                                        step="1"
                                        value={calcTip}
                                        onChange={(e) => setCalcTip(Number(e.target.value))}
                                        className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="md:col-span-5 p-6 rounded-2xl border space-y-5"
                        style={{ backgroundColor: 'var(--page)', borderColor: 'var(--line)' }}
                    >
                        <div>
                            <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                                Each Person Pays
                            </div>
                            <motion.div
                                key={perPersonShare.toFixed(2)}
                                initial={{ scale: 0.96, opacity: 0.7 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-4xl font-extrabold mono saas-gradient-text"
                            >
                                ${perPersonShare.toFixed(2)}
                            </motion.div>
                            <div className="text-xs mt-1 mono" style={{ color: 'var(--muted)' }}>
                                Total w/ tax & tip: ${totalWithTip.toFixed(2)}
                            </div>
                        </div>

                        <div className="pt-4 border-t space-y-2.5 text-xs" style={{ borderColor: 'var(--line)' }}>
                            <div className="flex justify-between items-center">
                                <span style={{ color: 'var(--muted)' }}>Unoptimized peer-to-peer IOUs:</span>
                                <span className="mono line-through" style={{ color: 'var(--coral)' }}>{naiveTransfers} transfers</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">E-Split Minimum Settlement:</span>
                                <span className="mono font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' }}>
                                    {optimizedTransfers} transfers ({Math.round((1 - optimizedTransfers / naiveTransfers) * 100)}% fewer)
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/signup"
                            className="add-btn full no-underline text-center justify-center"
                        >
                            Create This Group Free <ArrowRight size={16} />
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* How It Works Section */}
            <section id="workflow" className="py-20 px-6 max-w-6xl mx-auto">
                <div className="text-center max-w-xl mx-auto mb-14">
                    <h2
                        className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                        Three steps to zero awkward money talks
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
                        Set up a group in 15 seconds, share an invite link, and let the ledger handle the math.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            step: '01',
                            title: 'Create & Invite via Link',
                            desc: 'Spin up a group for your apartment, ski trip, or dinner club and share a one-click invite URL.'
                        },
                        {
                            step: '02',
                            title: 'Log Expenses in Seconds',
                            desc: 'Use Quick Add on the dashboard or full split customization with automatic penny-remainder balancing.'
                        },
                        {
                            step: '03',
                            title: 'Settle & Archive Period',
                            desc: 'Record one-tap settlements and close out the billing period into a permanent, searchable archive.'
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 rounded-2xl border relative"
                            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)', boxShadow: 'var(--surface-glow)' }}
                        >
                            <div className="mono text-xs font-bold mb-3 px-2.5 py-1 rounded-lg inline-block" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                                STEP {item.step}
                            </div>
                            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {item.title}
                            </h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-12 border-t py-12 px-6 text-center text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ESplitLogo size={24} />
                        <span className="font-bold" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
                            E-Split
                        </span>
                        <span>© {new Date().getFullYear()} All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="hover:underline" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
                        <Link to="/terms" className="hover:underline" style={{ color: 'var(--muted)' }}>Terms of Service</Link>
                        <Link to="/login" className="hover:underline font-medium" style={{ color: 'var(--teal)' }}>Launch App →</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
