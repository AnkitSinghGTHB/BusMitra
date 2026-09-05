const haversine = require('../utils/haversine');

const checkins = new Map();

function addCheckin(busId, userId, lat, lng, ip = null) {
    if (!busId || lat === undefined || lng === undefined) return false;
    
    // Bounds check
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

    clearOldCheckins();

    if (!checkins.has(busId)) {
        checkins.set(busId, []);
    }
    const busCheckins = checkins.get(busId);
    const now = Date.now();

    // Anti-spoof: Check both userId AND IP address within 30 seconds
    const recentCheckin = busCheckins.find(c => {
        const isSameUser = Boolean(userId && c.userId === userId);
        const isSameIp = Boolean(ip && c.ip === ip);
        return (isSameUser || isSameIp) && (now - c.timestamp < 30000);
    });

    if (recentCheckin) return false;

    busCheckins.push({ userId, ip, lat, lng, timestamp: now });
    return true;
}

function getConsensusThreshold(hour) {
    if (hour >= 5 && hour < 7) return 1;
    if (hour >= 7 && hour < 9) return 2;
    return 3;
}

function validateConsensus(busId) {
    clearOldCheckins();
    const busCheckins = checkins.get(busId) || [];
    if (busCheckins.length === 0) return { valid: false, count: 0 };
    
    const hour = new Date().getHours();
    const threshold = getConsensusThreshold(hour);
    
    let sumLat = 0, sumLng = 0;
    
    const ref = busCheckins[busCheckins.length - 1]; 
    const cluster = busCheckins.filter(c => haversine(ref.lat, ref.lng, c.lat, c.lng) <= 0.2);
    
    const uniqueUsers = new Set(cluster.map(c => c.userId));
    
    if (uniqueUsers.size >= threshold) {
        cluster.forEach(c => {
            sumLat += c.lat;
            sumLng += c.lng;
        });
        return {
            valid: true,
            count: uniqueUsers.size,
            avgLat: sumLat / cluster.length,
            avgLng: sumLng / cluster.length
        };
    }
    
    return { valid: false, count: uniqueUsers.size };
}

function clearOldCheckins() {
    const now = Date.now();
    for (const [busId, busCheckins] of checkins.entries()) {
        const filtered = busCheckins.filter(c => now - c.timestamp <= 60000);
        if (filtered.length === 0) {
            checkins.delete(busId);
        } else {
            checkins.set(busId, filtered);
        }
    }
}

module.exports = { addCheckin, getConsensusThreshold, validateConsensus, clearOldCheckins };
