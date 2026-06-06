const mongoose = require('../config/db');
const Schema = mongoose.Schema;

const OrderItemSchema = new Schema({
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    qty: { type: Number, default: 1 }
});

const BillingSchema = new Schema({
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0.99 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true }
});

const OrderSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: [OrderItemSchema],
    billing: BillingSchema,
    total: { type: Number, required: true }, // copy of grandTotal for backward compatibility
    
    // Contact & Dispatch
    address: { type: String, required: true },
    phone: { type: String, required: true },
    deliveryNotes: String,
    
    // Payment Gateway
    paymentMethod: { 
        type: String, 
        enum: ['cod', 'card', 'easypaisa', 'jazzcash'], 
        default: 'cod' 
    },
    paymentDetails: {
        last4: String,
        transactionId: String
    },
    
    // Driver dispatch
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    driverLocation: {
        lat: { type: Number },
        lng: { type: Number }
    },
    status: { 
        type: String, 
        enum: ['placed', 'confirmed', 'preparing', 'rider_assigned', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'cancelled'], 
        default: 'placed' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
