import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap, Users } from 'lucide-react';
import ESplitLogo from './ESplitLogo';

const LandingPage = () => {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--page)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}>
            {/* Navigation */}
            <nav className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ESplitLogo size={32} />
                        <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>E-Split</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="font-medium hover:opacity-75 transition-opacity" style={{ color: 'var(--muted)' }}>
                            Log in
                        </Link>
                        <Link
                            to="/signup"
                            className="px-5 py-2.5 font-bold rounded-lg transition-all"
                            style={{ backgroundColor: 'var(--teal)', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                            Sign Up Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="container mx-auto px-6 pt-20 pb-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                    Split expenses, <br />
                    <span style={{ color: 'var(--teal)' }}>
                        not friendships.
                    </span>
                </h1>
                <p className="text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    The easiest way to track shared expenses for trips, housemates, and events.
                    Real-time updates, secure cloud sync, and hassle-free settling up.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/signup"
                        className="px-8 py-4 text-lg font-bold rounded-xl transition-transform hover:scale-[1.02] flex items-center gap-2"
                        style={{ backgroundColor: 'var(--teal)', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                        Start Splitting Now <ArrowRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Features Grid */}
            <div className="container mx-auto px-6 py-24 rounded-3xl max-w-6xl mx-6 md:mx-auto" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="grid md:grid-cols-3 gap-12">
                    {/* Feature 1 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--gold-soft)', color: 'var(--gold)' }}>
                            <Zap size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>Instant Updates</h3>
                        <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
                            Add expenses and see balances update instantly across everyone's devices. No refreshing needed.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' }}>
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>Secure & Private</h3>
                        <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
                            Your data is encrypted and stored securely. Only group members can see shared expenses.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                            <Users size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>Group Management</h3>
                        <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
                            Create multiple groups, invite friends via link, and manage everything in one place.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-24 pb-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
                <p>© {new Date().getFullYear()} E-Split. All rights reserved.</p>
                <p className="mt-2 space-x-4">
                    <Link to="/privacy" className="hover:underline">Privacy</Link>
                    <Link to="/terms" className="hover:underline">Terms</Link>
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
