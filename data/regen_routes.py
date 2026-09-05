import json, urllib.request, time

routes_path = r'c:\Users\PRIYA SHARMA\Downloads\BusMitra\BusMitra\data\routes.json'
with open(routes_path) as f:
    routes = json.load(f)

for route in routes:
    pts = route.get('polyline', [])
    if len(pts) >= 2:
        waypoints = [pts[0], pts[len(pts)//2], pts[-1]]
        coords = ';'.join([f"{p['lng']},{p['lat']}" for p in waypoints])
        url = f'https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                if data['code'] == 'Ok' and len(data['routes']) > 0:
                    geom = data['routes'][0]['geometry']['coordinates']
                    route['polyline'] = [{'lat': c[1], 'lng': c[0]} for c in geom]
                    print(f"✅ {route['id']}: updated to {len(route['polyline'])} points")
        except Exception as e:
            print(f"❌ {route['id']}: error {e}")
        time.sleep(0.5)

with open(routes_path, 'w') as f:
    json.dump(routes, f, indent=2)
