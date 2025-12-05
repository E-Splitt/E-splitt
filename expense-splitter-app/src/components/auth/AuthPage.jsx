import React, { useState } from 'react';
import Login from './Login';
import SignUp from './SignUp';
import ForgotPassword from './ForgotPassword';

const AuthPage = () => {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'

    if (mode === 'signup') {
        return <SignUp onToggleLogin={() => setMode('login')} />;
    }

    if (mode === 'forgot') {
        return <ForgotPassword onBack={() => setMode('login')} />;
    }

    return (
        <Login
            onToggleSignup={() => setMode('signup')}
            onToggleForgotPassword={() => setMode('forgot')}
        />
    );
};

export default AuthPage;
