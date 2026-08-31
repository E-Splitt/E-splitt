import React, { useState } from 'react';
import { Lock, Unlock, X } from 'lucide-react';

const PinModal = ({ isOpen, onClose, onSubmit, mode = 'enter', groupName }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'set') {
            if (pin.length !== 4 || !/^\d+$/.test(pin)) {
                setError('PIN must be exactly 4 digits');
                return;
            }
            if (pin !== confirmPin) {
                setError('PINs do not match');
                return;
            }
        } else {
            if (pin.length !== 4) {
                setError('Please enter 4 digits');
                return;
            }
        }

        onSubmit(pin);
        setPin('');
        setConfirmPin('');
    };

    const handleClose = () => {
        setPin('');
        setConfirmPin('');
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={handleClose}>
            <div className="rounded-xl shadow-xl max-w-md w-full themed-card" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {mode === 'set' ? <Lock size={24} style={{ color: 'var(--accent-indigo)' }} /> : <Unlock size={24} style={{ color: 'var(--accent-indigo)' }} />}
                            {mode === 'set' ? 'Set PIN' : 'Enter PIN'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="transition-colors hover:opacity-75 p-1 rounded-lg"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {groupName && (
                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                            {mode === 'set'
                                ? `Protect "${groupName}" with a 4-digit PIN`
                                : `"${groupName}" is locked. Enter PIN to access.`
                            }
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                {mode === 'set' ? 'Create PIN (4 digits)' : 'Enter PIN'}
                            </label>
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="themed-input w-full p-3 rounded-lg text-center text-2xl tracking-widest"
                                placeholder="••••"
                                autoFocus
                            />
                        </div>

                        {mode === 'set' && (
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    Confirm PIN
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                    className="themed-input w-full p-3 rounded-lg text-center text-2xl tracking-widest"
                                    placeholder="••••"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 rounded-lg transition-colors font-medium"
                                style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                {mode === 'set' ? 'Set PIN' : 'Unlock'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PinModal;
