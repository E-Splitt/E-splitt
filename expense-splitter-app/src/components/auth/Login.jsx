import React, { useState } from 'react';
import { LogIn, Mail, Lock, Loader, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if there's a redirected location or group to join
    const from = location.state?.from?.pathname || '/app';
    const joinGroupId = location.state?.joinGroupId;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: signInError } = await signIn(email, password);

            if (signInError) {
                setError(signInError.message);
            } else {
                // Determine destination
                if (joinGroupId) {
                    // Redirect to app with join intent
                    navigate('/app', { state: { joinGroupId } });
                } else {
                    // Redirect to original destination or dashboard
                    navigate(from);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--page)', fontFamily: 'Inter, sans-serif' }}>
            <div className="rounded-2xl shadow-xl w-full max-w-md p-8" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--line)' }}>
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'var(--teal-soft)' }}>
                        <LogIn size={32} style={{ color: 'var(--teal)' }} />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
                        E-Split
                    </h1>
                    <p className="mt-2" style={{ color: 'var(--muted)' }}>Welcome back! Sign in to continue</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle size={20} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 opacity-50" size={18} style={{ color: 'var(--ink)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="themed-input w-full pl-10 pr-4 py-3 rounded-lg"
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 opacity-50" size={18} style={{ color: 'var(--ink)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="themed-input w-full pl-10 pr-4 py-3 rounded-lg"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="text-right">
                        <Link
                            to="/forgot-password"
                            className="text-sm font-medium hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--teal)' }}
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--teal)', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                        {loading ? (
                            <>
                                <Loader size={20} className="animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                    <p style={{ color: 'var(--muted)' }}>
                        Don't have an account?{' '}
                        <Link
                            to="/signup"
                            state={{ joinGroupId }} // Preserve join intent
                            className="font-bold hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--teal)' }}
                        >
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
