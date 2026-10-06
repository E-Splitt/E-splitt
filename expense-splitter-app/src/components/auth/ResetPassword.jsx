import React, { useState, useEffect } from 'react';
import { Lock, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState('');

    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const initRecoverySession = async () => {
            const hash = window.location.hash?.startsWith('#')
                ? window.location.hash.slice(1)
                : '';
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            if (accessToken && refreshToken && type === 'recovery') {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (cancelled) return;
                if (sessionError) {
                    setSessionError('This reset link is invalid or has expired. Request a new one.');
                    return;
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (cancelled) return;
            if (session) {
                setSessionReady(true);
            } else {
                setSessionError('Open the password reset link from your email, or request a new reset.');
            }
        };

        initRecoverySession();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await updatePassword(password);
            if (updateError) {
                setError(updateError.message);
            } else {
                setSuccess(true);
                setTimeout(() => navigate('/login', { replace: true }), 2500);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (sessionError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <AlertCircle className="text-amber-500 mx-auto mb-4" size={40} />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Reset link required</h2>
                    <p className="text-gray-600 mb-6">{sessionError}</p>
                    <Link
                        to="/forgot-password"
                        className="text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                        Request a new reset email
                    </Link>
                </div>
            </div>
        );
    }

    if (!sessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <CheckCircle className="text-green-600 mx-auto mb-4" size={40} />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h2>
                    <p className="text-gray-600">Redirecting you to sign in…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a new password</h2>
                <p className="text-gray-600 mb-6 text-sm">Enter a new password for your account.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="animate-spin" size={20} /> : 'Update password'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                        Back to login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
