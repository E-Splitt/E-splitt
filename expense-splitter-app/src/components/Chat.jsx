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
        <div className="flex flex-col h-[600px] themed-card rounded-xl overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                        <div className="p-4 rounded-full mb-2" style={{ backgroundColor: 'var(--bg-card-hover)' }}>
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
                                        <span className="text-xs ml-1 mb-1" style={{ color: 'var(--text-muted)' }}>{msg.userName}</span>
                                    )}

                                    <div
                                        className={`px-4 py-2 rounded-2xl shadow-sm ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'rounded-bl-none'
                                            }`}
                                        style={!isMe ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' } : {}}
                                    >
                                        <p className="text-sm">{msg.text}</p>
                                    </div>

                                    <span className="text-[10px] mt-1 mx-1" style={{ color: 'var(--text-muted)' }}>
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
            <div className="p-4" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-primary)' }}>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="themed-input flex-1 px-4 py-2 rounded-full"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
