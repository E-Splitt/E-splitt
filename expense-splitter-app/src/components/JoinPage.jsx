import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, ArrowRight, Loader } from 'lucide-react';

// Join Page: Landing for shared links (e.g., /join/g_12345)
const JoinPage = () => {
    const { groupId } = useParams();
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            // Pass the groupId in state so App.jsx can switch to it
            navigate('/app', { state: { joinGroupId: groupId } });
        }
    }, [user, loading, navigate, groupId]);

    // Logged-in users are being redirected; everyone else sees the "Join Group" landing UI
    if (loading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
                    <Users className="text-white" size={32} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    You've been invited!
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Join this group to start splitting expenses.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-6">
                        <Link
                            to="/signup"
                            state={{ joinGroupId: groupId }} // Pass groupId to signup
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Create Account to Join
                        </Link>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/login"
                            state={{ joinGroupId: groupId }} // Pass groupId to login
                            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinPage;
