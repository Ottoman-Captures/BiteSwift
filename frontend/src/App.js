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
import BackgroundIngredients from './components/BackgroundIngredients';

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
        <div className="app-container" style={{ position: 'relative' }}>
            <BackgroundIngredients />
            <Navbar 
                user={user} 
                onLogout={handleLogout} 
                currentView={view} 
                setView={setView} 
                cartCount={cart.reduce((sum, it) => sum + it.qty, 0)}
            />

            <main className={`main-content view-${view}`}>
                {/* Auth Page */}
                {view === 'auth' && !user && (
                    <Auth onAuthSuccess={handleAuthSuccess} />
                )}

                {/* Catalog Page (Customer standard layout) */}
                {view === 'catalog' && (
                    <div className="catalog-page">
                        <section className="catalog-hero">
                            <div className="hero-copy">
                                <span className="eyebrow">AI-powered food delivery</span>
                                <h1>Cravings, kitchens, riders, and rewards in one electric dashboard.</h1>
                                <p>
                                    Explore curated restaurants, launch smart meal searches, and checkout with a polished flow built for fast decisions.
                                </p>
                                <div className="hero-actions">
                                    <button className="btn btn-primary" onClick={() => document.getElementById('catalog-explorer')?.scrollIntoView({ behavior: 'smooth' })}>
                                        Explore Restaurants
                                    </button>
                                    {!user && (
                                        <button className="btn btn-secondary" onClick={() => setView('auth')}>
                                            Sign In
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="hero-showcase" aria-hidden="true">
                                <div className="orbit orbit-one"></div>
                                <div className="orbit orbit-two"></div>
                                <div className="hero-dish hero-dish-main">
                                    <span className="dish-steam"></span>
                                    <span>Fresh</span>
                                </div>
                                <div className="hero-metric metric-fast">
                                    <strong>22m</strong>
                                    <span>avg delivery</span>
                                </div>
                                <div className="hero-metric metric-rating">
                                    <strong>4.9</strong>
                                    <span>top kitchens</span>
                                </div>
                                <div className="hero-metric metric-ai">
                                    <strong>AI</strong>
                                    <span>meal finder</span>
                                </div>
                            </div>
                        </section>

                        <section className="catalog-stats" aria-label="BiteSwift highlights">
                            <div><strong>{restaurants.length || '25+'}</strong><span>live restaurants</span></div>
                            <div><strong>5</strong><span>checkout steps</span></div>
                            <div><strong>24/7</strong><span>AI support</span></div>
                            <div><strong>Gold</strong><span>reward wallet</span></div>
                        </section>

                        <div id="catalog-explorer" className="catalog-layout">
                        <div className="catalog-main-column">
                            <RestaurantList 
                                restaurants={restaurants} 
                                setCart={setCart} 
                                cart={cart} 
                            />
                        </div>
                        {user && user.role === 'customer' && (
                            <aside className="cart-sidebar">
                                <Cart 
                                    cart={cart} 
                                    setCart={setCart} 
                                    onOrderPlaced={handleOrderPlaced} 
                                    user={user}
                                />
                            </aside>
                        )}
                        {(!user) && (
                            <aside className="cart-sidebar">
                                <div className="glass-panel sign-in-card text-center">
                                    <span className="card-kicker">Guest mode</span>
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
                            </aside>
                        )}
                        </div>
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
