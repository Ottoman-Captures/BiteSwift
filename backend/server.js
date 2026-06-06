const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function startServer() {
    // 1. Establish connection and wait for connection selection timeout (2s)
    await connectDB();

    // 2. Load routes and compile models ONLY AFTER the database state is determined
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/restaurants', require('./routes/restaurants'));
    app.use('/api/orders', require('./routes/orders'));
    app.use('/api/ai', require('./routes/ai'));

    // Root API Endpoint
    app.get('/', (req, res) => {
        res.json({ message: 'Online Food Delivery API is running...' });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ msg: 'Something went wrong on the server!' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
