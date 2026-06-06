const mongoose = require('../config/db');
const Schema = mongoose.Schema;

const PromoSchema = new Schema({
    code: { type: String, required: true, unique: true },
    discountType: { 
        type: String, 
        enum: ['percentage', 'fixed', 'free_delivery'], 
        required: true 
    },
    discountValue: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Promo', PromoSchema);
