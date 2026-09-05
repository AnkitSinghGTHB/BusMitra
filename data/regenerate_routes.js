const fs = require('fs');
const path = require('path');
const osrmRouter = require('../backend/src/services/osrmRouter');

const routesPath = path.join(__dirname, 'routes.json');
const routes = require(routesPath);

async function regenerate() {
    console.log('Regenerating real road polylines for routes...');
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (route.polyline && route.polyline.length >= 2) {
            // Pick a few anchor points to pass to OSRM (start, mid, end roughly)
            const numPoints = route.polyline.length;
            const waypoints = [
                route.polyline[0],
                route.polyline[Math.floor(numPoints / 2)],
                route.polyline[numPoints - 1]
            ];
            
            console.log(`Fetching OSRM route for ${route.id}...`);
            const osrmData = await osrmRouter.getRouteGeometry(waypoints);
            
            if (osrmData && osrmData.polyline) {
                route.polyline = osrmData.polyline;
                console.log(`✅ ${route.id}: updated polyline from ${numPoints} straight points to ${osrmData.polyline.length} real road points`);
            } else {
                console.error(`❌ ${route.id}: failed to get OSRM data, keeping original.`);
            }
            // small delay to avoid rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
    console.log('✅ routes.json updated successfully!');
}

regenerate();
