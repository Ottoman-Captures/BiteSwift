const mongoose = require('../config/db');
const Schema = mongoose.Schema;

const RestaurantSchema = new Schema({
    name: { type: String, required: true },
    description: String,
    address: String,
    cuisine: String,
    image: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Assigned vendor
    rating: { type: Number, default: 4.5 },
    ratingCount: { type: Number, default: 12 },
    deliveryTime: { type: String, default: '25-35' }, // in minutes
    priceRange: { type: String, enum: ['$', '$$', '$$$'], default: '$$' },
    deliveryFee: { type: Number, default: 2.99 },
    minimumOrder: { type: Number, default: 10.00 },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false }, // busy status to pause orders
    openingHours: { type: String, default: '09:00 - 22:00' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
