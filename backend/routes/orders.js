const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Promo = require('../models/Promo');
const auth = require('../middleware/auth');

// @route   POST api/orders
// @desc    Place a new order (with full SaaS billing calculations)
// @access  Private
router.post('/', auth, async (req, res) => {
    const { restaurantId, items, address, phone, deliveryNotes, paymentMethod, promoCode } = req.body;
    
    try {
        if (!items || items.length === 0) {
            return res.status(400).json({ msg: 'No items in order' });
        }
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ msg: 'Restaurant not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Calculate Subtotal
        let subtotal = 0;
        const orderItems = [];
        for (let it of items) {
            const m = await MenuItem.findById(it.menuItemId);
            if (!m) return res.status(400).json({ msg: `Menu item not found: ${it.menuItemId}` });
            
            subtotal += m.price * (it.qty || 1);
            orderItems.push({ menuItem: m._id, qty: it.qty || 1 });
        }

        // Calculations
        const tax = Math.round((subtotal * 0.08) * 100) / 100; // 8% Tax
        const serviceFee = 0.99;
        
        // Gold subscribers get free delivery!
        let deliveryFee = user.isGoldSubscriber ? 0 : (restaurant.deliveryFee || 2.99);

        // Apply Promo code discounts (Dynamic database check with static fallback)
        let discountAmount = 0;
        if (promoCode) {
            const code = promoCode.toUpperCase();
            
            // Check Database first
            const promo = await Promo.findOne({ code, isActive: true });
            if (promo) {
                const isExpired = new Date() > new Date(promo.expiryDate);
                const hasMinOrder = subtotal >= (promo.minOrder || 0);

                if (!isExpired && hasMinOrder) {
                    if (promo.discountType === 'percentage') {
                        discountAmount = Math.round((subtotal * (promo.discountValue / 100)) * 100) / 100;
                    } else if (promo.discountType === 'fixed') {
                        discountAmount = promo.discountValue;
                    } else if (promo.discountType === 'free_delivery') {
                        discountAmount = deliveryFee;
                        deliveryFee = 0;
                    }
                }
            } else {
                // Fallback to hardcoded ones for backward compatibility
                if (code === 'WELCOME10') {
                    discountAmount = Math.round((subtotal * 0.10) * 100) / 100;
                } else if (code === 'BITE25') {
                    discountAmount = Math.round((subtotal * 0.25) * 100) / 100;
                } else if (code === 'STUDENT15') {
                    discountAmount = Math.round((subtotal * 0.15) * 100) / 100;
                } else if (code === 'RAMADAN20') {
                    discountAmount = Math.round((subtotal * 0.20) * 100) / 100;
                } else if (code === 'FREEDEL') {
                    discountAmount = deliveryFee;
                    deliveryFee = 0;
                }
            }
        }

        let grandTotal = subtotal + tax + deliveryFee + serviceFee - discountAmount;
        grandTotal = Math.round(grandTotal * 100) / 100;
        if (grandTotal < 0) grandTotal = 0;

        // Create billing object
        const billing = {
            subtotal,
            tax,
            deliveryFee,
            serviceFee,
            discountAmount,
            grandTotal
        };

        // Create Order object
        const order = new Order({
            customer: req.user.id,
            restaurant: restaurantId,
            items: orderItems,
            billing,
            total: grandTotal, // compatibility
            address,
            phone,
            deliveryNotes,
            paymentMethod: paymentMethod || 'cod',
            status: 'placed'
        });

        // Credit cashback & points to customer profile
        const earnedPoints = Math.floor(subtotal * 10); // $1 spent = 10 loyalty points
        const earnedCashback = Math.round((subtotal * 0.02) * 100) / 100; // 2% Cashback

        user.loyaltyPoints += earnedPoints;
        user.walletBalance = Math.round((user.walletBalance + earnedCashback) * 100) / 100;

        // Achievements gamification
        if (!user.achievements.includes('First Feast')) {
            user.achievements.push('First Feast');
        }

        // Count customer orders to unlock badges
        const customerOrders = await Order.find({ customer: req.user.id });
        if (customerOrders.length >= 9 && !user.achievements.includes('Food Explorer')) {
            user.achievements.push('Food Explorer');
        }

        await user.save();
        await order.save();

        const populatedOrder = await Order.findById(order._id)
            .populate('restaurant')
            .populate('items.menuItem');

        res.json(populatedOrder);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders
// @desc    Get orders depending on user role (Customer, Vendor, Driver, Admin)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let orders;
        
        if (req.user.role === 'admin') {
            orders = await Order.find()
                .populate('customer', 'name email')
                .populate('restaurant')
                .populate('items.menuItem')
                .populate('driverId', 'name phone')
                .sort({ createdAt: -1 });
        } 
        else if (req.user.role === 'vendor') {
            // Find restaurants owned by this vendor
            const ownedRestaurants = await Restaurant.find({ ownerId: req.user.id });
            const restIds = ownedRestaurants.map(r => r._id.toString());
            
            // Get orders for owned restaurants
            const allOrders = await Order.find()
                .populate('customer', 'name email phone')
                .populate('restaurant')
                .populate('items.menuItem')
                .populate('driverId', 'name phone')
                .sort({ createdAt: -1 });
                
            orders = allOrders.filter(o => o.restaurant && restIds.includes(o.restaurant._id.toString()));
        } 
        else if (req.user.role === 'driver') {
            // Drivers see orders assigned to them OR orders in 'preparing' / 'confirmed' status available to claim!
            const allOrders = await Order.find()
                .populate('customer', 'name email phone address')
                .populate('restaurant')
                .populate('items.menuItem')
                .populate('driverId', 'name phone')
                .sort({ createdAt: -1 });
                
            orders = allOrders.filter(o => 
                (o.driverId && o.driverId._id.toString() === req.user.id) || 
                (o.status === 'confirmed' || o.status === 'preparing')
            );
        } 
        else {
            // Customers see their own orders
            orders = await Order.find({ customer: req.user.id })
                .populate('restaurant')
                .populate('items.menuItem')
                .populate('driverId', 'name phone')
                .sort({ createdAt: -1 });
        }
        
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PATCH api/orders/:id/status
// @desc    Update order status / Driver dispatch / location
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
    const { status, driverLocation } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        // Driver assignment automation
        if (req.user.role === 'driver' && status === 'rider_assigned') {
            order.driverId = req.user.id;
        }

        if (status) order.status = status;
        if (driverLocation) order.driverLocation = driverLocation;

        await order.save();

        const populatedOrder = await Order.findById(order._id)
            .populate('customer', 'name email phone')
            .populate('restaurant')
            .populate('items.menuItem')
            .populate('driverId', 'name phone');

        res.json(populatedOrder);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders/vendor-stats
// @desc    Retrieve vendor analytics reports
// @access  Private
router.get('/vendor-stats', auth, async (req, res) => {
    try {
        const ownedRestaurants = await Restaurant.find({ ownerId: req.user.id });
        const restIds = ownedRestaurants.map(r => r._id.toString());

        const allOrders = await Order.find().populate('restaurant');
        const vendorOrders = allOrders.filter(o => o.restaurant && restIds.includes(o.restaurant._id.toString()));

        // Calculate metrics
        let totalRevenue = 0;
        let deliveredOrders = 0;
        const salesByDate = {}; // { '2026-06-04': revenue }

        vendorOrders.forEach(o => {
            if (o.status !== 'cancelled') {
                const subtotal = o.billing?.subtotal || o.total;
                totalRevenue += subtotal;
                if (o.status === 'delivered') deliveredOrders++;

                const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
                salesByDate[dateStr] = (salesByDate[dateStr] || 0) + subtotal;
            }
        });

        // Format dates chart data (last 7 entries)
        const chartData = Object.keys(salesByDate).map(date => ({
            date,
            revenue: Math.round(salesByDate[date] * 100) / 100
        })).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);

        res.json({
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOrders: vendorOrders.length,
            deliveredOrders,
            chartData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
