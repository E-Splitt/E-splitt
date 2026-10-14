import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="flex flex-col h-[600px] themed-card rounded-2xl overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                        <div className="p-4 rounded-2xl mb-3" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
                            <MessageSquare size={24} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>No messages yet</p>
                        <p className="text-xs mt-1">Discuss receipts, trip plans, or settlements with the group.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isMe = msg.userId === currentUser?.id;
                            const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

                            return (
                                <motion.div
                                    key={msg.id || index}
                                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showHeader && !isMe && (
                                            <span className="text-xs font-semibold ml-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                                                {msg.userName}
                                            </span>
                                        )}

                                        <div
                                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                                isMe ? 'text-white rounded-br-sm' : 'rounded-bl-sm'
                                            }`}
                                            style={
                                                isMe
                                                    ? { background: 'var(--brand-gradient)' }
                                                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }
                                            }
                                        >
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                        </div>

                                        <span className="text-[10px] mt-1 mx-1 mono" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-primary)' }}>
                <form onSubmit={handleSubmit} className="flex gap-2.5">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="themed-input flex-1 px-4 py-2.5 rounded-xl text-sm"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="add-btn px-4 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={17} />
                    </motion.button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
