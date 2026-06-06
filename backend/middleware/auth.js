const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

module.exports = function(req, res, next) {
    // Check for token in x-auth-token, Authorization header (Bearer token), or body
    let token = req.header('x-auth-token') || (req.body && req.body.token);
    
    const authHeader = req.header('Authorization');
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7, authHeader.length);
    }
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // decoded will contain { id: user._id, role: user.role }
        next();
    } catch (err) { 
        res.status(401).json({ msg: 'Token is not valid' }); 
    }
}
