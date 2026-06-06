import React, { useState } from 'react';

function Navbar({ user, onLogout, currentView, setView, cartCount }) {
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Mock realtime notifications list
    const [notifications, setNotifications] = useState([
        { id: 1, text: "🎉 Luigi's Pizzeria confirmed your order!", time: "2m ago" },
        { id: 2, text: "🛵 Rider Shahzad is heading to pick up your food.", time: "1m ago" }
    ]);

    const toggleNotifications = () => setShowNotifications(!showNotifications);

    return (
        <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
            <div className="navbar-brand" onClick={() => setView('catalog')} style={{ cursor: 'pointer' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--primary)' }}>
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Bite<span>Swift</span>
            </div>

            {user ? (
                <div className="navbar-menu">
                    {/* Role-Specific Navigation Buttons */}
                    {user.role === 'customer' && (
                        <>
                            <button 
                                className={`btn btn-sm ${currentView === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setView('catalog')}
                            >
                                Restaurants
                            </button>
                            <button 
                                className={`btn btn-sm ${currentView === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setView('orders')}
                            >
                                Track Orders
                            </button>
                            <button 
                                className={`btn btn-sm ${currentView === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setView('profile')}
                                style={{ borderColor: 'var(--secondary)' }}
                            >
                                Wallet & Rewards
                            </button>
                        </>
                    )}

                    {user.role === 'vendor' && (
                        <button 
                            className={`btn btn-sm ${currentView === 'vendor' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setView('vendor')}
                        >
                            Kitchen Manager
                        </button>
                    )}

                    {user.role === 'driver' && (
                        <button 
                            className={`btn btn-sm ${currentView === 'driver' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setView('driver')}
                        >
                            Rider Dashboard
                        </button>
                    )}

                    {user.role === 'admin' && (
                        <>
                            <button 
                                className={`btn btn-sm ${currentView === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setView('catalog')}
                            >
                                Catalog
                            </button>
                            <button 
                                className={`btn btn-sm ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setView('admin')}
                            >
                                Admin Center
                            </button>
                        </>
                    )}

                    {/* Right utilities: Notifications & Wallet & Session profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
                        
                        {/* Notifications Bell */}
                        {user.role === 'customer' && (
                            <div style={{ position: 'relative' }}>
                                <button 
                                    className="btn btn-sm btn-secondary" 
                                    style={{ padding: '0.4rem', position: 'relative', border: 'none' }}
                                    onClick={toggleNotifications}
                                >
                                    🔔
                                    {notifications.length > 0 && (
                                        <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
                                    )}
                                </button>
                                
                                {showNotifications && (
                                    <div 
                                        className="glass-panel"
                                        style={{
                                            position: 'absolute',
                                            top: '40px',
                                            right: '0',
                                            width: '280px',
                                            padding: '0.75rem',
                                            zIndex: 2000,
                                            boxShadow: 'var(--shadow-lg)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
                                            <strong style={{ fontSize: '0.75rem' }}>Live Alerts</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setNotifications([])}>Clear</span>
                                        </div>
                                        {notifications.length === 0 ? (
                                            <small style={{ color: 'var(--text-secondary)' }}>No new alerts.</small>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.4rem 0', borderBottom: '1px dashed rgba(255,255,255,0.02)' }}>
                                                    {n.text} <br/>
                                                    <small style={{ color: 'var(--text-muted)' }}>{n.time}</small>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Customer Wallet indicator */}
                        {user.role === 'customer' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
                                <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WALLET</small>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                    ${user.walletBalance?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        )}

                        {/* Session Avatar */}
                        <div className="navbar-user-info">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontWeight: '600', color: '#ffffff' }}>{user.name}</span>
                                <span style={{ fontSize: '0.7rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                                    {user.role} {user.isGoldSubscriber ? '• Gold' : ''}
                                </span>
                            </div>
                            <div style={{ 
                                width: '36px', 
                                height: '36px', 
                                borderRadius: '50%', 
                                backgroundColor: user.role === 'admin' ? 'var(--secondary)' : 'var(--primary)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                textTransform: 'uppercase'
                            }}>
                                {user.name.charAt(0)}
                            </div>
                        </div>

                        {/* Logout button */}
                        <button className="btn btn-sm btn-secondary" onClick={onLogout} style={{ border: 'none', padding: '0.4rem 0.6rem' }} title="Logout">
                            ✕
                        </button>
                    </div>
                </div>
            ) : (
                <div className="navbar-menu">
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Welcome to BiteSwift SaaS Platform</span>
                </div>
            )}
        </nav>
    );
}

export default Navbar;
