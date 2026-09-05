import urllib.request
import json
import random

# Base locations for Tier 2/Tier 3 and rural routes across India
locations = {
    # Punjab (Existing)
    "Moga Bus Stand": {"lat": 30.814343, "lng": 75.172551},
    "Dagru": {"lat": 30.8522, "lng": 75.0592},
    "Baghapurana": {"lat": 30.5898, "lng": 75.0934},
    
    # Rajasthan
    "Bikaner Bus Stand": {"lat": 28.0229, "lng": 73.3119},
    "Nokha": {"lat": 27.6046, "lng": 73.4243},
    "Udaipur Bus Stand": {"lat": 24.5854, "lng": 73.6811},
    "Nathdwara": {"lat": 24.9254, "lng": 73.8183},

    # Uttar Pradesh
    "Gorakhpur ISBT": {"lat": 26.7606, "lng": 83.3732},
    "Kushinagar": {"lat": 26.7397, "lng": 83.8906},
    "Jhansi Bus Stand": {"lat": 25.4484, "lng": 78.5685},
    "Babina": {"lat": 25.2442, "lng": 78.4719},

    # Maharashtra
    "Latur Bus Stand": {"lat": 18.4088, "lng": 76.5604},
    "Ausa": {"lat": 18.2467, "lng": 76.5165},
    "Nanded Bus Stand": {"lat": 19.1551, "lng": 77.3094},
    "Mudkhed": {"lat": 19.1678, "lng": 77.5186},

    # Karnataka
    "Hubballi CBT": {"lat": 15.3526, "lng": 75.1415},
    "Dharwad CBT": {"lat": 15.4593, "lng": 75.0084},
    "Hassan Bus Stand": {"lat": 13.0033, "lng": 76.1004},
    "Belur": {"lat": 13.1610, "lng": 75.8679},
    
    # Bihar
    "Muzaffarpur Bus Stand": {"lat": 26.1209, "lng": 85.3647},
    "Hajipur": {"lat": 25.6838, "lng": 85.2215},

    # Assam
    "Tezpur Bus Stand": {"lat": 26.6346, "lng": 92.7915},
    "Dhekiajuli": {"lat": 26.7029, "lng": 92.4646}
}

routes_def = [
    # Punjab
    {"id": "M1", "name": "Moga - Dagru", "start": "Moga Bus Stand", "end": "Dagru", "color": "#1a56db"},
    {"id": "PB-02", "name": "Moga - Baghapurana", "start": "Moga Bus Stand", "end": "Baghapurana", "color": "#db1a1a"},
    
    # Rajasthan
    {"id": "RJ-01", "name": "Bikaner - Nokha", "start": "Bikaner Bus Stand", "end": "Nokha", "color": "#f39c12"},
    {"id": "RJ-02", "name": "Udaipur - Nathdwara", "start": "Udaipur Bus Stand", "end": "Nathdwara", "color": "#d35400"},
    
    # UP
    {"id": "UP-01", "name": "Gorakhpur - Kushinagar", "start": "Gorakhpur ISBT", "end": "Kushinagar", "color": "#27ae60"},
    {"id": "UP-02", "name": "Jhansi - Babina", "start": "Jhansi Bus Stand", "end": "Babina", "color": "#16a085"},

    # Maharashtra
    {"id": "MH-01", "name": "Latur - Ausa", "start": "Latur Bus Stand", "end": "Ausa", "color": "#8e44ad"},
    {"id": "MH-02", "name": "Nanded - Mudkhed", "start": "Nanded Bus Stand", "end": "Mudkhed", "color": "#9b59b6"},

    # Karnataka
    {"id": "KA-01", "name": "Hubballi - Dharwad", "start": "Hubballi CBT", "end": "Dharwad CBT", "color": "#2980b9"},
    {"id": "KA-02", "name": "Hassan - Belur", "start": "Hassan Bus Stand", "end": "Belur", "color": "#34495e"},

    # Bihar
    {"id": "BR-01", "name": "Muzaffarpur - Hajipur", "start": "Muzaffarpur Bus Stand", "end": "Hajipur", "color": "#e74c3c"},

    # Assam
    {"id": "AS-01", "name": "Tezpur - Dhekiajuli", "start": "Tezpur Bus Stand", "end": "Dhekiajuli", "color": "#2c3e50"}
]

def get_route(start_coord, end_coord):
    url = f"http://router.project-osrm.org/route/v1/driving/{start_coord['lng']},{start_coord['lat']};{end_coord['lng']},{end_coord['lat']}?overview=full&geometries=geojson"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data.get('routes'):
                return data['routes'][0]['geometry']['coordinates']
            return []
    except Exception as e:
        print(f"Failed to fetch route: {e}")
        return []

routes_data = []
stops_data = []
gtfs_data = []
delays_data = []

stop_counter = 1

for rd in routes_def:
    start_c = locations[rd["start"]]
    end_c = locations[rd["end"]]
    print(f"Fetching route for {rd['name']}...")
    coords = get_route(start_c, end_c)
    
    if not coords:
        print(f"Skipping {rd['name']} due to fetch failure.")
        continue
        
    polyline = [{"lat": c[1], "lng": c[0]} for c in coords]
    
    routes_data.append({
        "id": rd["id"],
        "name": rd["name"],
        "description": f"Route from {rd['start']} to {rd['end']}",
        "color": rd["color"],
        "polyline": polyline
    })
    
    # Generate 10-15 stops per route to simulate rural/tier-2 frequent stops
    num_stops = random.randint(10, 15)
    step = max(1, len(polyline) // (num_stops - 1))
    
    route_stops = []
    for i in range(num_stops):
        idx = min(i * step, len(polyline) - 1)
        if i == num_stops - 1:
            idx = len(polyline) - 1
            
        coord = polyline[idx]
        stop_id = f"S{stop_counter}"
        
        name = f"Stop {i+1} ({rd['name']})"
        if i == 0: name = rd['start']
        elif i == num_stops - 1: name = rd['end']
            
        stop = {
            "id": stop_id,
            "name": name,
            "lat": coord["lat"],
            "lng": coord["lng"],
            "order": i + 1,
            "routeId": rd["id"]
        }
        stops_data.append(stop)
        route_stops.append(stop)
        stop_counter += 1
        
    # Generate GTFS (6 trips per route from morning to evening)
    start_hours = [6, 8, 11, 14, 16, 18]
    for trip_idx, sh in enumerate(start_hours):
        trip_id = f"{rd['id']}-T{trip_idx+1}"
        current_time_mins = sh * 60 + random.randint(0, 30) # Randomize start slightly
        
        for stop_idx, stop in enumerate(route_stops):
            arr_h = current_time_mins // 60
            arr_m = current_time_mins % 60
            arr_str = f"{arr_h:02d}:{arr_m:02d}"
            
            dep_h = (current_time_mins + 1) // 60
            dep_m = (current_time_mins + 1) % 60
            dep_str = f"{dep_h:02d}:{dep_m:02d}"
            
            gtfs_data.append({
                "tripId": trip_id,
                "routeId": rd["id"],
                "stopId": stop["id"],
                "arrivalTime": arr_str,
                "departureTime": dep_str,
                "stopSequence": stop_idx + 1
            })
            
            # Add 8-15 mins for next stop in rural areas (slower speeds)
            current_time_mins += random.randint(8, 15)

    # Add 1-2 random delays for the route
    num_delays = random.randint(1, 2)
    for _ in range(num_delays):
        delay_stop = random.choice(route_stops[1:-1])
        delays_data.append({
            "routeId": rd["id"],
            "name": f"Traffic/Crossing near {delay_stop['name']}",
            "lat": delay_stop["lat"],
            "lng": delay_stop["lng"],
            "avgDelayMinutes": random.randint(5, 15),
            "probability": round(random.uniform(0.4, 0.9), 2),
            "description": "Rural congestion / Railway crossing"
        })

# Write files
def write_json(filename, data):
    with open(f"c:/Users/ankit/Downloads/BusMitra/data/{filename}", 'w') as f:
        json.dump(data, f, indent=2)

write_json("routes.json", routes_data)
write_json("stops.json", stops_data)
write_json("gtfs.json", gtfs_data)
write_json("delays.json", delays_data)

print("Extensive India-wide rural data generated successfully!")
