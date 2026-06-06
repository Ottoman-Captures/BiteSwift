const express = require('express');
const router = express.Router();
const Promo = require('../models/Promo');
const auth = require('../middleware/auth');

// @route   POST api/promos
// @desc    Create a new promo code (Admin only)
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admin only' });
    }
    
    const { code, discountType, discountValue, minOrder } = req.body;
    if (!code || !discountType) {
        return res.status(400).json({ msg: 'Please provide coupon code and type' });
    }

    try {
        const existing = await Promo.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ msg: 'Coupon code already exists' });
        }

        const newPromo = new Promo({
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue) || 0,
            minOrder: parseFloat(minOrder) || 0
        });

        await newPromo.save();
        res.json(newPromo);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/promos/:code
// @desc    Get details of a promo code (for verification)
// @access  Private
router.get('/:code', auth, async (req, res) => {
    try {
        const promo = await Promo.findOne({ code: req.params.code.toUpperCase(), isActive: true });
        if (!promo) {
            return res.status(404).json({ msg: 'Invalid coupon code' });
        }

        // Check expiry
        if (new Date() > new Date(promo.expiryDate)) {
            return res.status(400).json({ msg: 'Coupon has expired' });
        }

        res.json(promo);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
