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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {mode === 'set' ? <Lock size={24} /> : <Unlock size={24} />}
                            {mode === 'set' ? 'Set PIN' : 'Enter PIN'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {groupName && (
                        <p className="text-sm text-gray-600 mb-4">
                            {mode === 'set'
                                ? `Protect "${groupName}" with a 4-digit PIN`
                                : `"${groupName}" is locked. Enter PIN to access.`
                            }
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {mode === 'set' ? 'Create PIN (4 digits)' : 'Enter PIN'}
                            </label>
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••"
                                autoFocus
                            />
                        </div>

                        {mode === 'set' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm PIN
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="••••"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
