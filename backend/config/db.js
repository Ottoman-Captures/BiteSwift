const mongoose = require('mongoose');
const mockMongoose = require('./mockMongoose');

let activeMongoose = mongoose;
let isMockActive = false;

const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/online_food_delivery';
    try {
        console.log('Attempting to connect to MongoDB at:', uri);
        // Set connection selection timeout to 2 seconds so it fails fast if not running
        await mongoose.connect(uri, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 2000 
        });
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.log('MongoDB connection failed:', error.message);
        console.log('>>> Falling back to Mock local JSON database system...');
        isMockActive = true;
        activeMongoose = mockMongoose;
    }
}

// Wrap the connectDB function so the proxy can be executed directly as a function,
// and redirects all database schema and query methods to the active database system.
const dbProxy = new Proxy(connectDB, {
    get: (target, prop) => {
        if (prop === 'connectDB') return connectDB;
        if (prop === 'isMockActive') return () => isMockActive;
        return activeMongoose[prop];
    }
});

module.exports = dbProxy;
