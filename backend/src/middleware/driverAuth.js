const DRIVER_TOKEN = process.env.DRIVER_TOKEN || 'busmitra-driver-token';

function driverAuth(req, res, next) {
    const token = req.headers['x-driver-token'];
    
    // Strict enforcement if configured or if client passes the header
    if (process.env.REQUIRE_DRIVER_TOKEN === 'true' || token !== undefined) {
        if (!token || token !== DRIVER_TOKEN) {
            return res.status(401).json({
                error: 'Unauthorized: Invalid or missing X-Driver-Token header'
            });
        }
    }
    
    next();
}

module.exports = driverAuth;
