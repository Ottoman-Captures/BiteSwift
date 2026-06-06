import React, { useState, useEffect } from 'react';
import API from '../api';

function AdminDashboard({ restaurants, fetchRestaurants }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [currentTab, setCurrentTab] = useState('orders'); // 'orders', 'restaurant', 'menu', 'promos'
    
    // Add Restaurant form state
    const [rName, setRName] = useState('');
    const [rDescription, setRDescription] = useState('');
    const [rAddress, setRAddress] = useState('');
    const [rCuisine, setRCuisine] = useState('');
    const [rImage, setRImage] = useState('');
    const [rRating, setRRating] = useState('4.5');
    const [rPriceRange, setRPriceRange] = useState('$$');
    const [rOwnerId, setROwnerId] = useState('');
    const [rDeliveryTime, setRDeliveryTime] = useState('20-30');
    const [rMinOrder, setRMinOrder] = useState('10.00');

    // Add Menu Item form state
    const [mRestaurantId, setMRestaurantId] = useState('');
    const [mName, setMName] = useState('');
    const [mDescription, setMDescription] = useState('');
    const [mPrice, setMPrice] = useState('');
    const [mCategory, setMCategory] = useState('Mains');
    const [mImage, setMImage] = useState('');
    
    // Promo/Coupon state
    const [promoCode, setPromoCode] = useState('');
    const [promoType, setPromoType] = useState('percentage');
    const [promoVal, setPromoVal] = useState('');
    
    const [vendors, setVendors] = useState([]);
    const [alertMsg, setAlertMsg] = useState(null);

    const fetchAdminData = async () => {
        try {
            // Load global orders
            const ord = await API.get('/orders');
            setOrders(ord.data);
            setLoadingOrders(false);

            // Fetch vendor users
            // In a real app we can search by role, we will mock or query local users.json
            // Let's seed two static vendor IDs to choose from
            setVendors([
                { id: '645f8e56a421b8c1992ef103', name: 'Ali (Luigi Owner)' },
                { id: '645f8e56a421b8c1992ef104', name: 'Sana (Burger Owner)' }
            ]);
            setROwnerId('645f8e56a421b8c1992ef103');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, [currentTab]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const res = await API.patch(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(prev => prev.map(o => o._id === orderId ? res.data : o));
            showAlert('Order status updated successfully!');
        } catch (e) {
            console.error(e);
            showAlert('Failed to update status.');
        }
    };

    const handleAddRestaurant = async (e) => {
        e.preventDefault();
        try {
            await API.post('/restaurants', {
                name: rName,
                description: rDescription,
                address: rAddress,
                cuisine: rCuisine,
                image: rImage,
                rating: parseFloat(rRating),
                priceRange: rPriceRange,
                ownerId: rOwnerId,
                deliveryTime: rDeliveryTime,
                minimumOrder: parseFloat(rMinOrder)
            });
            showAlert(`Restaurant "${rName}" added successfully!`);
            setRName('');
            setRDescription('');
            setRAddress('');
            setRCuisine('');
            setRImage('');
            fetchRestaurants();
        } catch (e) {
            console.error(e);
            showAlert('Failed to add restaurant.');
        }
    };

    const handleAddPromo = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/promos', {
                code: promoCode,
                discountType: promoType,
                discountValue: parseFloat(promoVal) || 0
            });
            showAlert(`Promo Code "${promoCode.toUpperCase()}" generated successfully and activated globally!`);
            setPromoCode('');
            setPromoVal('');
        } catch (err) {
            console.error(err);
            showAlert(err.response?.data?.msg || 'Failed to generate promo code.');
        }
    };

    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        if (!mRestaurantId) return;
        try {
            await API.post(`/restaurants/${mRestaurantId}/menu`, {
                name: mName,
                description: mDescription,
                price: parseFloat(mPrice),
                category: mCategory,
                image: mImage
            });
            showAlert(`Menu item "${mName}" appended successfully!`);
            setMName('');
            setMDescription('');
            setMPrice('');
            setMImage('');
        } catch (e) {
            console.error(e);
            showAlert('Failed to add menu item.');
        }
    };

    const showAlert = (msg) => {
        setAlertMsg(msg);
        setTimeout(() => setAlertMsg(null), 4000);
    };

    useEffect(() => {
        if (restaurants.length > 0 && !mRestaurantId) {
            setMRestaurantId(restaurants[0]._id);
        }
    }, [restaurants]);

    // Calculate global metrics
    const totalSales = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0);

    return (
        <div>
            <div className="welcome-hero" style={{ padding: '2rem' }}>
                <h2>Platform Administration Terminal</h2>
                <p>Register SaaS vendors, oversee global order dispatches, and configure active campaign coupons.</p>
            </div>

            {/* Dashboard Tabs */}
            <div className="tab-headers">
                <button className={`tab-header-btn ${currentTab === 'orders' ? 'active' : ''}`} onClick={() => setCurrentTab('orders')}>
                    Global Orders
                </button>
                <button className={`tab-header-btn ${currentTab === 'restaurant' ? 'active' : ''}`} onClick={() => setCurrentTab('restaurant')}>
                    Register Restaurant
                </button>
                <button className={`tab-header-btn ${currentTab === 'menu' ? 'active' : ''}`} onClick={() => setCurrentTab('menu')}>
                    Add Menu Items
                </button>
                <button className={`tab-header-btn ${currentTab === 'promos' ? 'active' : ''}`} onClick={() => setCurrentTab('promos')}>
                    Coupon Engine
                </button>
            </div>

            {alertMsg && (
                <div className="alert alert-success">
                    <span>{alertMsg}</span>
                </div>
            )}

            {/* TAB PANELS */}

            {/* GLOBAL ORDERS VIEW */}
            {currentTab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Platform stats */}
                    <div className="grid-3">
                        <div className="glass-panel text-center">
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>GLOBAL PLATFORM SALES</span>
                            <h3 style={{ fontSize: '2rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                                ${totalSales.toFixed(2)}
                            </h3>
                        </div>
                        <div className="glass-panel text-center">
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL DISPATCHED</span>
                            <h3 style={{ fontSize: '2rem', color: '#ffffff', marginTop: '0.25rem' }}>
                                {orders.length} Orders
                            </h3>
                        </div>
                        <div className="glass-panel text-center">
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ACTIVE DRIVERS</span>
                            <h3 style={{ fontSize: '2rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                                1 Rider Online
                            </h3>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Dispatched Sales History</h3>

                        {loadingOrders ? (
                            <span>Loading global history...</span>
                        ) : orders.length === 0 ? (
                            <p>No orders registered in the system database.</p>
                        ) : (
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer details</th>
                                            <th>Branch</th>
                                            <th>Items</th>
                                            <th>Grand Total</th>
                                            <th>Dispatch Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => {
                                            const status = o.status || 'placed';
                                            return (
                                                <tr key={o._id}>
                                                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <strong>{o.customer?.name}</strong><br/>
                                                        <small style={{ color: 'var(--text-secondary)' }}>{o.customer?.email}</small>
                                                    </td>
                                                    <td>{o.restaurant?.name || 'Restaurant'}</td>
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
                                                    <td>
                                                        <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="admin-select"
                                                            value={status}
                                                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                                                        >
                                                            <option value="placed">Placed</option>
                                                            <option value="confirmed">Confirmed</option>
                                                            <option value="preparing">Preparing</option>
                                                            <option value="rider_assigned">Rider Assigned</option>
                                                            <option value="picked_up">Picked Up</option>
                                                            <option value="on_the_way">On the Way</option>
                                                            <option value="delivered">Delivered</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
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

            {/* REGISTER RESTAURANT */}
            {currentTab === 'restaurant' && (
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Register SaaS Restaurant Branch</h3>

                    <form onSubmit={handleAddRestaurant}>
                        <div className="form-group">
                            <label className="form-label">Restaurant Name</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Delhi Palace Saddar"
                                value={rName}
                                onChange={(e) => setRName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cuisine (e.g. Italian / Pizza)</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Indian / Mughlai"
                                value={rCuisine}
                                onChange={(e) => setRCuisine(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Assign SaaS Owner (Vendor)</label>
                                <select 
                                    className="form-control"
                                    value={rOwnerId}
                                    onChange={(e) => setROwnerId(e.target.value)}
                                    required
                                >
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Price Range</label>
                                <select 
                                    className="form-control"
                                    value={rPriceRange}
                                    onChange={(e) => setRPriceRange(e.target.value)}
                                    required
                                >
                                    <option value="$">$ (Low)</option>
                                    <option value="$$">$$ (Medium)</option>
                                    <option value="$$$">$$$ (High)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Min. Order Threshold ($)</label>
                                <input 
                                    type="number"
                                    className="form-control"
                                    value={rMinOrder}
                                    onChange={(e) => setRMinOrder(e.target.value)}
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Est. Delivery Time (mins)</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="20-30"
                                    value={rDeliveryTime}
                                    onChange={(e) => setRDeliveryTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input 
                                type="text"
                                className="form-control"
                                value={rAddress}
                                onChange={(e) => setRAddress(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cover Image URL</label>
                            <input 
                                type="url"
                                className="form-control"
                                value={rImage}
                                onChange={(e) => setRImage(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block">
                            Register Branch
                        </button>
                    </form>
                </div>
            )}

            {/* ADD MENU ITEMS (ADMIN MODE) */}
            {currentTab === 'menu' && (
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Append Menu Item</h3>
                    {restaurants.length === 0 ? (
                        <p>No restaurants registered.</p>
                    ) : (
                        <form onSubmit={handleAddMenuItem}>
                            <div className="form-group">
                                <label className="form-label">Target Restaurant Branch</label>
                                <select 
                                    className="form-control"
                                    value={mRestaurantId}
                                    onChange={(e) => setMRestaurantId(e.target.value)}
                                    required
                                >
                                    {restaurants.map(r => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Item Name</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    value={mName}
                                    onChange={(e) => setMName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-control"
                                    value={mDescription}
                                    onChange={(e) => setMDescription(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Price ($)</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        className="form-control"
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
                                    >
                                        <option value="Starters">Starters</option>
                                        <option value="Mains">Mains</option>
                                        <option value="Desserts">Desserts</option>
                                        <option value="Drinks">Drinks</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-block">Add Item</button>
                        </form>
                    )}
                </div>
            )}

            {/* COUPON CAMPAIGNS MANAGER */}
            {currentTab === 'promos' && (
                <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Create Promo Code Campaigns</h3>

                    <form onSubmit={handleAddPromo}>
                        <div className="form-group">
                            <label className="form-label">Promo Code Code</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="SUMMER50"
                                style={{ textTransform: 'uppercase' }}
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Discount Type</label>
                                <select 
                                    className="form-control"
                                    value={promoType}
                                    onChange={(e) => setPromoType(e.target.value)}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Cash ($)</option>
                                    <option value="free_delivery">Free Delivery</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Discount Value</label>
                                <input 
                                    type="number"
                                    className="form-control"
                                    placeholder="25"
                                    value={promoVal}
                                    onChange={(e) => setPromoVal(e.target.value)}
                                    disabled={promoType === 'free_delivery'}
                                    required={promoType !== 'free_delivery'}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>
                            Activate Coupon
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
