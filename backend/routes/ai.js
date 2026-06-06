const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/ai/search
// @desc    AI Smart Search (Parses prompt to search items)
// @access  Public
router.post('/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ msg: 'No query provided' });

    try {
        const items = await MenuItem.find().populate('restaurant');
        const searchStr = query.toLowerCase();

        // 1. Parse constraints
        let maxPrice = null;
        const priceRegex = /under\s*\$?\s*(\d+(\.\d+)?)/i;
        const matchPrice = searchStr.match(priceRegex);
        if (matchPrice) {
            maxPrice = parseFloat(matchPrice[1]);
        }

        const isSpicy = searchStr.includes('spicy') || searchStr.includes('hot') || searchStr.includes('chili');
        const isHealthy = searchStr.includes('healthy') || searchStr.includes('diet') || searchStr.includes('low calorie');
        const isVegan = searchStr.includes('vegan') || searchStr.includes('vegetarian');
        const isHalal = searchStr.includes('halal');
        const isSweet = searchStr.includes('sweet') || searchStr.includes('dessert') || searchStr.includes('cake') || searchStr.includes('sugar');
        const isDrink = searchStr.includes('drink') || searchStr.includes('beverage') || searchStr.includes('shake') || searchStr.includes('soda');

        // 2. Filter logic
        const results = items.filter(it => {
            // Price Filter
            if (maxPrice !== null && it.price > maxPrice) return false;

            // Strict tags or descriptive matches
            let matches = false;

            if (isSpicy && (it.tags.includes('Spicy') || it.description.toLowerCase().includes('spicy') || it.name.toLowerCase().includes('spicy') || it.description.toLowerCase().includes('chili'))) {
                matches = true;
            }
            if (isVegan && (it.tags.includes('Vegan') || it.tags.includes('Vegetarian') || it.description.toLowerCase().includes('vegan') || it.description.toLowerCase().includes('vegetarian'))) {
                matches = true;
            }
            if (isHalal && (it.tags.includes('Halal') || it.description.toLowerCase().includes('halal'))) {
                matches = true;
            }
            if (isHealthy && (it.calories < 400 || it.tags.includes('Healthy') || it.description.toLowerCase().includes('healthy') || it.description.toLowerCase().includes('salad'))) {
                matches = true;
            }
            if (isSweet && (it.category === 'Desserts' || it.tags.includes('Dessert') || it.description.toLowerCase().includes('sweet') || it.name.toLowerCase().includes('chocolate'))) {
                matches = true;
            }
            if (isDrink && (it.category === 'Drinks' || it.description.toLowerCase().includes('drink') || it.name.toLowerCase().includes('milkshake') || it.name.toLowerCase().includes('soda'))) {
                matches = true;
            }

            // Keyword match fallback
            if (!isSpicy && !isVegan && !isHalal && !isHealthy && !isSweet && !isDrink) {
                const keywords = searchStr.split(' ');
                const matchesKeyword = keywords.some(kw => 
                    kw.length > 2 && (
                        it.name.toLowerCase().includes(kw) || 
                        it.description.toLowerCase().includes(kw) ||
                        (it.restaurant && it.restaurant.name.toLowerCase().includes(kw))
                    )
                );
                if (matchesKeyword) matches = true;
            }

            return matches;
        });

        res.json(results.slice(0, 8)); // Return top 8 matches
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/ai/support-chat
// @desc    AI Customer Support Agent simulation (helps cancel, track, refund)
// @access  Private
router.post('/support-chat', auth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ msg: 'Empty message' });

    try {
        const user = await User.findById(req.user.id);
        const orders = await Order.find({ customer: req.user.id })
            .populate('restaurant')
            .populate('items.menuItem')
            .sort({ createdAt: -1 });

        const activeOrder = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
        const text = message.toLowerCase();

        // 1. Support Logic: Cancel order
        if (text.includes('cancel') || text.includes('refund')) {
            if (!activeOrder) {
                return res.json({
                    reply: "I couldn't find any active orders to cancel. If you are referring to a past order that has already been delivered, please note that delivered orders are not eligible for automated cancellations. Let me know if you want to request help with a specific refund."
                });
            }

            if (activeOrder.status === 'placed' || activeOrder.status === 'confirmed') {
                // Perform cancellation
                activeOrder.status = 'cancelled';
                await activeOrder.save();

                // Refund to wallet
                user.walletBalance = Math.round((user.walletBalance + activeOrder.total) * 100) / 100;
                if (!user.achievements.includes('Refund Handled')) {
                    user.achievements.push('Refund Handled');
                }
                await user.save();

                return res.json({
                    reply: `Understood. I have successfully cancelled your active order from **${activeOrder.restaurant?.name}** (ID: ${activeOrder._id}). A full refund of **$${activeOrder.total.toFixed(2)}** has been credited to your BiteSwift Wallet. Your new balance is **$${user.walletBalance.toFixed(2)}**.`
                });
            } else {
                return res.json({
                    reply: `Your order from **${activeOrder.restaurant?.name}** is already in the **${activeOrder.status}** stage. Since the kitchen has already started preparing your food, we cannot process an automated cancellation at this time. Please contact the restaurant directly.`
                });
            }
        }

        // 2. Track order
        if (text.includes('where is my order') || text.includes('track') || text.includes('status')) {
            if (activeOrder) {
                return res.json({
                    reply: `Your order from **${activeOrder.restaurant?.name}** is currently **${activeOrder.status.replace('_', ' ')}**. Our driver is coordinating delivery, and estimated arrival is within the hour. You can view the Live Driver Tracking Map in the 'My Orders' tab!`
                });
            } else if (orders.length > 0) {
                const lastOrder = orders[0];
                return res.json({
                    reply: `You don't have any active orders right now. Your last order was from **${lastOrder.restaurant?.name}** on ${new Date(lastOrder.createdAt).toLocaleDateString()}, and its status is **${lastOrder.status}**.`
                });
            } else {
                return res.json({
                    reply: "You haven't placed any orders yet. Once you place an order, I can help you track its real-time delivery status!"
                });
            }
        }

        // 3. Gold Membership
        if (text.includes('gold') || text.includes('subscription') || text.includes('membership')) {
            return res.json({
                reply: `BiteSwift Gold gives you **Free Delivery** on all participating restaurants, priority customer support, and exclusive deals. You can activate it instantly on your Profile tab!`
            });
        }

        // 4. Default Help
        res.json({
            reply: `Hello ${user.name}! I am your BiteSwift AI Assistant. 

I can help you:
- **Track Order:** Ask *"Where is my order?"*
- **Cancel Order:** Ask *"Cancel my active order"* (allowed before food preparation starts)
- **Refund Inquiries:** Ask about refund processing.
- **Recommendations:** Ask *"Suggest healthy meals under $12"*

How can I help you today?`
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/ai/summarize-reviews
// @desc    AI Restaurant review summarizer simulation
// @access  Public
router.post('/summarize-reviews', (req, res) => {
    const { rating, name } = req.body;
    const rate = parseFloat(rating) || 4.5;
    
    let summary = `Customers generally enjoy ordering from ${name || 'this restaurant'}. Common points include standard packaging, traditional preparation, and helpful staff.`;
    
    if (rate >= 4.7) {
        summary = `🌟 **Highly Recommended:** Reviews for **${name || 'this establishment'}** are overwhelmingly positive. Customers frequently praise the exceptionally rich flavors, premium ingredient quality, and blazing fast delivery speeds. Highly recommended local favorite!`;
    } else if (rate >= 4.4) {
        summary = `👍 **Solid Choice:** Customers praise the great portion sizes and authentic taste. A few reviewers noted slight delivery delays during peak dinner hours, but the food quality is considered top-notch.`;
    } else if (rate < 4.0) {
        summary = `⚠️ **Mixed Reviews:** Reviewers mention decent flavor profiles, but raise frequent concerns regarding incorrect orders, cold food deliveries, and inconsistent seasoning. Order with caution during busy hours.`;
    }

    res.json({ summary });
});

module.exports = router;
