import os
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

def generate_eta_data(num_samples=10000):
    np.random.seed(42)
    segment_ids = np.random.randint(1, 20, size=num_samples)
    hour_of_day = np.random.randint(6, 22, size=num_samples)
    day_of_week = np.random.randint(0, 7, size=num_samples)
    
    # 0 = clear, 1 = rain, 2 = fog
    weather = np.random.choice([0, 1, 2], size=num_samples, p=[0.7, 0.2, 0.1])
    # Cumulative delay in minutes from bottlenecks like railway crossings
    cumulative_delay = np.random.exponential(scale=3.0, size=num_samples)
    cumulative_delay = np.clip(cumulative_delay, 0, 25)
    
    # Base travel time in minutes (e.g. 1.5 to 15 mins per segment depending on segment_id)
    base_travel_time_min = segment_ids * 1.2 + np.random.normal(0, 0.5, size=num_samples)
    
    # Delays based on rush hour and weather
    rush_hour_multiplier = np.where(
        ((hour_of_day >= 8) & (hour_of_day <= 10)) | ((hour_of_day >= 17) & (hour_of_day <= 19)),
        1.45,
        1.0
    )
    weather_multiplier = np.where(weather == 1, 1.25, np.where(weather == 2, 1.4, 1.0))
    
    actual_travel_time_min = (base_travel_time_min * rush_hour_multiplier * weather_multiplier) + cumulative_delay + np.random.normal(0, 0.5, size=num_samples)
    actual_travel_time_min = np.maximum(1.0, actual_travel_time_min)
    
    df = pd.DataFrame({
        'segment_id': segment_ids,
        'hour_of_day': hour_of_day,
        'day_of_week': day_of_week,
        'weather': weather,
        'cumulative_delay': np.round(cumulative_delay, 1),
        'actual_travel_time': np.round(actual_travel_time_min, 2)
    })
    df.to_csv(os.path.join(DATA_DIR, 'eta_data.csv'), index=False)
    print(f"Generated {len(df)} samples for ETA data.")

def generate_anomaly_data(num_samples=5000):
    np.random.seed(42)
    # Moga center roughly 30.8165° N, 75.1716° E
    lat_base, lon_base = 30.8165, 75.1716
    
    # Normal points (on corridor)
    lat = lat_base + np.random.normal(0, 0.008, size=num_samples)
    lon = lon_base + np.random.normal(0, 0.008, size=num_samples)
    speed = np.clip(np.random.normal(28, 8, size=num_samples), 0, 50)
    heading = np.random.uniform(0, 360, size=num_samples)
    cross_track_km = np.abs(np.random.normal(0.015, 0.01, size=num_samples)) # ~15m buffer
    
    # Inject 5% anomalies (e.g., unauthorized detours, extreme speeds)
    num_anomalies = int(num_samples * 0.05)
    anomaly_indices = np.random.choice(num_samples, num_anomalies, replace=False)
    
    lat[anomaly_indices] += np.random.normal(0, 0.08, size=num_anomalies)
    lon[anomaly_indices] += np.random.normal(0, 0.08, size=num_anomalies)
    cross_track_km[anomaly_indices] += np.random.uniform(0.3, 1.5, size=num_anomalies) # 300m - 1.5km off corridor
    speed[anomaly_indices] = np.random.choice([0, 85, 95, 110], size=num_anomalies) # Stuck or impossible speed
    
    df = pd.DataFrame({
        'lat': np.round(lat, 5),
        'lon': np.round(lon, 5),
        'speed': np.round(speed, 1),
        'heading': np.round(heading, 1),
        'cross_track_km': np.round(cross_track_km, 3)
    })
    df.to_csv(os.path.join(DATA_DIR, 'anomaly_data.csv'), index=False)
    print(f"Generated {len(df)} samples for Anomaly data.")

def generate_stop_data():
    np.random.seed(42)
    # Known informal clusters outside depot
    clusters = [
        {"name": "Old Grain Market Chowk", "lat": 30.8175, "lon": 75.1705, "count": 60, "avg_dwell": 35},
        {"name": "GT Road Coaching Center", "lat": 30.8220, "lon": 75.1510, "count": 55, "avg_dwell": 28},
        {"name": "Civil Hospital Gate 2", "lat": 30.8208, "lon": 75.1555, "count": 48, "avg_dwell": 40},
        {"name": "Canal Bridge Corner", "lat": 30.8285, "lon": 75.1310, "count": 42, "avg_dwell": 25}
    ]
    
    data = []
    for c in clusters:
        for _ in range(c["count"]):
            data.append([
                c["lat"] + np.random.normal(0, 0.0003),
                c["lon"] + np.random.normal(0, 0.0003),
                np.clip(np.random.normal(c["avg_dwell"], 8), 16, 120),
                c["name"]
            ])
            
    # Random short slowdowns (noise - traffic lights, pedestrian crossing)
    for _ in range(50):
        data.append([
            30.8165 + np.random.normal(0, 0.015),
            75.1716 + np.random.normal(0, 0.015),
            np.random.uniform(4, 12),
            "noise"
        ])
        
    df = pd.DataFrame(data, columns=['lat', 'lon', 'dwell_time', 'label'])
    df.to_csv(os.path.join(DATA_DIR, 'stop_data.csv'), index=False)
    print(f"Generated {len(df)} samples for Stop Dwell data.")

def generate_occupancy_data(num_samples=2500):
    np.random.seed(42)
    actual_passengers = np.random.randint(0, 60, size=num_samples)
    
    # BLE beacons detected with RSSI thresholding (strong signals inside cabin)
    # Typically 65% to 85% carry detectable BLE peripherals (phone, smartwatch, TWS)
    ble_ratio = np.random.uniform(0.65, 0.85, size=num_samples)
    ble_detected = np.clip(np.round(actual_passengers * ble_ratio + np.random.normal(0, 1.5, size=num_samples)), 0, 50).astype(int)
    
    # Categorical tier
    # Empty (< 15), Seated (15 - 38), Crowded (> 38)
    tiers = []
    for p in actual_passengers:
        if p < 15:
            tiers.append('empty')
        elif p <= 38:
            tiers.append('seated')
        else:
            tiers.append('crowded')
            
    df = pd.DataFrame({
        'ble_count': ble_detected,
        'actual_passengers': actual_passengers,
        'occupancy_tier': tiers
    })
    df.to_csv(os.path.join(DATA_DIR, 'occupancy_data.csv'), index=False)
    print(f"Generated {len(df)} samples for BLE Occupancy data.")

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    generate_eta_data()
    generate_anomaly_data()
    generate_stop_data()
    generate_occupancy_data()
    print("All synthetic datasets generated successfully.")
