import React, { useState, useEffect } from 'react';
import { X, Lock, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { fetchLogs } from '../services/supabaseService';

function DevDashboard({ isOpen, onClose }) {
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const DEV_PIN = 'admin'; // Simple hardcoded PIN for now

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            loadLogs();
        }
        if (!isOpen) {
            // Reset state on close
            setPin('');
            setIsAuthenticated(false);
            setLogs([]);
            setError('');
        }
    }, [isOpen, isAuthenticated]);

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pin === DEV_PIN) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid PIN');
            setPin('');
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        const data = await fetchLogs();
        setLogs(data);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white">
                    <div className="flex items-center gap-2">
                        <Lock size={20} className="text-yellow-400" />
                        <h2 className="text-lg font-bold">Developer Dashboard</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!isAuthenticated ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="w-full max-w-xs">
                                <h3 className="text-center text-gray-700 font-medium mb-4">Enter Developer PIN</h3>
                                <form onSubmit={handlePinSubmit} className="space-y-4">
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="PIN"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-lg tracking-widest"
                                        autoFocus
                                    />
                                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        Unlock
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Device Access Logs</h3>
                                <button
                                    onClick={loadLogs}
                                    disabled={loading}
                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Screen</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                                                        {log.screen_width < 768 ? <Smartphone size={16} className="text-blue-500" /> : <Monitor size={16} className="text-purple-500" />}
                                                        {log.platform}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {log.screen_width}x{log.screen_height}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                                        {log.group_id || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.user_agent}>
                                                        {log.user_agent}
                                                    </td>
                                                </tr>
                                            ))}
                                            {logs.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                        No logs found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DevDashboard;
