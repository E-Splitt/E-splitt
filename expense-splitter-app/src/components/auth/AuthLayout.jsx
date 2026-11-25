import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, House } from 'lucide-react';
import ESplitLogo from '../ESplitLogo';

export default function AuthLayout({ children }) {
    return (
        <main className="auth-layout">
            <aside className="auth-aside">
                <Link to="/" className="brand-link"><ESplitLogo /> E-Split</Link>
                <div className="auth-aside-content">
                    <House size={28} strokeWidth={1.5} />
                    <h2>Keep the household in balance.</h2>
                    <p>Shared bills, clear balances, and a record of every month.</p>
                </div>
            </aside>
            <div className="auth-body">
                <Link to="/" className="auth-back text-link"><ArrowLeft size={16} /> Back to E-Split</Link>
                {children}
            </div>
        </main>
    );
}
