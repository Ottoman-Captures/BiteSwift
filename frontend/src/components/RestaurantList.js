import React, { useState, useEffect } from 'react';
import API from '../api';

function RestaurantList({ restaurants, setCart, cart }) {
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [menu, setMenu] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Advanced Filters
    const [selectedCuisine, setSelectedCuisine] = useState('All');
    const [priceFilter, setPriceFilter] = useState('All');
    const [ratingFilter, setRatingFilter] = useState('All');
    const [sortOption, setSortOption] = useState('rating'); // 'rating', 'time', 'price'
    
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // AI Smart Search Prompt State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResults, setAiResults] = useState([]);
    const [searchingAi, setSearchingAi] = useState(false);

    const openMenu = async (restaurant) => {
        setLoadingMenu(true);
        setSelectedRestaurant(restaurant);
        setReviewSummary(null);
        try {
            const res = await API.get(`/restaurants/${restaurant._id}/menu`);
            setMenu(res.data);
        } catch (e) {
            console.error('Error fetching menu:', e);
        } finally {
            setLoadingMenu(false);
        }
    };

    const handleAiSearch = async (e) => {
        e.preventDefault();
        if (!aiPrompt.trim()) return;
        setSearchingAi(true);
        setAiResults([]);
        try {
            const res = await API.post('/ai/search', { query: aiPrompt });
            setAiResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingAi(false);
        }
    };

    const getReviewSummary = async () => {
        if (!selectedRestaurant) return;
        setLoadingSummary(true);
        try {
            const res = await API.post('/ai/summarize-reviews', {
                rating: selectedRestaurant.rating,
                name: selectedRestaurant.name
            });
            setReviewSummary(res.data.summary);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSummary(false);
        }
    };

    const addToCart = (item, restName, restId) => {
        const targetRestId = restId || selectedRestaurant?._id;
        const targetRestName = restName || selectedRestaurant?.name;

        if (!targetRestId) return;

        // Warn if adding items from different restaurant
        if (cart.length > 0 && cart[0].restaurantId !== targetRestId) {
            const confirmClear = window.confirm(
                `Your cart contains items from "${cart[0].restaurantName}". Would you like to clear it to add items from "${targetRestName}"?`
            );
            if (confirmClear) {
                setCart([{
                    menuItemId: item._id,
                    name: item.name,
                    price: item.price,
                    qty: 1,
                    restaurantId: targetRestId,
                    restaurantName: targetRestName
                }]);
            }
            return;
        }

        setCart(prev => {
            const found = prev.find(p => p.menuItemId === item._id);
            if (found) {
                return prev.map(p => p.menuItemId === item._id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { 
                menuItemId: item._id, 
                name: item.name, 
                price: item.price, 
                qty: 1,
                restaurantId: targetRestId,
                restaurantName: targetRestName
            }];
        });
    };

    // Filter Restaurants
    const filteredRestaurants = restaurants.filter(r => {
        // Text Search
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()));

        // Cuisine Chip
        let matchesCuisine = true;
        if (selectedCuisine !== 'All') {
            matchesCuisine = r.cuisine && r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase());
        }

        // Price Filter
        let matchesPrice = true;
        if (priceFilter !== 'All') {
            matchesPrice = r.priceRange === priceFilter;
        }

        // Rating Filter
        let matchesRating = true;
        if (ratingFilter !== 'All') {
            const minRating = parseFloat(ratingFilter);
            matchesRating = r.rating >= minRating;
        }

        return matchesSearch && matchesCuisine && matchesPrice && matchesRating;
    });

    // Sort Restaurants
    const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
        if (sortOption === 'rating') {
            return b.rating - a.rating;
        }
        if (sortOption === 'time') {
            const timeA = parseInt(a.deliveryTime.split('-')[0]) || 30;
            const timeB = parseInt(b.deliveryTime.split('-')[0]) || 30;
            return timeA - timeB;
        }
        if (sortOption === 'price') {
            return a.priceRange.length - b.priceRange.length;
        }
        return 0;
    });

    // Group Menu Items
    const categories = ['Starters', 'Mains', 'Desserts', 'Drinks'];
    const groupedMenu = menu.reduce((acc, item) => {
        const cat = item.category || 'Mains';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const cuisinesList = ['All', 'Pakistani', 'Indian', 'Chinese', 'Italian', 'Fast Food', 'Desserts'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* AI Prompter Section */}
            <div className="glass-panel" style={{ 
                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(20, 20, 26, 0.75) 100%)',
                borderColor: 'var(--border-focus)'
            }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI Meal Finder
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Type your cravings in natural language. Try: *"Spicy burgers under $15"* or *"High protein dinner"* or *"Desserts with chocolate"*.
                </p>

                <form onSubmit={handleAiSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="What are you craving today?"
                        className="form-control"
                        style={{ flex: 1 }}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={searchingAi}>
                        {searchingAi ? 'AI Thinking...' : 'Find Matches'}
                    </button>
                </form>

                {aiResults.length > 0 && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>AI SUGGESTED DISHES:</span>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', border: 'none' }}
                                onClick={() => setAiResults([])}
                            >
                                Clear
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {aiResults.map(item => (
                                <div 
                                    key={item._id}
                                    style={{
                                        minWidth: '220px',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                            {item.name}
                                        </span>
                                        <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem' }}>${item.price.toFixed(2)}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From: **{item.restaurant?.name}**</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                            🔥 {item.calories} kcal
                                        </span>
                                        {item.tags?.slice(0, 1).map(t => (
                                            <span key={t} style={{ fontSize: '0.65rem', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        className="btn btn-primary btn-sm btn-block"
                                        style={{ fontSize: '0.75rem', padding: '0.2rem', marginTop: '0.5rem' }}
                                        onClick={() => addToCart(item, item.restaurant?.name, item.restaurant?._id)}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Split Grid Catalog & Menu */}
            <div className="catalog-split">
                
                {/* Catalog Listing */}
                <div className="restaurants-section">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-heading)' }}>
                            Culinary Hub
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Gourmet dishes delivered straight to your door.
                        </p>
                    </div>

                    {/* Catalog Filters Bar */}
                    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Cuisine Chips */}
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                            {cuisinesList.map(c => (
                                <button
                                    key={c}
                                    className={`cuisine-filter-btn ${selectedCuisine === c ? 'active' : ''}`}
                                    onClick={() => setSelectedCuisine(c)}
                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        {/* Dropdown Filters & Search */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search restaurant or dish..."
                                className="form-control"
                                style={{ flex: 1, minWidth: '200px', padding: '0.5rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {/* Price selector */}
                            <select 
                                className="form-control" 
                                style={{ width: '120px', padding: '0.5rem' }}
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                            >
                                <option value="All">All Prices</option>
                                <option value="$">$ (Low)</option>
                                <option value="$$">$$ (Medium)</option>
                                <option value="$$$">$$$ (High)</option>
                            </select>

                            {/* Rating Selector */}
                            <select 
                                className="form-control" 
                                style={{ width: '120px', padding: '0.5rem' }}
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                            >
                                <option value="All">All Ratings</option>
                                <option value="4.5">4.5+ ★</option>
                                <option value="4.8">4.8+ ★</option>
                            </select>

                            {/* Sort Selector */}
                            <select 
                                className="form-control" 
                                style={{ width: '150px', padding: '0.5rem', borderColor: 'var(--primary)' }}
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <option value="rating">Rating (Highest)</option>
                                <option value="time">Delivery Time</option>
                                <option value="price">Price level</option>
                            </select>
                        </div>
                    </div>

                    {sortedRestaurants.length === 0 ? (
                        <div className="glass-panel empty-state">
                            <h3>No Restaurants match filters</h3>
                            <p style={{ marginTop: '0.5rem' }}>Adjust price filters or search queries.</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {sortedRestaurants.map(r => (
                                <div 
                                    key={r._id}
                                    className={`glass-panel restaurant-card ${selectedRestaurant?._id === r._id ? 'active' : ''}`}
                                    style={{ 
                                        padding: 0,
                                        borderColor: selectedRestaurant?._id === r._id ? 'var(--primary)' : 'var(--border-color)',
                                        boxShadow: selectedRestaurant?._id === r._id ? '0 0 15px var(--primary-glow)' : 'var(--shadow-sm)',
                                        opacity: (!r.isOpen || r.isPaused) ? 0.6 : 1
                                    }}
                                >
                                    <div className="restaurant-image-container">
                                        <img src={r.image} alt={r.name} className="restaurant-image" />
                                        <span className="restaurant-cuisine">{r.cuisine}</span>
                                        {r.isFeatured && (
                                            <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'var(--secondary)', color: '#000', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                                Featured
                                            </span>
                                        )}
                                        {(!r.isOpen || r.isPaused) && (
                                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem', color: '#ff4d4d' }}>
                                                {r.isPaused ? 'BUSY (PAUSED)' : 'CLOSED'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="restaurant-details">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <h3>{r.name}</h3>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', color: 'var(--secondary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                ★ {r.rating.toFixed(1)}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0.8rem' }}>{r.description}</p>
                                        
                                        {/* Meta Indicators */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                                            <span>⏱️ {r.deliveryTime} mins</span>
                                            <span>🛵 ${r.deliveryFee.toFixed(2)} delivery</span>
                                            <span>💰 {r.priceRange}</span>
                                        </div>

                                        <button 
                                            className="btn btn-primary btn-sm btn-block"
                                            style={{ marginTop: 'auto' }}
                                            onClick={() => openMenu(r)}
                                            disabled={!r.isOpen}
                                        >
                                            Browse Menu
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Menu display on right side */}
                <div className="menu-section">
                    {selectedRestaurant ? (
                        <div className="glass-panel">
                            
                            {/* Menu Title Block */}
                            <div className="menu-header-bar">
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Viewing Menu
                                    </span>
                                    <h3 style={{ fontSize: '1.35rem' }}>{selectedRestaurant.name}</h3>
                                    <small style={{ color: 'var(--text-secondary)' }}>Min. order: **${selectedRestaurant.minimumOrder}**</small>
                                </div>
                                <button className="btn btn-secondary btn-sm" style={{ border: 'none' }} onClick={() => setSelectedRestaurant(null)}>
                                    Close
                                </button>
                            </div>

                            {/* AI Review summary button */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                {reviewSummary ? (
                                    <div className="glass-panel" style={{ fontSize: '0.85rem', border: '1px dashed var(--secondary-glow)', padding: '0.75rem', backgroundColor: 'rgba(255, 183, 3, 0.02)' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span>📝 AI Reviews Summary:</span>
                                            <span style={{ cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }} onClick={() => setReviewSummary(null)}>Dismiss</span>
                                        </div>
                                        {reviewSummary}
                                    </div>
                                ) : (
                                    <button 
                                        className="btn btn-secondary btn-sm btn-block" 
                                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', borderStyle: 'dashed' }}
                                        onClick={getReviewSummary}
                                        disabled={loadingSummary}
                                    >
                                        ✨ {loadingSummary ? 'Summarizing Reviews...' : 'Generate AI Review Summary'}
                                    </button>
                                )}
                            </div>

                            {loadingMenu ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                    <span>Loading catalog items...</span>
                                </div>
                            ) : menu.length === 0 ? (
                                <p>No menu items registered for this kitchen yet.</p>
                            ) : (
                                <div>
                                    {categories.map(cat => {
                                        const items = groupedMenu[cat];
                                        if (!items || items.length === 0) return null;
                                        return (
                                            <div key={cat} className="menu-category-section">
                                                <h4 className="menu-category-title">{cat}</h4>
                                                
                                                {items.map(m => (
                                                    <div key={m._id} className="menu-item-card" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                                                        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                                            {m.image && (
                                                                <img src={m.image} alt={m.name} className="menu-item-image" />
                                                            )}
                                                            <div className="menu-item-details" style={{ flex: 1 }}>
                                                                <div className="menu-item-meta">
                                                                    <span className="menu-item-name">{m.name}</span>
                                                                    <span className="menu-item-price">${m.price.toFixed(2)}</span>
                                                                </div>
                                                                <p className="menu-item-desc" style={{ marginBottom: '0.4rem' }}>{m.description}</p>
                                                            </div>
                                                        </div>

                                                        {/* Macros & Tags Footer */}
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', width: '100%' }}>
                                                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                                                    🔥 {m.calories} kcal (P: {m.protein}g | C: {m.carbs}g)
                                                                </span>
                                                                {m.tags?.map(t => (
                                                                    <span 
                                                                        key={t}
                                                                        style={{ 
                                                                            fontSize: '0.65rem', 
                                                                            backgroundColor: t === 'Best Seller' ? 'var(--secondary-glow)' : 'var(--primary-glow)', 
                                                                            color: t === 'Best Seller' ? 'var(--secondary)' : 'var(--primary)', 
                                                                            padding: '0.1rem 0.3rem', 
                                                                            borderRadius: '4px' 
                                                                        }}
                                                                    >
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <button 
                                                                className="btn btn-primary btn-sm"
                                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '24px' }}
                                                                onClick={() => addToCart(m)}
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass-panel empty-state">
                            <h3>Menu Catalog</h3>
                            <p style={{ marginTop: '0.5rem' }}>Select a restaurant to open menus and review nutrient macros.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default RestaurantList;
