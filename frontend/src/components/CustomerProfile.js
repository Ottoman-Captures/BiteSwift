import React, { useState } from 'react';
import API from '../api';

function CustomerProfile({ user, onUpdateUser }) {
    const [submitting, setSubmitting] = useState(false);
    const [amount, setAmount] = useState('');
    const [funding, setFunding] = useState(false);

    const subscribeGold = async () => {
        setSubmitting(true);
        try {
            const res = await API.post('/auth/subscribe-gold');
            onUpdateUser(res.data.user);
            alert('Congratulations! You are now a BiteSwift Gold Member. Enjoy free delivery on all orders!');
        } catch (e) {
            console.error(e);
            alert('Failed to subscribe. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        const topUpVal = parseFloat(amount);
        if (isNaN(topUpVal) || topUpVal <= 0) return alert('Enter a valid amount.');

        setFunding(true);
        try {
            const res = await API.post('/auth/top-up', { amount: topUpVal });
            localStorage.setItem('user', JSON.stringify(res.data.user));
            onUpdateUser(res.data.user);
            alert(`$${topUpVal.toFixed(2)} topped up successfully!`);
            setAmount('');
        } catch (err) {
            console.error(err);
            alert('Failed to top up wallet. Please try again.');
        } finally {
            setFunding(false);
        }
    };

    const achievementsList = [
        { name: 'Account Created', icon: '🎉', desc: 'Welcome to BiteSwift!' },
        { name: 'First Feast', icon: '🍔', desc: 'Placed your first food order.' },
        { name: 'Food Explorer', icon: '🧭', desc: 'Placed 10 or more orders across restaurants.' },
        { name: 'BiteSwift Gold', icon: '👑', desc: 'Subscribed to premium membership.' },
        { name: 'Refund Handled', icon: '🛡️', desc: 'Successfully cancelled an order with instant AI refund.' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Gold Membership Header Banner */}
            <div 
                className="glass-panel" 
                style={{ 
                    background: user.isGoldSubscriber 
                        ? 'linear-gradient(135deg, rgba(255, 183, 3, 0.15) 0%, rgba(20, 20, 26, 0.75) 100%)' 
                        : 'var(--bg-glass)',
                    borderColor: user.isGoldSubscriber ? 'var(--secondary)' : 'var(--border-color)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        fontSize: '2.5rem', 
                        animation: user.isGoldSubscriber ? 'float 3s ease-in-out infinite' : 'none' 
                    }}>
                        👑
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            BiteSwift Gold
                            {user.isGoldSubscriber && (
                                <span className="badge badge-confirmed" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>
                                    Active Member
                                </span>
                            )}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', maxWidth: '500px' }}>
                            Unlock premium benefits: **$0 Unlimited Free Delivery** on all participating local kitchens, priority order handling, and exclusive menu discounts.
                        </p>
                    </div>
                </div>

                <div>
                    {user.isGoldSubscriber ? (
                        <div style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            ✓ Active Subscription ($9.99/mo)
                        </div>
                    ) : (
                        <button 
                            className="btn btn-primary" 
                            style={{ backgroundColor: 'var(--secondary)', color: '#000000', fontWeight: '700', boxShadow: '0 4px 14px var(--secondary-glow)' }}
                            onClick={subscribeGold}
                            disabled={submitting}
                        >
                            {submitting ? 'Subscribing...' : 'Get Gold for $9.99/mo'}
                        </button>
                    )}
                </div>
            </div>

            {/* Wallet & Loyalty Cards */}
            <div className="grid-2">
                {/* Wallet Balance Card */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                        </svg>
                        Digital Wallet Balance
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '1rem 0' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                            ${user.walletBalance.toFixed(2)}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>USD Credits</span>
                    </div>

                    <form onSubmit={handleTopUp} style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input
                            type="number"
                            step="1.00"
                            min="1.00"
                            placeholder="Add amount (e.g. $10)"
                            className="form-control"
                            style={{ flex: 1 }}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-secondary btn-sm" disabled={funding}>
                            {funding ? 'Funding...' : 'Top Up Wallet'}
                        </button>
                    </form>
                    <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Earn **2% instant cashback** credited automatically to this wallet on every order.
                    </small>
                </div>

                {/* Loyalty Point Tracker */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c-.107-.193-.3-.32-.516-.32h-1.89c-.217 0-.41.127-.517.32l-3.8 6.84a.582.582 0 00.517.87h7.6a.582.582 0 00.517-.87l-2.416-4.35z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.24-4.39A2 2 0 0012 3H8a2 2 0 00-1.76 3.11L12.5 18H20l2-7.5"/>
                        </svg>
                        Loyalty point Rewards
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '1rem 0' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                            {user.loyaltyPoints}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Points</span>
                    </div>

                    <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-surface)', borderRadius: '99px', overflow: 'hidden', margin: '1.5rem 0 0.5rem' }}>
                        <div style={{ 
                            height: '100%', 
                            width: `${Math.min((user.loyaltyPoints / 1000) * 100, 100)}%`, 
                            backgroundColor: 'var(--secondary)',
                            borderRadius: '99px',
                            transition: 'width 0.5s ease-in-out'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Next Tier: Gold Rewards</span>
                        <span>{user.loyaltyPoints} / 1000 pts</span>
                    </div>
                </div>
            </div>

            {/* Achievements Section */}
            <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    Unlocked Achievements ({achievementsList.filter(a => user.achievements?.includes(a.name)).length} / {achievementsList.length})
                </h3>

                <div className="grid-3" style={{ gap: '1rem' }}>
                    {achievementsList.map(ach => {
                        const isUnlocked = user.achievements?.includes(ach.name);
                        return (
                            <div 
                                key={ach.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid',
                                    borderColor: isUnlocked ? 'var(--border-color)' : 'transparent',
                                    backgroundColor: isUnlocked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.002)',
                                    opacity: isUnlocked ? 1 : 0.45,
                                    transition: 'var(--transition-fast)'
                                }}
                            >
                                <span style={{ fontSize: '1.75rem' }}>{isUnlocked ? ach.icon : '🔒'}</span>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: isUnlocked ? '#ffffff' : 'var(--text-secondary)' }}>{ach.name}</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ach.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>
        </div>
    );
}

export default CustomerProfile;
