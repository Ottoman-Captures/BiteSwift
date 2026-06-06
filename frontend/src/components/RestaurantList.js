import React, { useState, useEffect } from 'react';
import API from '../api';

const parseMarkdown = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const renderedLines = [];
    
    lines.forEach((line, lineIdx) => {
        let parts = [{ type: 'text', content: line }];
        
        // 1. Parse Bold (**text**)
        let nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/\*\*(.*?)\*\*/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'bold', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;
        
        // 2. Parse Italic (*text*)
        nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/\*(.*?)\*/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'italic', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;
        
        // 3. Parse Inline Code (`text`)
        nextParts = [];
        parts.forEach(part => {
            if (part.type === 'text') {
                const subParts = part.content.split(/`(.*?)`/g);
                subParts.forEach((sub, subIdx) => {
                    if (subIdx % 2 === 1) {
                        nextParts.push({ type: 'code', content: sub });
                    } else {
                        nextParts.push({ type: 'text', content: sub });
                    }
                });
            } else {
                nextParts.push(part);
            }
        });
        parts = nextParts;

        // Map parsed parts to inline components
        const lineContent = parts.map((p, pIdx) => {
            if (p.type === 'bold') {
                return <strong key={pIdx} style={{ fontWeight: '700', color: '#ffffff' }}>{p.content}</strong>;
            }
            if (p.type === 'italic') {
                return <em key={pIdx} style={{ fontStyle: 'italic' }}>{p.content}</em>;
            }
            if (p.type === 'code') {
                return (
                    <code 
                        key={pIdx} 
                        style={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'rgba(255,255,255,0.15)', 
                            padding: '0.1rem 0.3rem', 
                            borderRadius: '4px',
                            fontSize: '0.9em'
                        }}
                    >
                        {p.content}
                    </code>
                );
            }
            return p.content;
        });

        renderedLines.push(<span key={lineIdx}>{lineContent}</span>);
        if (lineIdx < lines.length - 1) {
            renderedLines.push(<br key={`br-${lineIdx}`} />);
        }
    });

    return renderedLines;
};

function RestaurantList({ restaurants, setCart, cart }) {
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [menu, setMenu] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [featuredItems, setFeaturedItems] = useState([]);
    
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

    // Fetch popular/featured items on load
    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const res = await API.get('/restaurants/menu/featured');
                setFeaturedItems(res.data);
            } catch (err) {
                console.error('Error fetching featured items:', err);
            }
        };
        fetchFeatured();
    }, []);

    // 3D card tilt handlers
    const handleCardMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        const rotateX = -((y - yc) / yc) * 6; // Max 6 degrees rotation
        const rotateY = ((x - xc) / xc) * 6; // Max 6 degrees rotation
        
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03) translateY(-4px)`;
        card.style.transition = 'transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease';
        card.style.zIndex = '5';
    };

    const handleCardMouseLeave = (e) => {
        const card = e.currentTarget;
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0px)';
        card.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease';
        card.style.zIndex = '1';
    };

    const handleCardTouchMove = (e) => {
        const touch = e.touches[0];
        if (!touch) return;
        
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        const rotateX = -((y - yc) / yc) * 6; // Max 6 degrees rotation
        const rotateY = ((x - xc) / xc) * 6; // Max 6 degrees rotation
        
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03) translateY(-4px)`;
        card.style.transition = 'transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease';
        card.style.zIndex = '5';
    };

    const handleCardTouchEnd = (e) => {
        const card = e.currentTarget;
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0px)';
        card.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease';
        card.style.zIndex = '1';
    };

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
    const featuredRestaurants = sortedRestaurants.filter(r => r.isFeatured).slice(0, 3);
    const topRatedRestaurants = [...sortedRestaurants].sort((a, b) => b.rating - a.rating).slice(0, 4);
    const fastestRestaurants = [...sortedRestaurants].sort((a, b) => {
        const timeA = parseInt(a.deliveryTime?.split('-')[0], 10) || 30;
        const timeB = parseInt(b.deliveryTime?.split('-')[0], 10) || 30;
        return timeA - timeB;
    }).slice(0, 3);

    const experienceCards = [
        { label: 'AI Search', title: 'Craving-to-dish matching', text: 'Ask for spicy, healthy, cheap, late-night, or family-size meals and jump straight to matching dishes.' },
        { label: 'Live Ops', title: 'Order flow visibility', text: 'Customers, kitchens, riders, and admins all see role-specific controls built around the same delivery journey.' },
        { label: 'Rewards', title: 'Wallet-first checkout', text: 'Promos, Gold delivery perks, service fees, and wallet balances are surfaced before confirmation.' },
        { label: 'Quality', title: 'Menu intelligence layer', text: 'Macros, tags, best-seller badges, AI reviews, and filters help people choose faster.' }
    ];

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
                                    className="transition-all duration-300 ease-out hover:scale-[1.03] hover:border-[var(--primary)] hover:shadow-[0_8px_20px_rgba(56, 224, 123,0.15)]"
                                    onMouseMove={handleCardMouseMove}
                                    onMouseLeave={handleCardMouseLeave}
                                    onTouchStart={handleCardTouchMove}
                                    onTouchMove={handleCardTouchMove}
                                    onTouchEnd={handleCardTouchEnd}
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
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From: <strong style={{ fontWeight: '600', color: '#ffffff' }}>{item.restaurant?.name}</strong></span>
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
                                    className={`glass-panel restaurant-card ${selectedRestaurant?._id === r._id ? 'active' : ''} transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[0_8px_25px_rgba(56, 224, 123,0.25)]`}
                                    onMouseMove={handleCardMouseMove}
                                    onMouseLeave={handleCardMouseLeave}
                                    onTouchStart={handleCardTouchMove}
                                    onTouchMove={handleCardTouchMove}
                                    onTouchEnd={handleCardTouchEnd}
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
                                    <small style={{ color: 'var(--text-secondary)' }}>Min. order: <strong style={{ fontWeight: '600', color: '#ffffff' }}>${selectedRestaurant.minimumOrder}</strong></small>
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
                                        {parseMarkdown(reviewSummary)}
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
                                                    <div 
                                                        key={m._id} 
                                                        className="menu-item-card transition-all duration-300 ease-out hover:scale-[1.02] hover:border-[var(--primary)] hover:shadow-[0_8px_20px_rgba(56, 224, 123,0.15)]" 
                                                        onMouseMove={handleCardMouseMove}
                                                        onMouseLeave={handleCardMouseLeave}
                                                        onTouchStart={handleCardTouchMove}
                                                        onTouchMove={handleCardTouchMove}
                                                        onTouchEnd={handleCardTouchEnd}
                                                        style={{ flexDirection: 'column', gap: '0.75rem' }}
                                                    >
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
                        <div className="glass-panel menu-empty-panel">
                            <span className="card-kicker">Menu Command</span>
                            <h3>Choose a kitchen to unlock the full menu experience.</h3>
                            <p>Select any restaurant to reveal categorized dishes, nutrient macros, AI review summaries, and quick-add controls.</p>
                            <div className="menu-preview-list">
                                <div><strong>Starters</strong><span>snacks, soups, sides</span></div>
                                <div><strong>Mains</strong><span>signature plates</span></div>
                                <div><strong>Desserts</strong><span>sweet finishes</span></div>
                                <div><strong>Drinks</strong><span>fresh pairings</span></div>
                            </div>

                            {featuredItems.length > 0 && (
                                <div className="menu-featured-showcase" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                    <span className="card-kicker" style={{ color: 'var(--secondary)', borderColor: 'rgba(6, 182, 212, 0.28)', background: 'rgba(6, 182, 212, 0.09)', marginBottom: '0.75rem', display: 'inline-block' }}>
                                        🔥 Trending Dishes
                                    </span>
                                    <h4 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1rem' }}>
                                        Popular picks from our kitchens
                                    </h4>
                                    <div className="trending-dishes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {featuredItems.map(item => (
                                            <div 
                                                key={item._id}
                                                className="trending-dish-card transition-all duration-300 ease-out hover:scale-[1.03] hover:border-[var(--primary)] hover:shadow-[0_8px_20px_rgba(56, 224, 123,0.15)]"
                                                onMouseMove={handleCardMouseMove}
                                                onMouseLeave={handleCardMouseLeave}
                                                onTouchStart={handleCardTouchMove}
                                                onTouchMove={handleCardTouchMove}
                                                onTouchEnd={handleCardTouchEnd}
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '0.75rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.4rem',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => openMenu(item.restaurant)}
                                            >
                                                {item.image && (
                                                    <div style={{ width: '100%', height: '110px', overflow: 'hidden', borderRadius: '8px', position: 'relative' }}>
                                                        <img 
                                                            src={item.image} 
                                                            alt={item.name} 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                                        {item.name}
                                                    </span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem' }}>${item.price.toFixed(2)}</span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    From: <strong style={{ fontWeight: '600', color: '#ffffff' }}>{item.restaurant?.name}</strong>
                                                </span>
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
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                    <button 
                                                        className="btn btn-primary btn-sm"
                                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(item, item.restaurant?.name, item.restaurant?._id);
                                                        }}
                                                    >
                                                        Add
                                                    </button>
                                                    <button 
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem', border: 'none' }}
                                                        onClick={() => openMenu(item.restaurant)}
                                                    >
                                                        Menu
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            <section className="loaded-showcase-grid">
                <div className="feature-panel feature-panel-wide">
                    <span className="card-kicker">Tonight's momentum</span>
                    <h3>Smart delivery marketplace, not just a list of restaurants.</h3>
                    <p>BiteSwift now fills the browsing journey with signals, deals, AI assistance, and delivery context so every scroll has a reason to exist.</p>
                    <div className="showcase-meter-grid">
                        <div><strong>{topRatedRestaurants[0]?.rating?.toFixed(1) || '4.9'}</strong><span>best rating</span></div>
                        <div><strong>{fastestRestaurants[0]?.deliveryTime || '20-30'}</strong><span>fastest route</span></div>
                        <div><strong>{featuredRestaurants.length || 3}</strong><span>featured picks</span></div>
                    </div>
                </div>

                <div className="feature-panel live-feed-panel">
                    <span className="card-kicker">Live Pulse</span>
                    <div className="live-feed-list">
                        <div><span></span>Kitchen slots opening in Gulberg</div>
                        <div><span></span>Gold free delivery window active</div>
                        <div><span></span>AI search tuned for high-protein meals</div>
                        <div><span></span>Riders averaging under 25 minutes</div>
                    </div>
                </div>
            </section>

            <section className="restaurant-rail-section">
                <div className="section-heading-row">
                    <div>
                        <span className="eyebrow">Featured drops</span>
                        <h3>High-signal picks for faster decisions</h3>
                    </div>
                    <span className="muted-note">Updated from your live catalog</span>
                </div>
                <div className="horizontal-restaurant-rail">
                    {(featuredRestaurants.length ? featuredRestaurants : topRatedRestaurants).map(r => (
                        <button 
                            key={r._id} 
                            className="rail-restaurant-card transition-all duration-300 ease-out hover:scale-[1.05] hover:shadow-[0_8px_20px_rgba(56, 224, 123,0.18)]" 
                            onClick={() => openMenu(r)}
                        >
                            <img src={r.image} alt="" />
                            <span>{r.cuisine}</span>
                            <strong>{r.name}</strong>
                            <small>{r.deliveryTime} mins | {r.rating.toFixed(1)} rating</small>
                        </button>
                    ))}
                </div>
            </section>

            <section className="experience-card-grid">
                {experienceCards.map(card => (
                    <div className="feature-panel compact-feature" key={card.title}>
                        <span>{card.label}</span>
                        <h4>{card.title}</h4>
                        <p>{card.text}</p>
                    </div>
                ))}
            </section>

            <section className="conversion-band">
                <div>
                    <span className="card-kicker">Fully loaded flow</span>
                    <h3>Search, filter, pick, checkout, track, reward, and support in one polished screen.</h3>
                </div>
                <div className="conversion-steps">
                    <span>Discover</span>
                    <span>Compare</span>
                    <span>Order</span>
                    <span>Track</span>
                </div>
            </section>
        </div>
    );
}

export default RestaurantList;
