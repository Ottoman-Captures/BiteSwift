import React, { useState, useEffect, useRef } from 'react';
import API from '../api';

const parseMarkdown = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const renderedLines = [];
    
    lines.forEach((line, lineIdx) => {
        let parts = [{ type: 'text', content: line }];
        
        // 1. Parse Bold (**text**)
        let nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/\*\*(.*?)\*\*/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'bold', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;
        
        // 2. Parse Italic (*text*)
        nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/\*(.*?)\*/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'italic', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;
        
        // 3. Parse Inline Code (`text`)
        nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/`(.*?)`/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'code', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;

        // Map parsed parts to inline components
        const lineContent = parts.map((p, pIdx) => {
            if (p.type === 'bold') {
                return <strong key={pIdx} style={{ fontWeight: '700', color: '#ffffff' }}>{p.content}</strong>;
            }
            if (p.type === 'italic') {
                return <em key={pIdx} style={{ fontStyle: 'italic' }}>{p.content}</em>;
            }
            if (p.type === 'code') {
                return (
                    <code 
                        key={pIdx} 
                        style={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'rgba(255,255,255,0.15)', 
                            padding: '0.1rem 0.3rem', 
                            borderRadius: '4px',
                            fontSize: '0.9em'
                        }}
                    >
                        {p.content}
                    </code>
                );
            }
            return p.content;
        });

        renderedLines.push(<span key={lineIdx}>{lineContent}</span>);
        if (lineIdx < lines.length - 1) {
            renderedLines.push(<br key={`br-${lineIdx}`} />);
        }
    });

    return renderedLines;
};

function AiChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { 
            sender: 'ai', 
            text: "Hello! I am your BiteSwift AI Support Assistant. 🤖\n\nI can help you check order status, cancel active orders for full wallet refunds, or suggest menu recommendations.\n\nTry asking: *'Where is my order?'* or *'Cancel my order'*." 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const userMsg = input.trim();
        if (!userMsg) return;

        // Add user message to state
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await API.post('/ai/support-chat', { message: userMsg });
            setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I am having trouble connecting to the support servers right now. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
            {/* Circular Floating trigger button */}
            <button 
                onClick={toggleChat}
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 16px var(--primary-glow)',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)'
                }}
                title="AI Support Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {/* Chatbot expanded overlay panel */}
            {isOpen && (
                <div 
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        bottom: '70px',
                        right: '0',
                        width: '340px',
                        height: '420px',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🤖</span>
                        <div>
                            <strong style={{ fontSize: '0.9rem', color: '#ffffff', display: 'block' }}>BiteSwift AI Assistant</strong>
                            <small style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block' }}>Online • Virtual Agent</small>
                        </div>
                    </div>

                    {/* Message Log */}
                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        {messages.map((m, idx) => (
                            <div 
                                key={idx}
                                style={{
                                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                                    color: '#ffffff',
                                    padding: '0.6rem 0.8rem',
                                    borderRadius: '12px',
                                    borderTopRightRadius: m.sender === 'user' ? '2px' : '12px',
                                    borderTopLeftRadius: m.sender === 'ai' ? '2px' : '12px',
                                    fontSize: '0.8rem',
                                    maxWidth: '85%',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.4',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                {parseMarkdown(m.text)}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--bg-surface)', padding: '0.5rem 0.8rem', borderRadius: '12px', borderTopLeftRadius: '2px' }}>
                                <span className="typing-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', margin: '0 2px', animation: 'bounce 1s infinite' }}></span>
                                <span className="typing-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', margin: '0 2px', animation: 'bounce 1s infinite 0.2s' }}></span>
                                <span className="typing-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', margin: '0 2px', animation: 'bounce 1s infinite 0.4s' }}></span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="form-control"
                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.4rem 0.75rem', marginLeft: '0.25rem' }}
                            disabled={loading || !input.trim()}
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
            `}</style>
        </div>
    );
}

export default AiChatbot;
