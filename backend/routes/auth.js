const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        
        user = new User({ 
            name, 
            email, 
            password: await bcrypt.hash(password, 10),
            role: role || 'customer',
            walletBalance: role === 'customer' ? 10.00 : 0, // welcome bonus $10
            loyaltyPoints: role === 'customer' ? 100 : 0,  // welcome points 100
            achievements: role === 'customer' ? ['Account Created'] : [],
            isGoldSubscriber: false
        });
        await user.save();
        
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                walletBalance: user.walletBalance,
                loyaltyPoints: user.loyaltyPoints,
                achievements: user.achievements,
                isGoldSubscriber: user.isGoldSubscriber
            } 
        });
    } catch (err) { 
        console.error(err); 
        res.status(500).send('Server error'); 
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                walletBalance: user.walletBalance,
                loyaltyPoints: user.loyaltyPoints,
                achievements: user.achievements,
                isGoldSubscriber: user.isGoldSubscriber
            } 
        });
    } catch (err) { 
        console.error(err); 
        res.status(500).send('Server error'); 
    }
});

// @route   GET api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/subscribe-gold
// @desc    Mock Gold membership subscription
// @access  Private
router.post('/subscribe-gold', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.isGoldSubscriber = true;
        if (!user.achievements.includes('BiteSwift Gold')) {
            user.achievements.push('BiteSwift Gold');
        }
        await user.save();
        res.json({ msg: 'Subscription successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/top-up
// @desc    Top up wallet balance
// @access  Private
router.post('/top-up', auth, async (req, res) => {
    const { amount } = req.body;
    const topUpVal = parseFloat(amount);
    if (isNaN(topUpVal) || topUpVal <= 0) {
        return res.status(400).json({ msg: 'Invalid top up amount' });
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.walletBalance = Math.round((user.walletBalance + topUpVal) * 100) / 100;
        await user.save();
        res.json({ msg: 'Top up successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
