import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SignUp = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if there's a redirected location or group to join
    const joinGroupId = location.state?.joinGroupId;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (!name.trim()) {
            setError('Please enter your name');
            setLoading(false);
            return;
        }

        try {
            const { error: signUpError } = await signUp(email, password, name);

            if (signUpError) {
                setError(signUpError.message);
            } else {
                setSuccess(true);
                // After a short delay, redirect
                setTimeout(() => {
                    if (joinGroupId) {
                        navigate('/app', { state: { joinGroupId } });
                    } else {
                        navigate('/app');
                    }
                }, 2000);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--page)', fontFamily: 'Inter, sans-serif' }}>
                <div className="rounded-2xl shadow-xl w-full max-w-md p-8 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--moss-soft)' }}>
                        <CheckCircle size={32} style={{ color: 'var(--moss)' }} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>Account Created!</h2>
                    <p className="mb-6" style={{ color: 'var(--muted)' }}>
                        Welcome to E-Split! Redirecting you to the app...
                    </p>
                    <Loader className="animate-spin mx-auto" size={24} style={{ color: 'var(--teal)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--page)', fontFamily: 'Inter, sans-serif' }}>
            <div className="rounded-2xl shadow-xl w-full max-w-md p-8" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--line)' }}>
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'var(--teal-soft)' }}>
                        <UserPlus size={32} style={{ color: 'var(--teal)' }} />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
                        Create Account
                    </h1>
                    <p className="mt-2" style={{ color: 'var(--muted)' }}>Join E-Split to manage expenses</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle size={20} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 opacity-50" size={18} style={{ color: 'var(--ink)' }} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="themed-input w-full pl-10 pr-4 py-3 rounded-lg"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

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
                                minLength={6}
                                required
                            />
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>At least 6 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 opacity-50" size={18} style={{ color: 'var(--ink)' }} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="themed-input w-full pl-10 pr-4 py-3 rounded-lg"
                                placeholder="••••••••"
                                required
                            />
                        </div>
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
                                Creating account...
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} />
                                Sign Up
                            </>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                    <p style={{ color: 'var(--muted)' }}>
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            state={{ joinGroupId }} // Preserve join intent
                            className="font-bold hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--teal)' }}
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
