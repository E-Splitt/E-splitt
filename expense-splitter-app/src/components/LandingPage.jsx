import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap, Users } from 'lucide-react';
import ESplitLogo from './ESplitLogo';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Navigation */}
            <nav className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ESplitLogo size={32} />
                        <span className="text-xl font-bold text-gray-900 tracking-tight">E-Split</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            Log in
                        </Link>
                        <Link
                            to="/signup"
                            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            Sign Up Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="container mx-auto px-6 pt-20 pb-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8">
                    Split expenses, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        not friendships.
                    </span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
                    The easiest way to track shared expenses for trips, housemates, and events.
                    Real-time updates, secure cloud sync, and hassle-free settling up.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/signup"
                        className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                    >
                        Start Splitting Now <ArrowRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Features Grid */}
            <div className="container mx-auto px-6 py-24 bg-white rounded-3xl shadow-xl shadow-gray-100 max-w-6xl mx-6 md:mx-auto">
                <div className="grid md:grid-cols-3 gap-12">
                    {/* Feature 1 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Updates</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Add expenses and see balances update instantly across everyone's devices. No refreshing needed.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-green-600">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Your data is encrypted and stored securely. Only group members can see shared expenses.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600">
                            <Users size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Group Management</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Create multiple groups, invite friends via link, and manage everything in one place.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-24 pb-12 text-center text-gray-400 text-sm">
                <p>© {new Date().getFullYear()} E-Split. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
