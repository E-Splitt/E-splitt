import React, { useState } from 'react';
import { UserPlus, X, Trash2 } from 'lucide-react';

const ParticipantManager = ({ participants, onAdd, onRemove }) => {
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const newParticipant = {
            id: `user_${Date.now()}`,
            name: newName.trim(),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };

        onAdd(newParticipant);
        setNewName('');
        setIsAdding(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Participants</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium"
                >
                    <UserPlus size={16} />
                    Add Person
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter name..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAdding(false);
                            setNewName('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                </form>
            )}

            <div className="space-y-2">
                {participants.map(person => (
                    <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: person.color || '#6366f1' }}
                            >
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{person.name}</span>
                        </div>
                        <button
                            onClick={() => onRemove(person.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove participant"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {participants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No participants yet. Add someone to get started!
                </div>
            )}
        </div>
    );
};

export default ParticipantManager;
