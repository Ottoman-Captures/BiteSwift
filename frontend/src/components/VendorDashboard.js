import React, { useState, useEffect } from 'react';
import API from '../api';

function VendorDashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'settings'
    
    // Vendor Restaurants list
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRest, setSelectedRest] = useState(null);

    // Add Menu Item Form State
    const [mName, setMName] = useState('');
    const [mDescription, setMDescription] = useState('');
    const [mPrice, setMPrice] = useState('');
    const [mCategory, setMCategory] = useState('Mains');
    const [mImage, setMImage] = useState('');
    const [mCalories, setMCalories] = useState('');
    const [mProtein, setMProtein] = useState('');
    const [mCarbs, setMCarbs] = useState('');
    const [mFat, setMFat] = useState('');
    const [mTags, setMTags] = useState('');
    
    const [actionMsg, setActionMsg] = useState(null);

    const fetchVendorData = async () => {
        try {
            // Fetch restaurants owned by this vendor
            const restRes = await API.get(`/restaurants?ownerId=${user.id || user._id}`);
            setRestaurants(restRes.data);
            if (restRes.data.length > 0 && !selectedRest) {
                setSelectedRest(restRes.data[0]);
            }

            // Fetch Vendor Analytics Stats
            const statsRes = await API.get('/orders/vendor-stats');
            setStats(statsRes.data);
            setLoadingStats(false);

            // Fetch Vendor Orders
            const ordersRes = await API.get('/orders');
            setOrders(ordersRes.data);
            setLoadingOrders(false);
        } catch (err) {
            console.error('Error fetching vendor data:', err);
        }
    };

    useEffect(() => {
        fetchVendorData();
    }, [user, selectedRest]);

    const handleToggleIntake = async (param, val) => {
        if (!selectedRest) return;
        try {
            const res = await API.patch(`/restaurants/${selectedRest._id}/toggle`, { [param]: val });
            setSelectedRest(res.data);
            setRestaurants(prev => prev.map(r => r._id === res.data._id ? res.data : r));
            showToast(`Restaurant ${param === 'isPaused' ? 'Order intake paused' : 'operating status updated'}.`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await API.patch(`/orders/${orderId}/status`, { status: newStatus });
            showToast('Order status updated successfully!');
            fetchVendorData(); // reload
        } catch (err) {
            console.error(err);
            showToast('Failed to update status.');
        }
    };

    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        if (!selectedRest) return;

        try {
            await API.post(`/restaurants/${selectedRest._id}/menu`, {
                name: mName,
                description: mDescription,
                price: parseFloat(mPrice),
                category: mCategory,
                image: mImage,
                calories: mCalories ? parseInt(mCalories) : 450,
                protein: mProtein ? parseInt(mProtein) : 20,
                carbs: mCarbs ? parseInt(mCarbs) : 50,
                fat: mFat ? parseInt(mFat) : 15,
                tags: mTags.split(',').map(t => t.trim()).filter(Boolean)
            });
            showToast(`Menu item "${mName}" added successfully!`);
            // Reset form
            setMName('');
            setMDescription('');
            setMPrice('');
            setMImage('');
            setMCalories('');
            setMProtein('');
            setMCarbs('');
            setMFat('');
            setMTags('');
        } catch (err) {
            console.error(err);
            showToast('Failed to add menu item.');
        }
    };

    const showToast = (msg) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(null), 4000);
    };

    // Calculate maximum value for SVG scaling
    const maxRevenue = stats?.chartData?.reduce((max, d) => d.revenue > max ? d.revenue : max, 10) || 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header selection */}
            <div className="welcome-hero" style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Vendor Operations Control</h2>
                    <p>Manage Luigi's Pizzeria, monitor kitchen sales, and verify macro menu recipes.</p>
                </div>
                {restaurants.length > 0 && (
                    <select 
                        className="form-control" 
                        style={{ width: '220px', borderColor: 'var(--secondary)' }}
                        value={selectedRest?._id}
                        onChange={(e) => setSelectedRest(restaurants.find(r => r._id === e.target.value))}
                    >
                        {restaurants.map(r => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Global Actions toast */}
            {actionMsg && (
                <div className="alert alert-success">
                    <span>{actionMsg}</span>
                </div>
            )}

            {/* TAB SELECTORS */}
            <div className="tab-headers">
                <button className={`tab-header-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
                    Incoming Orders
                </button>
                <button className={`tab-header-btn ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
                    Menu Builder
                </button>
                <button className={`tab-header-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    Store Controls
                </button>
            </div>

            {/* TAB CONTROLLERS */}

            {/* ACTIVE INCOMING ORDERS & REVENUE DASHBOARD */}
            {activeTab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* SVG Earnings Charts Panel */}
                    {!loadingStats && stats && (
                        <div className="grid-3">
                            <div className="glass-panel text-center">
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL REVENUE</span>
                                <h3 style={{ fontSize: '2rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                                    ${stats.totalRevenue.toFixed(2)}
                                </h3>
                            </div>
                            <div className="glass-panel text-center">
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL INCOMING</span>
                                <h3 style={{ fontSize: '2rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                                    {stats.totalOrders} Orders
                                </h3>
                            </div>
                            
                            {/* SVG Chart */}
                            <div className="glass-panel" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', height: '140px', padding: '0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                                    SALES GRAPH (LAST 7 DAYS)
                                </span>
                                {stats.chartData?.length > 0 ? (
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <svg viewBox="0 0 300 80" style={{ width: '100%', height: '100%' }}>
                                            {/* Bar Chart drawing */}
                                            {stats.chartData.map((d, index) => {
                                                const x = 20 + index * 40;
                                                const height = (d.revenue / maxRevenue) * 50;
                                                const y = 60 - height;
                                                return (
                                                    <g key={index}>
                                                        <rect 
                                                            x={x} 
                                                            y={y} 
                                                            width="15" 
                                                            height={height} 
                                                            fill="var(--primary)" 
                                                            rx="2"
                                                        />
                                                        <text x={x - 2} y="74" fill="var(--text-muted)" fontSize="6px">
                                                            {d.date.substring(5)}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            <line x1="10" y1="60" x2="290" y2="60" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                                        </svg>
                                    </div>
                                ) : (
                                    <small style={{ color: 'var(--text-muted)' }}>No sales history yet.</small>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Orders Table */}
                    <div className="glass-panel">
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Incoming Kitchen Queue</h3>

                        {loadingOrders ? (
                            <span>Loading live feed...</span>
                        ) : orders.length === 0 ? (
                            <div className="empty-state">
                                <p>No incoming orders in this branch.</p>
                            </div>
                        ) : (
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Date/Time</th>
                                            <th>Address/Contact</th>
                                            <th>Dishes Ordered</th>
                                            <th>Total Paid</th>
                                            <th>Rider assigned</th>
                                            <th>Status</th>
                                            <th>Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => {
                                            const status = o.status || 'placed';
                                            return (
                                                <tr key={o._id}>
                                                    <td>
                                                        {new Date(o.createdAt).toLocaleDateString()}<br/>
                                                        <small style={{ color: 'var(--text-muted)' }}>
                                                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <strong>{o.customer?.name}</strong> (Tel: {o.phone})<br/>
                                                        <small style={{ color: 'var(--text-secondary)' }}>Address: {o.address}</small>
                                                        {o.deliveryNotes && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.1rem' }}>
                                                                📝: {o.deliveryNotes}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '0.85rem' }}>
                                                            {o.items?.map((it, idx) => (
                                                                <div key={idx}>
                                                                    <strong style={{ color: 'var(--primary)' }}>{it.qty}x</strong> {it.menuItem?.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${o.total.toFixed(2)}</td>
                                                    <td>{o.driverId?.name || <small style={{ color: 'var(--text-muted)' }}>Searching...</small>}</td>
                                                    <td>
                                                        <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
                                                    </td>
                                                    <td>
                                                        {status === 'placed' && (
                                                            <button 
                                                                className="btn btn-primary btn-sm" 
                                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                                onClick={() => handleUpdateStatus(o._id, 'confirmed')}
                                                            >
                                                                Confirm Order
                                                            </button>
                                                        )}
                                                        {status === 'confirmed' && (
                                                            <button 
                                                                className="btn btn-primary btn-sm" 
                                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--secondary)', color: '#000' }}
                                                                onClick={() => handleUpdateStatus(o._id, 'preparing')}
                                                            >
                                                                Start Cooking
                                                            </button>
                                                        )}
                                                        {status === 'preparing' && !o.driverId && (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Waiting for Rider...</span>
                                                        )}
                                                        {status === 'preparing' && o.driverId && (
                                                            <button 
                                                                className="btn btn-primary btn-sm" 
                                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--success)' }}
                                                                onClick={() => handleUpdateStatus(o._id, 'picked_up')}
                                                            >
                                                                Handover to Rider
                                                            </button>
                                                        )}
                                                        {status !== 'placed' && status !== 'confirmed' && status !== 'preparing' && (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Out for delivery</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ADD MENU ITEMS FORM */}
            {activeTab === 'menu' && (
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Append Menu Item</h3>
                    
                    <form onSubmit={handleAddMenuItem}>
                        <div className="form-group">
                            <label className="form-label">Dish Name</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Garlic Butter Shrimp"
                                value={mName}
                                onChange={(e) => setMName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea 
                                className="form-control"
                                placeholder="Pan-fried shrimp in creamy garlic lemon glaze..."
                                value={mDescription}
                                onChange={(e) => setMDescription(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Unit Price ($)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    placeholder="14.99"
                                    value={mPrice}
                                    onChange={(e) => setMPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Category</label>
                                <select 
                                    className="form-control"
                                    value={mCategory}
                                    onChange={(e) => setMCategory(e.target.value)}
                                    required
                                >
                                    <option value="Starters">Starters</option>
                                    <option value="Mains">Mains</option>
                                    <option value="Desserts">Desserts</option>
                                    <option value="Drinks">Drinks</option>
                                </select>
                            </div>
                        </div>

                        {/* Nutrition Macros input */}
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                Nutritional Data & Macros
                            </span>
                            <div className="grid-3" style={{ gap: '0.5rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-secondary)' }}>Calories (kcal)</small>
                                    <input type="number" placeholder="450" className="form-control" style={{ padding: '0.3rem' }} value={mCalories} onChange={(e) => setMCalories(e.target.value)} />
                                </div>
                                <div>
                                    <small style={{ color: 'var(--text-secondary)' }}>Protein (g)</small>
                                    <input type="number" placeholder="28" className="form-control" style={{ padding: '0.3rem' }} value={mProtein} onChange={(e) => setMProtein(e.target.value)} />
                                </div>
                                <div>
                                    <small style={{ color: 'var(--text-secondary)' }}>Carbs (g)</small>
                                    <input type="number" placeholder="60" className="form-control" style={{ padding: '0.3rem' }} value={mCarbs} onChange={(e) => setMCarbs(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tags (Comma-separated)</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Best Seller, Spicy, Vegan"
                                value={mTags}
                                onChange={(e) => setMTags(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Thumbnail URL (Optional)</label>
                            <input 
                                type="url"
                                className="form-control"
                                placeholder="https://images.unsplash.com/photo-..."
                                value={mImage}
                                onChange={(e) => setMImage(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>
                            Add Menu Item
                        </button>
                    </form>
                </div>
            )}

            {/* RESTAURANT SETTINGS */}
            {activeTab === 'settings' && selectedRest && (
                <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Branch settings</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Pause Orders toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <strong style={{ color: '#ffffff', display: 'block' }}>Pause Accepting Orders</strong>
                                <small style={{ color: 'var(--text-secondary)' }}>Busy kitchen? Temporarily block customers from checking out.</small>
                            </div>
                            <button 
                                className={`btn ${selectedRest.isPaused ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => handleToggleIntake('isPaused', !selectedRest.isPaused)}
                            >
                                {selectedRest.isPaused ? 'Resume Intake' : 'Pause Intake'}
                            </button>
                        </div>

                        {/* Open/Close status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <strong style={{ color: '#ffffff', display: 'block' }}>Branch operating Status</strong>
                                <small style={{ color: 'var(--text-secondary)' }}>Toggle store active hours status.</small>
                            </div>
                            <button 
                                className={`btn ${selectedRest.isOpen ? 'btn-danger' : 'btn-primary'} btn-sm`}
                                onClick={() => handleToggleIntake('isOpen', !selectedRest.isOpen)}
                            >
                                {selectedRest.isOpen ? 'Force Close' : 'Force Open'}
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Operating Schedule Hours</label>
                            <input 
                                type="text"
                                className="form-control"
                                value={selectedRest.openingHours}
                                onChange={(e) => {
                                    const updated = { ...selectedRest, openingHours: e.target.value };
                                    setSelectedRest(updated);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VendorDashboard;
