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

const interpolateRoute = (start, end, steps = 100) => {
    const points = [];
    const corner = [end[0], start[1]];
    const halfSteps = Math.floor(steps / 2);
    
    for (let i = 0; i <= halfSteps; i++) {
        const t = i / halfSteps;
        points.push([
            start[0] + (corner[0] - start[0]) * t,
            start[1] + (corner[1] - start[1]) * t
        ]);
    }
    for (let i = 1; i <= (steps - halfSteps); i++) {
        const t = i / (steps - halfSteps);
        points.push([
            corner[0] + (end[0] - corner[0]) * t,
            corner[1] + (end[1] - corner[1]) * t
        ]);
    }
    return points;
};

function DriverDashboard({ user }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeJob, setActiveJob] = useState(null);
    const [toastMsg, setToastMsg] = useState(null);
    const mapRef = useRef(null);
    const leafletMapInstance = useRef(null);
    const driverMarkerRef = useRef(null);
    
    // Live simulation states
    const [driverCoords, setDriverCoords] = useState(null);
    const [simulatedStep, setSimulatedStep] = useState(0);

    const fetchJobs = async () => {
        try {
            const res = await API.get('/orders');
            setOrders(res.data);
            
            // Sync active claimed job
            if (activeJob) {
                const updatedActive = res.data.find(o => o._id === activeJob._id);
                if (updatedActive) {
                    if (updatedActive.status === 'delivered' || updatedActive.status === 'cancelled') {
                        setActiveJob(null);
                    } else {
                        // Merge local coords into sync
                        setActiveJob({
                            ...updatedActive,
                            driverLocation: driverCoords ? { lat: driverCoords[0], lng: driverCoords[1] } : updatedActive.driverLocation
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 6000);
        return () => clearInterval(interval);
    }, [activeJob, driverCoords]);

    // Live coordinate simulation timer
    useEffect(() => {
        if (!activeJob) {
            setDriverCoords(null);
            return;
        }
        
        const status = activeJob.status || 'placed';
        if (status !== 'rider_assigned' && status !== 'on_the_way') {
            setDriverCoords(null);
            return;
        }

        const restaurantId = activeJob.restaurant?._id || activeJob.restaurant;
        const restCoords = getRestaurantCoords(restaurantId);
        const custCoords = getCustomerCoords(restCoords, activeJob._id);

        let start, end;
        if (status === 'rider_assigned') {
            // Simulator: Rider starts 1.5km away and drives to restaurant
            start = [restCoords[0] - 0.007, restCoords[1] + 0.007];
            end = restCoords;
        } else {
            // Simulator: Rider drives from restaurant to customer
            start = restCoords;
            end = custCoords;
        }

        const routePoints = interpolateRoute(start, end, 40);
        setSimulatedStep(0);
        setDriverCoords(routePoints[0]);

        const interval = setInterval(() => {
            setSimulatedStep(prev => {
                const next = prev + 1;
                if (next >= routePoints.length) {
                    clearInterval(interval);
                    return prev;
                }
                const coords = routePoints[next];
                setDriverCoords(coords);

                // Push status update with GPS location every 4 steps
                if (next % 4 === 0 || next === routePoints.length - 1) {
                    API.patch(`/orders/${activeJob._id}/status`, {
                        driverLocation: { lat: coords[0], lng: coords[1] }
                    }).catch(err => console.error('Error updating driver location:', err));
                }
                return next;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [activeJob?._id, activeJob?.status]);

    // Update map marker when driver coordinates update
    useEffect(() => {
        if (driverMarkerRef.current && driverCoords) {
            driverMarkerRef.current.setLatLng(driverCoords);
        }
    }, [driverCoords]);

    // Driver Active map loader
    useEffect(() => {
        if (!activeJob) return;

        const loadLeaflet = () => {
            if (!window.L) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);

                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = initMap;
                document.head.appendChild(script);
            } else {
                setTimeout(initMap, 100);
            }
        };

        const initMap = () => {
            const mapContainer = document.getElementById('driver-map');
            if (!mapContainer || !window.L) return;

            const restaurantCoords = getRestaurantCoords(activeJob.restaurant?._id || activeJob.restaurant);
            const customerCoords = getCustomerCoords(restaurantCoords, activeJob._id);

            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
            }

            const map = window.L.map('driver-map').setView(restaurantCoords, 14);
            leafletMapInstance.current = map;

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            const createEmojiIcon = (emoji) => {
                return window.L.divIcon({
                    html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
                    className: 'custom-leaflet-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
            };

            window.L.marker(restaurantCoords, { icon: createEmojiIcon('🍔') })
                .addTo(map)
                .bindPopup(`<b>Restaurant: ${activeJob.restaurant?.name || 'Restaurant'}</b>`);

            window.L.marker(customerCoords, { icon: createEmojiIcon('🏠') })
                .addTo(map)
                .bindPopup(`<b>Customer Address</b><br/>${activeJob.address}`);

            const route = window.L.polyline([restaurantCoords, customerCoords], {
                color: '#ffb703',
                weight: 4,
                opacity: 0.6,
                dashArray: '5, 10'
            }).addTo(map);

            map.fitBounds(route.getBounds(), { padding: [40, 40] });

            // Initialize rider marker
            let startRiderCoords = [...restaurantCoords];
            const status = activeJob.status || 'placed';
            if (status === 'rider_assigned') {
                startRiderCoords = [restaurantCoords[0] - 0.007, restaurantCoords[1] + 0.007];
            } else if (status === 'delivered') {
                startRiderCoords = [...customerCoords];
            } else if (driverCoords) {
                startRiderCoords = [...driverCoords];
            } else if (activeJob.driverLocation && activeJob.driverLocation.lat) {
                startRiderCoords = [activeJob.driverLocation.lat, activeJob.driverLocation.lng];
            }

            const driverMarker = window.L.marker(startRiderCoords, { icon: createEmojiIcon('🛵') })
                .addTo(map)
                .bindPopup('<b>You (Rider)</b>');
            driverMarkerRef.current = driverMarker;
        };

        loadLeaflet();

        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
            }
        };
    }, [activeJob?._id]);

    const handleClaimJob = async (orderId) => {
        try {
            const res = await API.patch(`/orders/${orderId}/status`, { status: 'rider_assigned' });
            setActiveJob(res.data);
            showToast('Delivery job claimed successfully!');
            fetchJobs();
        } catch (err) {
            console.error(err);
            showToast('Failed to claim job.');
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!activeJob) return;
        try {
            const res = await API.patch(`/orders/${activeJob._id}/status`, { status: newStatus });
            setActiveJob(res.data);
            showToast(`Delivery status updated to "${newStatus.replace('_', ' ')}".`);
            fetchJobs();
        } catch (err) {
            console.error(err);
            showToast('Failed to update status.');
        }
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Filter available vs claimed jobs
    const availableJobs = orders.filter(o => !o.driverId && ((o.status || 'placed') === 'confirmed' || (o.status || 'placed') === 'preparing'));
    const claimedJobs = orders.filter(o => o.driverId && o.driverId._id === (user.id || user._id) && (o.status || 'placed') !== 'delivered' && (o.status || 'placed') !== 'cancelled');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="welcome-hero" style={{ padding: '2rem' }}>
                <h2>Rider Dispatch Console</h2>
                <p>Accept nearby orders, simulate route navigation, and update delivery logs.</p>
            </div>

            {toastMsg && (
                <div className="alert alert-success">
                    <span>{toastMsg}</span>
                </div>
            )}

            <div className="grid-3" style={{ alignItems: 'flex-start' }}>
                {/* Available Delivery List */}
                <div className="glass-panel" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Open Deliveries ({availableJobs.length})
                    </h3>

                    {availableJobs.length === 0 ? (
                        <small style={{ color: 'var(--text-muted)' }}>No open delivery requests at this moment.</small>
                    ) : (
                        availableJobs.map(job => (
                            <div 
                                key={job._id}
                                style={{
                                    padding: '0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'rgba(255,255,255,0.01)',
                                    marginBottom: '0.75rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{job.restaurant?.name}</strong>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>$2.99 Fare</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    📍 Deliver to: **{job.address}**
                                </div>
                                <button 
                                    className="btn btn-primary btn-sm btn-block"
                                    style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                                    onClick={() => handleClaimJob(job._id)}
                                >
                                    Claim Job
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Claimed jobs & Dispatch simulation */}
                <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Active Job Dispatch
                    </h3>

                    {activeJob ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start', gap: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Active route
                                    </span>
                                    <h4 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Deliver from {activeJob.restaurant?.name}</h4>
                                    <small style={{ color: 'var(--text-secondary)' }}>Deliver to: **{activeJob.address}** (Tel: {activeJob.phone})</small>
                                </div>
                                <span className={`badge badge-${activeJob.status || 'placed'}`}>
                                    {(activeJob.status || 'placed').replace('_', ' ')}
                                </span>
                            </div>

                            {/* Driver Leaflet Map */}
                            <div 
                                id="driver-map" 
                                style={{ 
                                    height: '240px', 
                                    width: '100%', 
                                    borderRadius: 'var(--radius-sm)', 
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    zIndex: 1
                                }}
                            />

                            {/* Driver Workflow button controllers */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {(activeJob.status || 'placed') === 'rider_assigned' && (
                                    <button className="btn btn-primary btn-block" onClick={() => handleUpdateStatus('picked_up')}>
                                        ✓ Confirm Food Picked Up
                                    </button>
                                )}
                                {(activeJob.status || 'placed') === 'picked_up' && (
                                    <button className="btn btn-primary btn-block" style={{ backgroundColor: 'var(--secondary)', color: '#000' }} onClick={() => handleUpdateStatus('on_the_way')}>
                                        🛵 Start Driving (On the Way)
                                    </button>
                                )}
                                {(activeJob.status || 'placed') === 'on_the_way' && (
                                    <button className="btn btn-primary btn-block" style={{ backgroundColor: 'var(--success)' }} onClick={() => handleUpdateStatus('delivered')}>
                                        ✓ Mark Delivered & Complete Job
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : claimedJobs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p>You have claimed jobs. Select one to start delivery route tracking:</p>
                            {claimedJobs.map(job => (
                                <div 
                                    key={job._id}
                                    onClick={() => setActiveJob(job)}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'rgba(255,255,255,0.01)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <strong>{job.restaurant?.name}</strong> to {job.address} (Status: {job.status || 'placed'})
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Claim an open delivery job from the queue on the left to activate dispatch tracking simulator.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DriverDashboard;
