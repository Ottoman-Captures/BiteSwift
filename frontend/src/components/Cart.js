import React, { useState } from 'react';
import API from '../api';

function Cart({ cart, setCart, onOrderPlaced, user }) {
    const [step, setStep] = useState(1); // 1: Items, 2: Address/Phone, 3: Payment Method, 4: Summary/Confirm
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    
    const [paymentMethod, setPaymentMethod] = useState('cod');
    // Card inputs
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    
    // Promo system
    const [promoInput, setPromoInput] = useState('');
    const [activePromo, setActivePromo] = useState(null);
    const [promoError, setPromoError] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [checkoutOrder, setCheckoutOrder] = useState(null);
    const [error, setError] = useState(null);

    // Calculate invoice
    const subtotal = cart.reduce((s, it) => s + (it.price * it.qty), 0);
    const tax = Math.round((subtotal * 0.08) * 100) / 100;
    const serviceFee = cart.length > 0 ? 0.99 : 0;
    
    // Gold subscribers get free delivery!
    let deliveryFee = 0;
    if (cart.length > 0) {
        deliveryFee = user?.isGoldSubscriber ? 0 : 2.99; // Fallback or dynamic
    }

    let discount = 0;
    if (activePromo) {
        if (activePromo.type === 'percentage') {
            discount = Math.round((subtotal * activePromo.val) * 100) / 100;
        } else if (activePromo.type === 'fixed') {
            discount = activePromo.val;
        } else if (activePromo.type === 'free_delivery') {
            discount = deliveryFee;
            deliveryFee = 0;
        }
    }

    let grandTotal = subtotal + tax + deliveryFee + serviceFee - discount;
    grandTotal = Math.round(grandTotal * 100) / 100;
    if (grandTotal < 0) grandTotal = 0;

    const updateQty = (menuItemId, change) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.menuItemId === menuItemId) {
                    const newQty = item.qty + change;
                    return newQty > 0 ? { ...item, qty: newQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    };

    const handleApplyPromo = (e) => {
        e.preventDefault();
        setPromoError(null);
        const code = promoInput.toUpperCase().trim();
        
        const validCodes = {
            'WELCOME10': { type: 'percentage', val: 0.10, desc: '10% OFF Welcome Bonus' },
            'BITE25': { type: 'percentage', val: 0.25, desc: '25% OFF Special' },
            'STUDENT15': { type: 'percentage', val: 0.15, desc: '15% OFF Student Saver' },
            'RAMADAN20': { type: 'percentage', val: 0.20, desc: '20% OFF Festive Discount' },
            'FREEDEL': { type: 'free_delivery', val: 0, desc: 'Free Delivery Applied' }
        };

        if (validCodes[code]) {
            setActivePromo({ code, ...validCodes[code] });
            setPromoInput('');
        } else {
            setPromoError('Invalid coupon code.');
        }
    };

    // Format card number 16-digits with spaces
    const handleCardNumberChange = (e) => {
        const val = e.target.value.replace(/\D/g, '');
        const formatted = val.match(/.{1,4}/g)?.join(' ') || '';
        setCardNumber(formatted.substring(0, 19));
    };

    const handleCheckout = async () => {
        setError(null);
        setSubmitting(true);
        const items = cart.map(it => ({ menuItemId: it.menuItemId, qty: it.qty }));
        
        try {
            const res = await API.post('/orders', {
                restaurantId: cart[0].restaurantId,
                items,
                address,
                phone,
                deliveryNotes: notes,
                paymentMethod,
                promoCode: activePromo?.code || null
            });

            // Placed successfully
            setCheckoutOrder(res.data);
            setCart([]);
            setStep(5); // Success step!
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || err.message || 'Error placing order.');
        } finally {
            setSubmitting(false);
        }
    };

    if (cart.length === 0 && step !== 5) {
        return (
            <div className="glass-panel" style={{ height: '100%' }}>
                <div className="cart-title-section">
                    <h2 style={{ fontSize: '1.25rem' }}>Basket Cart</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Empty</span>
                </div>
                <div className="empty-state">
                    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                    </svg>
                    <p style={{ fontSize: '0.9rem' }}>Your shopping basket is empty.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Step Indicators Header */}
            {step < 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    <span style={{ color: step >= 1 ? 'var(--primary)' : 'inherit' }}>1. Items</span>
                    <span style={{ color: step >= 2 ? 'var(--primary)' : 'inherit' }}>2. Address</span>
                    <span style={{ color: step >= 3 ? 'var(--primary)' : 'inherit' }}>3. Pay</span>
                    <span style={{ color: step >= 4 ? 'var(--primary)' : 'inherit' }}>4. Confirm</span>
                </div>
            )}

            {/* Error notifications */}
            {error && (
                <div className="alert alert-danger" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                    <span>{error}</span>
                </div>
            )}

            {/* STEP 1: REVIEW ITEMS */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="cart-title-section" style={{ margin: 0, paddingBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem' }}>Review Basket</h3>
                        <small style={{ color: 'var(--text-secondary)' }}>From {cart[0]?.restaurantName}</small>
                    </div>

                    <div className="cart-items-list" style={{ flex: 1, margin: '1rem 0' }}>
                        {cart.map(item => (
                            <div key={item.menuItemId} className="cart-item">
                                <div className="cart-item-info">
                                    <div className="cart-item-name" style={{ fontSize: '0.9rem' }}>{item.name}</div>
                                    <div className="cart-item-price" style={{ fontSize: '0.8rem' }}>${(item.price * item.qty).toFixed(2)}</div>
                                </div>
                                <div className="cart-item-controls">
                                    <button className="cart-qty-btn" onClick={() => updateQty(item.menuItemId, -1)}>-</button>
                                    <span className="cart-item-qty">{item.qty}</span>
                                    <button className="cart-qty-btn" onClick={() => updateQty(item.menuItemId, 1)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>
                        Proceed to Address
                    </button>
                </div>
            )}

            {/* STEP 2: DISPATCH DETAILS */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Delivery Details</h3>
                    
                    <div className="form-group">
                        <label className="form-label">Delivery Address</label>
                        <input
                            type="text"
                            placeholder="Street, Block, Apartment No."
                            className="form-control"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                            type="tel"
                            placeholder="0300-1234567"
                            className="form-control"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rider Instructions (Optional)</label>
                        <textarea
                            placeholder="Leave at door, ring bell twice, etc."
                            className="form-control"
                            style={{ minHeight: '60px', resize: 'none' }}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                            Back
                        </button>
                        <button 
                            className="btn btn-primary" 
                            style={{ flex: 2 }}
                            onClick={() => {
                                if (!address.trim() || !phone.trim()) {
                                    alert('Address and Phone are required.');
                                    return;
                                }
                                setStep(3);
                            }}
                        >
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: PAYMENT METHOD */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Select Payment</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <label className={`glass-panel`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.75rem', borderColor: paymentMethod === 'cod' ? 'var(--primary)' : 'var(--border-color)', backgroundColor: paymentMethod === 'cod' ? 'rgba(255,107,53,0.03)' : 'transparent' }}>
                            <input 
                                type="radio" 
                                name="payment" 
                                value="cod" 
                                checked={paymentMethod === 'cod'} 
                                onChange={() => setPaymentMethod('cod')}
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Cash on Delivery</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pay cash to the rider at your door.</div>
                            </div>
                        </label>

                        <label className={`glass-panel`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.75rem', borderColor: paymentMethod === 'card' ? 'var(--primary)' : 'var(--border-color)', backgroundColor: paymentMethod === 'card' ? 'rgba(255,107,53,0.03)' : 'transparent' }}>
                            <input 
                                type="radio" 
                                name="payment" 
                                value="card" 
                                checked={paymentMethod === 'card'} 
                                onChange={() => setPaymentMethod('card')}
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Credit / Debit Card</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visa, MasterCard, or UnionPay.</div>
                            </div>
                        </label>

                        <label className={`glass-panel`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.75rem', borderColor: (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') ? 'var(--primary)' : 'var(--border-color)', backgroundColor: (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') ? 'rgba(255,107,53,0.03)' : 'transparent' }}>
                            <input 
                                type="radio" 
                                name="payment" 
                                value="easypaisa" 
                                checked={paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash'} 
                                onChange={() => setPaymentMethod('easypaisa')}
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Mobile Wallets (Pakistani Local)</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Easypaisa / JazzCash instant checkouts.</div>
                            </div>
                        </label>
                    </div>

                    {/* Conditional Card inputs */}
                    {paymentMethod === 'card' && (
                        <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="Card Number (0000 0000 0000 0000)"
                                    className="form-control"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    className="form-control"
                                    style={{ flex: 1 }}
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                                />
                                <input
                                    type="password"
                                    placeholder="CVC"
                                    className="form-control"
                                    style={{ flex: 1 }}
                                    value={cardCvc}
                                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                                />
                            </div>
                        </div>
                    )}

                    {/* Conditional Mobile Wallet inputs */}
                    {(paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
                        <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <button 
                                    className={`btn btn-sm ${paymentMethod === 'easypaisa' ? 'btn-primary' : 'btn-secondary'}`} 
                                    style={{ flex: 1, padding: '0.2rem' }}
                                    onClick={(e) => { e.preventDefault(); setPaymentMethod('easypaisa'); }}
                                >
                                    Easypaisa
                                </button>
                                <button 
                                    className={`btn btn-sm ${paymentMethod === 'jazzcash' ? 'btn-primary' : 'btn-secondary'}`} 
                                    style={{ flex: 1, padding: '0.2rem' }}
                                    onClick={(e) => { e.preventDefault(); setPaymentMethod('jazzcash'); }}
                                >
                                    JazzCash
                                </button>
                            </div>
                            <input
                                type="tel"
                                placeholder="Enter account number (e.g. 03451234567)"
                                className="form-control"
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                            Back
                        </button>
                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(4)}>
                            Review Invoice
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: SUMMARY & PLACE */}
            {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Invoice Summary</h3>

                    {/* Promo coupon engine */}
                    <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Enter Code (WELCOME10, BITE25)"
                            className="form-control"
                            style={{ flex: 1, textTransform: 'uppercase' }}
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
                    </form>
                    
                    {promoError && (
                        <small style={{ color: 'var(--error)', display: 'block', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
                            {promoError}
                        </small>
                    )}
                    {activePromo && (
                        <div className="alert alert-success" style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
                            🎉 <strong>{activePromo.code}</strong> Applied: {activePromo.desc}
                        </div>
                    )}

                    {/* Pricing table */}
                    <div className="cart-totals" style={{ margin: 0, flex: 1 }}>
                        <div className="totals-row">
                            <span>Subtotal ({cart.reduce((s,it) => s+it.qty, 0)} items)</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="totals-row">
                            <span>GST Tax (8%)</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="totals-row">
                            <span>Delivery Fee</span>
                            <span>{deliveryFee === 0 ? <strong style={{ color: 'var(--success)' }}>FREE</strong> : `$${deliveryFee.toFixed(2)}`}</span>
                        </div>
                        <div className="totals-row">
                            <span>Service Surcharge</span>
                            <span>${serviceFee.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="totals-row" style={{ color: 'var(--success)' }}>
                                <span>Discount Code</span>
                                <span>-${discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="totals-row grand-total">
                            <span>Grand Total</span>
                            <span>${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Summary coordinates review */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', margin: '1rem 0' }}>
                        📍 <strong>Delivery to:</strong> {address} (Tel: {phone})<br/>
                        💳 <strong>Payment:</strong> {paymentMethod.toUpperCase()}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(3)}>
                            Back
                        </button>
                        <button 
                            className="btn btn-primary" 
                            style={{ flex: 2 }}
                            onClick={handleCheckout}
                            disabled={submitting}
                        >
                            {submitting ? 'Placing Order...' : 'Confirm & Order'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 5: ORDER SUCCESS PLACED (CONFETTI POPUP) */}
            {step === 5 && checkoutOrder && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Floating Confetti Shapes */}
                    <div className="confetti-container">
                        <div className="confetti c1"></div>
                        <div className="confetti c2"></div>
                        <div className="confetti c3"></div>
                        <div className="confetti c4"></div>
                        <div className="confetti c5"></div>
                    </div>

                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                    <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: '#ffffff' }}>Order Confirmed!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 1.5rem', maxWidth: '300px' }}>
                        Your feast is on its way. Estimated preparation started at <strong>{checkoutOrder.restaurant?.name}</strong>.
                    </p>

                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '1.5rem', width: '100%' }}>
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>ORDER NUMBER:</small>
                        <code style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>{checkoutOrder._id}</code>
                    </div>

                    <button 
                        className="btn btn-primary btn-block"
                        onClick={() => {
                            setStep(1);
                            onOrderPlaced(checkoutOrder);
                        }}
                    >
                        Track Delivery
                    </button>

                    <style>{`
                        .confetti-container {
                            position: absolute;
                            inset: 0;
                            pointer-events: none;
                        }
                        .confetti {
                            position: absolute;
                            width: 10px;
                            height: 10px;
                            border-radius: 2px;
                            animation: fall 3s ease-out infinite;
                        }
                        .c1 { background-color: var(--primary); left: 20%; animation-delay: 0s; }
                        .c2 { background-color: var(--secondary); left: 40%; animation-delay: 0.5s; }
                        .c3 { background-color: var(--success); left: 60%; animation-delay: 0.2s; }
                        .c4 { background-color: #3b82f6; left: 80%; animation-delay: 0.7s; }
                        .c5 { background-color: #a855f7; left: 50%; animation-delay: 0.3s; }
                        
                        @keyframes fall {
                            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                            100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}
            
        </div>
    );
}

export default Cart;
