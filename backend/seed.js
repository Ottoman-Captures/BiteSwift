const mongoose = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');

const seedData = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/online_food_delivery';
    
    try {
        console.log('Connecting to Database (MongoDB or Local Switcher)...');
        await mongoose.connectDB();
        console.log('Connected.');

        // 1. Clear existing collections
        console.log('Clearing database...');
        await User.deleteMany({});
        await Restaurant.deleteMany({});
        await MenuItem.deleteMany({});
        await Order.deleteMany({});
        console.log('Database cleared.');

        // 2. Hash default passwords
        const hashedPassword = await bcrypt.hash('password123', 10);

        // 3. Create default users
        console.log('Creating users...');
        const customer = new User({
            name: 'John Doe',
            email: 'customer@test.com',
            password: hashedPassword,
            role: 'customer'
        });
        const admin = new User({
            name: 'Admin Manager',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin'
        });

        await customer.save();
        await admin.save();
        console.log('Users created successfully.');

        // 4. Create default restaurants
        console.log('Creating restaurants...');
        const r1 = new Restaurant({
            name: 'Gourmet Bistro',
            description: 'Indulge in authentic gourmet delicacies prepared by world-class chefs.',
            address: '123 Fine Dining Ave, Food City',
            cuisine: 'Italian / French',
            image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80'
        });

        const r2 = new Restaurant({
            name: 'Tokyo Sushi Bar',
            description: 'Fresh sashimi, premium rolls, and traditional Japanese dishes crafted to perfection.',
            address: '456 Sakurami St, Food City',
            cuisine: 'Japanese',
            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80'
        });

        const r3 = new Restaurant({
            name: 'Burger & Co.',
            description: 'Juicy smash burgers, crispy hand-cut fries, and refreshing craft milkshakes.',
            address: '789 Fast Track Blvd, Food City',
            cuisine: 'American / Fast Food',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
        });

        await r1.save();
        await r2.save();
        await r3.save();
        console.log('Restaurants created.');

        // 5. Create default menu items
        console.log('Creating menu items...');
        const menuItems = [
            // Gourmet Bistro
            {
                restaurant: r1._id,
                name: 'Truffle Tagliatelle',
                description: 'Fresh egg pasta tossed in a velvety black truffle and porcini cream sauce.',
                price: 18.99,
                category: 'Mains',
                image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=300&q=80'
            },
            {
                restaurant: r1._id,
                name: 'Tomato & Basil Bruschetta',
                description: 'Toasted rustic bread rubbed with garlic, topped with heirloom tomatoes and fresh basil.',
                price: 8.50,
                category: 'Starters',
                image: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=300&q=80'
            },
            {
                restaurant: r1._id,
                name: 'Classic Espresso Tiramisu',
                description: 'Layers of ladyfingers soaked in espresso, masquerpone cream, and dusted with dark cocoa.',
                price: 9.25,
                category: 'Desserts',
                image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=300&q=80'
            },
            
            // Tokyo Sushi Bar
            {
                restaurant: r2._id,
                name: 'Premium Salmon Sashimi',
                description: '12 thick-cut pieces of fresh, melt-in-your-mouth Atlantic salmon, served with wasabi.',
                price: 22.00,
                category: 'Mains',
                image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=300&q=80'
            },
            {
                restaurant: r2._id,
                name: 'Pan-Fried Pork Gyoza',
                description: 'Crispy pan-fried dumplings filled with minced pork, ginger, garlic, and cabbage.',
                price: 7.99,
                category: 'Starters',
                image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=300&q=80'
            },
            {
                restaurant: r2._id,
                name: 'Matcha Crème Brûlée',
                description: 'Rich green tea custard topped with a layer of caramelized sugar.',
                price: 6.95,
                category: 'Desserts',
                image: 'https://images.unsplash.com/photo-1536680465769-2365207b035e?auto=format&fit=crop&w=300&q=80'
            },
            
            // Burger & Co
            {
                restaurant: r3._id,
                name: 'Double Smash Cheeseburger',
                description: 'Two crispy-edged Angus patties, double cheddar, caramelized onions, pickles, and signature spread on a brioche bun.',
                price: 13.50,
                category: 'Mains',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
            },
            {
                restaurant: r3._id,
                name: 'Crispy Fried Onion Rings',
                description: 'Thick cut sweet onions in beer batter, served with spicy smokey BBQ sauce.',
                price: 5.99,
                category: 'Starters',
                image: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?auto=format&fit=crop&w=300&q=80'
            },
            {
                restaurant: r3._id,
                name: 'Artisan Salted Caramel Milkshake',
                description: 'House-made vanilla bean gelato blended with sea salt caramel and topped with whipped cream.',
                price: 6.00,
                category: 'Drinks',
                image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=300&q=80'
            }
        ];

        for (let item of menuItems) {
            const mi = new MenuItem(item);
            await mi.save();
        }
        
        console.log('Menu items created successfully.');
        console.log('Database seeding finished.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
