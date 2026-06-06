import React, { useState } from 'react';
import API from '../api';

function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('customer'); // Default to customer
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const payload = isLogin ? { email, password } : { name, email, password, role };

        try {
            const res = await API.post(endpoint, payload);
            const { token, user } = res.data;
            
            // Save to localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            onAuthSuccess(user, token);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper glass-panel">
            <div className="auth-tabs">
                <div 
                    className={`auth-tab ${isLogin ? 'active' : ''}`} 
                    onClick={() => { setIsLogin(true); setError(null); }}
                >
                    Login
                </div>
                <div 
                    className={`auth-tab ${!isLogin ? 'active' : ''}`} 
                    onClick={() => { setIsLogin(false); setError(null); }}
                >
                    Sign Up
                </div>
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            {error && (
                <div className="alert alert-danger">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            className="form-control"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required={!isLogin}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        className="form-control"
                        placeholder="customer@test.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {!isLogin && (
                    <div className="form-group">
                        <label className="form-label">Register As</label>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="customer"
                                    checked={role === 'customer'}
                                    onChange={() => setRole('customer')}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                <span style={{ fontSize: '0.9rem' }}>Customer</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={role === 'admin'}
                                    onChange={() => setRole('admin')}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                <span style={{ fontSize: '0.9rem' }}>Admin / Restaurant Manager</span>
                            </label>
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="btn btn-primary btn-block" 
                    style={{ marginTop: '1.5rem' }}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isLogin ? (
                    <p>Demo accounts: <strong>customer@test.com</strong> or <strong>admin@test.com</strong> (password: <strong>password123</strong>)</p>
                ) : (
                    <p>Roles allow admin features like changing order status or adding restaurants.</p>
                )}
            </div>
        </div>
    );
}

export default Auth;
