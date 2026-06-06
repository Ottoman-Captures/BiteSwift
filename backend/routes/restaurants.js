const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// add restaurant (vendor or admin)
router.post('/', auth, async (req, res) => {
    const { 
        name, description, address, cuisine, image, 
        rating, deliveryTime, priceRange, deliveryFee, minimumOrder, ownerId 
    } = req.body;
    try {
        const r = new Restaurant({ 
            name, 
            description, 
            address, 
            cuisine, 
            image: image || '',
            ownerId: ownerId || req.user.id,
            rating: rating || 4.5,
            ratingCount: 1,
            deliveryTime: deliveryTime || '25-35',
            priceRange: priceRange || '$$',
            deliveryFee: deliveryFee !== undefined ? parseFloat(deliveryFee) : 2.99,
            minimumOrder: minimumOrder !== undefined ? parseFloat(minimumOrder) : 10.00,
            isFeatured: false,
            isVerified: true,
            isOpen: true,
            isPaused: false
        });
        await r.save();
        res.json(r);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// list restaurants (can filter by ownerId for vendor view)
router.get('/', async (req, res) => {
    try {
        const { ownerId } = req.query;
        let query = {};
        if (ownerId) {
            query.ownerId = ownerId;
        }
        const restaurants = await Restaurant.find(query).sort({ createdAt: -1 });
        res.json(restaurants);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Toggle restaurant open/pause status
router.patch('/:id/toggle', auth, async (req, res) => {
    const { isOpen, isPaused } = req.body;
    try {
        const r = await Restaurant.findById(req.params.id);
        if (!r) return res.status(404).json({ msg: 'Restaurant not found' });
        
        if (isOpen !== undefined) r.isOpen = isOpen;
        if (isPaused !== undefined) r.isPaused = isPaused;
        
        await r.save();
        res.json(r);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// add menu item to restaurant
router.post('/:id/menu', auth, async (req, res) => {
    const { 
        name, description, price, category, image, 
        calories, protein, carbs, fat, tags, inventory 
    } = req.body;
    try {
        const menuItem = new MenuItem({ 
            restaurant: req.params.id, 
            name,
            description, 
            price: parseFloat(price),
            category: category || 'Mains',
            image: image || '',
            calories: calories !== undefined ? parseInt(calories) : 450,
            protein: protein !== undefined ? parseInt(protein) : 20,
            carbs: carbs !== undefined ? parseInt(carbs) : 50,
            fat: fat !== undefined ? parseInt(fat) : 15,
            tags: tags || [],
            inventory: inventory !== undefined ? parseInt(inventory) : 99,
            available: true
        });
        await menuItem.save();
        res.json(menuItem);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// get all menu items across all restaurants (featured)
router.get('/menu/featured', async (req, res) => {
    try {
        const items = await MenuItem.find({ available: true }).populate('restaurant').limit(8);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// get menu for restaurant
router.get('/:id/menu', async (req, res) => {
    try {
        const items = await MenuItem.find({ restaurant: req.params.id });
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
