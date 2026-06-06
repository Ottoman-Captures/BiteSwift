import React, { useEffect, useState } from 'react';
import API from './api';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import RestaurantList from './components/RestaurantList';
import Cart from './components/Cart';
import OrderTracker from './components/OrderTracker';
import CustomerProfile from './components/CustomerProfile';
import VendorDashboard from './components/VendorDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import AiChatbot from './components/AiChatbot';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [cart, setCart] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);
    const [view, setView] = useState('catalog'); // 'catalog', 'auth', 'orders', 'admin', 'profile', 'vendor', 'driver'
    const [loadingSession, setLoadingSession] = useState(true);

    const fetchRestaurants = async () => {
        try {
            const r = await API.get('/restaurants');
            setRestaurants(r.data);
        } catch (e) {
            console.error('Error fetching restaurants:', e);
        }
    };

    // Check active session on startup
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            
            // Verify token with backend
            API.get('/auth/me')
                .then(res => {
                    setUser(res.data);
                    // Redirect based on role on startup
                    const role = res.data.role;
                    if (role === 'vendor') setView('vendor');
                    else if (role === 'driver') setView('driver');
                    else if (role === 'admin') setView('admin');
                    else setView('catalog');
                    
                    setLoadingSession(false);
                })
                .catch(err => {
                    console.error('Session verification failed:', err);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                    setView('auth');
                    setLoadingSession(false);
                });
        } else {
            setView('auth');
            setLoadingSession(false);
        }
        
        fetchRestaurants();
    }, []);

    const handleAuthSuccess = (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        
        // Redirect depending on user role
        if (authUser.role === 'vendor') setView('vendor');
        else if (authUser.role === 'driver') setView('driver');
        else if (authUser.role === 'admin') setView('admin');
        else setView('catalog');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        setCart([]);
        setActiveOrder(null);
        setView('auth');
    };

    const handleOrderPlaced = (placedOrder) => {
        setActiveOrder(placedOrder);
        // Deduct order total from customer wallet locally for instant feedback if COD wasn't selected
        if (placedOrder.paymentMethod !== 'cod') {
            const newBal = Math.round((user.walletBalance - placedOrder.total) * 100) / 100;
            const updated = { ...user, walletBalance: newBal >= 0 ? newBal : 0 };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
        }
        setView('orders');
    };

    const handleUpdateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    if (loadingSession) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
                <div className="loading-spinner" style={{ 
                    width: '50px', 
                    height: '50px', 
                    border: '5px solid rgba(255,255,255,0.1)', 
                    borderTopColor: 'var(--primary)', 
                    borderRadius: '50%',
                    marginBottom: '1.5rem',
                    animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Loading BiteSwift SaaS...</span>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Navbar 
                user={user} 
                onLogout={handleLogout} 
                currentView={view} 
                setView={setView} 
                cartCount={cart.reduce((sum, it) => sum + it.qty, 0)}
            />

            <main className="main-content">
                {/* Auth Page */}
                {view === 'auth' && !user && (
                    <Auth onAuthSuccess={handleAuthSuccess} />
                )}

                {/* Catalog Page (Customer standard layout) */}
                {view === 'catalog' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        <div style={{ flex: '3 1 600px' }}>
                            <RestaurantList 
                                restaurants={restaurants} 
                                setCart={setCart} 
                                cart={cart} 
                            />
                        </div>
                        {user && user.role === 'customer' && (
                            <div style={{ flex: '1.2 1 300px', position: 'sticky', top: '90px', alignSelf: 'flex-start' }}>
                                <Cart 
                                    cart={cart} 
                                    setCart={setCart} 
                                    onOrderPlaced={handleOrderPlaced} 
                                    user={user}
                                />
                            </div>
                        )}
                        {(!user) && (
                            <div style={{ flex: '1.2 1 300px', position: 'sticky', top: '90px', alignSelf: 'flex-start' }}>
                                <div className="glass-panel text-center" style={{ padding: '2rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Start Ordering</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Sign in to select payment options, apply coupons, and track deliveries.
                                    </p>
                                    <button 
                                        className="btn btn-primary btn-sm btn-block" 
                                        style={{ marginTop: '1.25rem' }}
                                        onClick={() => setView('auth')}
                                    >
                                        Go to Sign In
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Active Tracking Page */}
                {view === 'orders' && user && (
                    <OrderTracker 
                        activeOrder={activeOrder} 
                        setActiveOrder={setActiveOrder} 
                    />
                )}

                {/* Customer Rewards Profile */}
                {view === 'profile' && user && (
                    <CustomerProfile 
                        user={user} 
                        onUpdateUser={handleUpdateUser}
                    />
                )}

                {/* Vendor Portal */}
                {view === 'vendor' && user && user.role === 'vendor' && (
                    <VendorDashboard user={user} />
                )}

                {/* Driver Portal */}
                {view === 'driver' && user && user.role === 'driver' && (
                    <DriverDashboard user={user} />
                )}

                {/* System Admin Control */}
                {view === 'admin' && user && user.role === 'admin' && (
                    <AdminDashboard 
                        restaurants={restaurants} 
                        fetchRestaurants={fetchRestaurants} 
                    />
                )}
            </main>

            {/* AI support overlay chatbot (only for customer sessions) */}
            {user && user.role === 'customer' && (
                <AiChatbot />
            )}
        </div>
    );
}

export default App;
