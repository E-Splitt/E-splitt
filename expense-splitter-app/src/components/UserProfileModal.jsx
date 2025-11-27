import React, { useState, useEffect } from 'react';
import { User, Check } from 'lucide-react';

const AVATAR_COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500', 'bg-slate-500'
];

function UserProfileModal({ isOpen, onSave, initialProfile = null }) {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialProfile) {
                setName(initialProfile.name);
                setSelectedColor(initialProfile.color);
            } else {
                // Random default color
                const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
                setSelectedColor(randomColor);
            }
        }
    }, [isOpen, initialProfile]);

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        const profile = {
            id: initialProfile?.id || generateId(), // Generate ID if new
            name: name.trim(),
            color: selectedColor
        };

        // Save to local storage
        localStorage.setItem('userProfile', JSON.stringify(profile));

        onSave(profile);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {initialProfile ? 'Edit Profile' : 'Welcome!'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {initialProfile
                            ? 'Update your profile details.'
                            : 'Please set up your profile to continue. This will be used to identify you in the group.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setError('');
                                    }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Enter your name"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Choose Avatar Color
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {AVATAR_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-10 h-10 rounded-full ${color} flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                            }`}
                                    >
                                        {selectedColor === color && <Check size={16} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {initialProfile ? 'Save Changes' : 'Get Started'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default UserProfileModal;
