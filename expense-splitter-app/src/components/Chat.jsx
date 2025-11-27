import React, { useState, useEffect, useRef } from 'react';
import { Send, User } from 'lucide-react';

function Chat({ messages = [], currentUser, onSendMessage }) {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        onSendMessage(newMessage.trim());
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="bg-gray-100 p-4 rounded-full mb-2">
                            <Send size={24} />
                        </div>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.userId === currentUser?.id;
                        const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

                        return (
                            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {showHeader && !isMe && (
                                        <span className="text-xs text-gray-500 ml-1 mb-1">{msg.userName}</span>
                                    )}

                                    <div
                                        className={`px-4 py-2 rounded-2xl shadow-sm ${isMe
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.text}</p>
                                    </div>

                                    <span className="text-[10px] text-gray-400 mt-1 mx-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
