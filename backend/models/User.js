const mongoose = require('../config/db');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin', 'vendor', 'driver'], default: 'customer' },
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    isGoldSubscriber: { type: Boolean, default: false },
    achievements: { type: [String], default: [] }, // e.g. ['First Order', 'VIP Customer']
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
