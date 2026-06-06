import React, { useState, useEffect, useRef } from 'react';
import API from '../api';

const getRestaurantCoords = (restaurantId) => {
    const coordsMap = {
        '645f8e56a421b8c1992ef201': [31.5204, 74.3587], // Luigi's Pizzeria
        '645f8e56a421b8c1992ef202': [31.5497, 74.3436], // Biryani Express
        '645f8e56a421b8c1992ef203': [31.5126, 74.3482], // Burger & Co
        '645f8e56a421b8c1992ef204': [31.4697, 74.4050], // Wok & Roll
        '645f8e56a421b8c1992ef205': [31.5034, 74.3312], // Delhi Palace
        '645f8e56a421b8c1992ef206': [31.5089, 74.3773]  // Sweet Treats Bakery
    };
    return coordsMap[restaurantId] || [31.5204, 74.3587];
};

const getCustomerCoords = (restaurantCoords, orderId) => {
    let hash = 0;
    const str = orderId || 'default';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (((Math.abs(hash) % 150) - 75) / 10000);
    const lngOffset = (((Math.abs(hash >> 3) % 150) - 75) / 10000);
    
    const finalLatOffset = Math.abs(latOffset) < 0.003 ? 0.006 : latOffset;
    const finalLngOffset = Math.abs(lngOffset) < 0.003 ? -0.006 : lngOffset;

    return [restaurantCoords[0] + finalLatOffset, restaurantCoords[1] + finalLngOffset];
};

function OrderTracker({ activeOrder, setActiveOrder }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const leafletMapInstance = useRef(null);
    const driverMarkerRef = useRef(null);

    const fetchOrders = async () => {
        try {
            const res = await API.get('/orders');
            setOrders(res.data);
            
            if (res.data.length > 0) {
                if (!activeOrder) {
                    const unfinished = res.data.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
                    setActiveOrder(unfinished || res.data[0]);
                } else {
                    const currentUpdated = res.data.find(o => o._id === activeOrder._id);
                    if (currentUpdated) {
                        setActiveOrder(currentUpdated);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching orders:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 6000); // Fast poll for live updates
        return () => clearInterval(interval);
    }, [activeOrder?._id]);

    // Dynamic Leaflet Map loader - Run once per active order ID change
    useEffect(() => {
        if (!activeOrder || (activeOrder.status || 'placed') === 'cancelled') return;

        const loadLeaflet = () => {
            if (!window.L) {
                // Style
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);

                // Script
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = initMap;
                document.head.appendChild(script);
            } else {
                // Make sure container is ready
                setTimeout(initMap, 100);
            }
        };

        const initMap = () => {
            const mapContainer = document.getElementById('delivery-map');
            if (!mapContainer || !window.L) return;

            const restaurantCoords = getRestaurantCoords(activeOrder.restaurant?._id || activeOrder.restaurant);
            const customerCoords = getCustomerCoords(restaurantCoords, activeOrder._id);
            
            // Clean old instance
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
            }

            const map = window.L.map('delivery-map').setView(restaurantCoords, 14);
            leafletMapInstance.current = map;

            // Free OSM Tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Icon Creator
            const createEmojiIcon = (emoji) => {
                return window.L.divIcon({
                    html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
                    className: 'custom-leaflet-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
            };

            // Add Markers
            window.L.marker(restaurantCoords, { icon: createEmojiIcon('🍔') })
                .addTo(map)
                .bindPopup(`<b>${activeOrder.restaurant?.name || 'Restaurant'}</b><br/>Food Pickup Point`);

            window.L.marker(customerCoords, { icon: createEmojiIcon('🏠') })
                .addTo(map)
                .bindPopup(`<b>Delivery Address</b><br/>${activeOrder.address}`);

            // Draw route polyline
            const route = window.L.polyline([restaurantCoords, customerCoords], {
                color: 'var(--primary)',
                weight: 4,
                opacity: 0.6,
                dashArray: '5, 10'
            }).addTo(map);

            // Fit map
            map.fitBounds(route.getBounds(), { padding: [40, 40] });

            // Initialize driver position based on status or coordinates
            const status = activeOrder.status || 'placed';
            if (status !== 'placed' && status !== 'confirmed' && status !== 'preparing') {
                let driverCoords = [...restaurantCoords];
                if (activeOrder.driverLocation && activeOrder.driverLocation.lat) {
                    driverCoords = [activeOrder.driverLocation.lat, activeOrder.driverLocation.lng];
                } else if (status === 'rider_assigned') {
                    driverCoords = [restaurantCoords[0] - 0.007, restaurantCoords[1] + 0.007];
                } else if (status === 'on_the_way') {
                    driverCoords = [
                        (restaurantCoords[0] + customerCoords[0]) / 2,
                        (restaurantCoords[1] + customerCoords[1]) / 2
                    ];
                } else if (status === 'arrived' || status === 'delivered') {
                    driverCoords = [...customerCoords];
                }

                const driverMarker = window.L.marker(driverCoords, { icon: createEmojiIcon('🛵') }).addTo(map);
                driverMarker.bindPopup(`<b>Rider on the Way</b><br/>Status: ${status.replace('_', ' ')}`);
                driverMarkerRef.current = driverMarker;
            }
        };

        loadLeaflet();

        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
                driverMarkerRef.current = null;
            }
        };
    }, [activeOrder?._id]);

    // Live driver coordinate / status update effect to prevent map rebuild
    useEffect(() => {
        if (!window.L || !leafletMapInstance.current || !activeOrder) return;
        
        const status = activeOrder.status || 'placed';
        const restaurantCoords = getRestaurantCoords(activeOrder.restaurant?._id || activeOrder.restaurant);
        const customerCoords = getCustomerCoords(restaurantCoords, activeOrder._id);

        if (status === 'placed' || status === 'confirmed' || status === 'preparing') {
            if (driverMarkerRef.current) {
                driverMarkerRef.current.remove();
                driverMarkerRef.current = null;
            }
            return;
        }

        let newCoords = [...restaurantCoords];
        if (activeOrder.driverLocation && activeOrder.driverLocation.lat) {
            newCoords = [activeOrder.driverLocation.lat, activeOrder.driverLocation.lng];
        } else if (status === 'rider_assigned') {
            newCoords = [restaurantCoords[0] - 0.007, restaurantCoords[1] + 0.007];
        } else if (status === 'on_the_way') {
            newCoords = [
                (restaurantCoords[0] + customerCoords[0]) / 2,
                (restaurantCoords[1] + customerCoords[1]) / 2
            ];
        } else if (status === 'arrived' || status === 'delivered') {
            newCoords = [...customerCoords];
        }

        const createEmojiIcon = (emoji) => {
            return window.L.divIcon({
                html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
                className: 'custom-leaflet-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        };

        if (!driverMarkerRef.current) {
            const driverMarker = window.L.marker(newCoords, { icon: createEmojiIcon('🛵') }).addTo(leafletMapInstance.current);
            driverMarker.bindPopup(`<b>Rider Live Location</b><br/>Status: ${status.replace('_', ' ')}`);
            driverMarkerRef.current = driverMarker;
        } else {
            driverMarkerRef.current.setLatLng(newCoords);
            driverMarkerRef.current.setPopupContent(`<b>Rider Live Location</b><br/>Status: ${status.replace('_', ' ')}`);
        }
    }, [activeOrder?.status, activeOrder?.driverLocation]);

    const statusSteps = ['placed', 'confirmed', 'preparing', 'rider_assigned', 'picked_up', 'on_the_way', 'delivered'];
    const getStatusIndex = (status) => statusSteps.indexOf(status);
    const getProgressWidth = (status) => {
        const idx = getStatusIndex(status);
        if (idx === -1) return 0;
        return (idx / (statusSteps.length - 1)) * 100;
    };

    const getStepStatusClass = (step, currentStatus) => {
        const stepIdx = getStatusIndex(step);
        const currentIdx = getStatusIndex(currentStatus);
        if (stepIdx < currentIdx) return 'completed';
        if (stepIdx === currentIdx) return 'active';
        return '';
    };

    const getEstimatedArrival = (status) => {
        if (status === 'delivered') return 'Delivered';
        if (status === 'cancelled') return 'Cancelled';
        if (status === 'placed' || status === 'confirmed') return '35 - 45 mins';
        if (status === 'preparing') return '25 - 35 mins';
        return '10 - 15 mins';
    };

    if (loading && orders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <span>Syncing live orders...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="welcome-hero">
                <h2>Active Tracker</h2>
                <p>Track your orders, check nutrition macros, or chat with our automated AI assistant.</p>
            </div>

            {orders.length === 0 ? (
                <div className="glass-panel empty-state">
                    <h3>No Orders Registered</h3>
                    <p style={{ marginTop: '0.5rem' }}>Place your first order in the Catalog tab!</p>
                </div>
            ) : (
                <div className="grid-3" style={{ alignItems: 'flex-start' }}>
                    
                    {/* Orders History List Left */}
                    <div className="glass-panel" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Your Orders ({orders.length})
                        </h3>

                        {orders.map(o => {
                            const status = o.status || 'placed';
                            return (
                                <div 
                                    key={o._id}
                                    onClick={() => setActiveOrder(o)}
                                    style={{
                                        padding: '0.85rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid',
                                        borderColor: activeOrder?._id === o._id ? 'var(--primary)' : 'var(--border-color)',
                                        backgroundColor: activeOrder?._id === o._id ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                                        marginBottom: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{o.restaurant?.name || 'Restaurant'}</strong>
                                        <span className={`badge badge-${status}`} style={{ fontSize: '0.65rem' }}>
                                            {status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${o.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active Order details + Map */}
                    {activeOrder ? (
                        <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Tracker Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start', gap: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Realtime Tracking
                                    </span>
                                    <h3 style={{ fontSize: '1.4rem', marginTop: '0.2rem' }}>Order from {activeOrder.restaurant?.name}</h3>
                                    <small style={{ color: 'var(--text-secondary)' }}>ID: <code>{activeOrder._id}</code></small>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated Delivery:</span>
                                    <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                                        {getEstimatedArrival(activeOrder.status || 'placed')}
                                    </h4>
                                </div>
                            </div>

                            {/* Horizontal Progress Timeline */}
                            {(activeOrder.status || 'placed') !== 'cancelled' ? (
                                <div className="tracker-timeline" style={{ margin: '2rem 0' }}>
                                    <div className="timeline-progress-bar" style={{ width: `${getProgressWidth(activeOrder.status || 'placed')}%` }} />
                                    
                                    {statusSteps.map((step, idx) => (
                                        <div key={step} className={`timeline-step ${getStepStatusClass(step, activeOrder.status || 'placed')}`}>
                                            <div className="step-node">
                                                {getStepStatusClass(step, activeOrder.status || 'placed') === 'completed' ? '✓' : idx + 1}
                                            </div>
                                            <div className="step-label" style={{ fontSize: '0.65rem' }}>
                                                {step.replace('_', ' ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="alert alert-danger">
                                    <span>This order was cancelled. A refund has been processed to your BiteSwift Wallet.</span>
                                </div>
                            )}

                            {/* Leaflet Map Block */}
                            {activeOrder.status !== 'cancelled' && (
                                <div>
                                    <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#ffffff' }}>Live Delivery Dispatch Map</h4>
                                    <div 
                                        id="delivery-map" 
                                        style={{ 
                                            height: '240px', 
                                            width: '100%', 
                                            borderRadius: 'var(--radius-sm)', 
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-primary)',
                                            zIndex: 1
                                        }} 
                                    />
                                </div>
                            )}

                            {/* Driver Card Info */}
                            {activeOrder.driverId && (
                                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ fontSize: '2rem' }}>🛵</div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Assigned Rider: {activeOrder.driverId.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Contact: <strong>{activeOrder.driverId.phone || '0312-4567890'}</strong> | Vehicle: Honda CD-70 (REG: LED-9988)
                                        </p>
                                    </div>
                                    <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>4.9 ★</span>
                                </div>
                            )}

                            {/* Items Invoice Details */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#ffffff' }}>Order Summary</h4>
                                {activeOrder.items?.map((it, index) => (
                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px dashed rgba(255,255,255,0.02)' }}>
                                        <span>
                                            <strong style={{ color: 'var(--primary)' }}>{it.qty}x</strong> {it.menuItem?.name}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            ${((it.menuItem?.price || 0) * it.qty).toFixed(2)}
                                        </span>
                                    </div>
                                ))}

                                {/* Billing Math */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>Subtotal:</span>
                                        <span>${(activeOrder.billing?.subtotal || activeOrder.total).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>GST Tax (8%):</span>
                                        <span>${(activeOrder.billing?.tax || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>Delivery:</span>
                                        <span>${(activeOrder.billing?.deliveryFee || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>Cashback Earned (2%):</span>
                                        <span style={{ color: 'var(--success)' }}>
                                            +${((activeOrder.billing?.subtotal || activeOrder.total) * 0.02).toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem', color: '#ffffff' }}>
                                        <span>Total Paid ({activeOrder.paymentMethod?.toUpperCase()}):</span>
                                        <span style={{ color: 'var(--primary)' }}>${activeOrder.total?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="glass-panel empty-state" style={{ gridColumn: 'span 2' }}>
                            <p>Select an order from order history to track details.</p>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

export default OrderTracker;
