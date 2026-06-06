const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// CORS — allow Vercel frontend domain and localhost
app.use(cors({
    origin: [
        'http://localhost:3000',
        /\.vercel\.app$/
    ],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// We initialise routes synchronously so Vercel serverless can handle requests
// DB connection is awaited once on first request via the dbProxy
let initialised = false;

async function initialise() {
    if (!initialised) {
        await connectDB();
        app.use('/api/auth', require('./routes/auth'));
        app.use('/api/restaurants', require('./routes/restaurants'));
        app.use('/api/orders', require('./routes/orders'));
        app.use('/api/promos', require('./routes/promos'));
        app.use('/api/ai', require('./routes/ai'));

        // Root health-check endpoint
        app.get('/', (req, res) => {
            res.json({ message: 'BiteSwift API is running ✅' });
        });

        // Global Error Handler
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ msg: 'Something went wrong on the server!' });
        });

        initialised = true;
    }
}

// Vercel serverless handler
module.exports = async (req, res) => {
    await initialise();
    app(req, res);
};

// Local dev: start traditional server when run with `node server.js`
if (require.main === module) {
    initialise().then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}
