const mongoose = require('../config/db');
const Schema = mongoose.Schema;

const MenuItemSchema = new Schema({
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: String, default: 'Mains' }, // Starters, Mains, Desserts, Drinks
    image: { type: String, default: '' },
    available: { type: Boolean, default: true },
    
    // SaaS Nutritional details
    calories: { type: Number, default: 450 }, // kcal
    protein: { type: Number, default: 20 }, // grams
    carbs: { type: Number, default: 50 }, // grams
    fat: { type: Number, default: 15 }, // grams
    
    // Dish tags e.g. ['Best Seller', 'Spicy', 'Vegan', 'Halal']
    tags: { type: [String], default: [] },
    inventory: { type: Number, default: 99 } // mock stock level
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
