import os
import numpy as np
import pandas as pd
import json

DATA_DIR = r"D:\BusMitra\ml-service\data"
MODELS_DIR = r"D:\BusMitra\ml-service\models"

def generate_eta_data(num_samples=10000):
    np.random.seed(42)
    segment_ids = np.random.randint(1, 20, size=num_samples)
    hour_of_day = np.random.randint(6, 22, size=num_samples)
    day_of_week = np.random.randint(0, 7, size=num_samples)
    
    # 0 = clear, 1 = rain, 2 = fog
    weather = np.random.choice([0, 1, 2], size=num_samples, p=[0.7, 0.2, 0.1])
    
    # Base travel time in seconds (e.g. 100 to 500s per segment)
    base_travel_time = segment_ids * 20 + np.random.normal(0, 5, size=num_samples)
    
    # Delays based on time of day (rush hour) and weather
    rush_hour_multiplier = np.where((hour_of_day >= 8) & (hour_of_day <= 10) | (hour_of_day >= 17) & (hour_of_day <= 19), 1.5, 1.0)
    weather_multiplier = np.where(weather == 1, 1.3, np.where(weather == 2, 1.5, 1.0))
    
    actual_travel_time = base_travel_time * rush_hour_multiplier * weather_multiplier + np.random.normal(0, 15, size=num_samples)
    
    df = pd.DataFrame({
        'segment_id': segment_ids,
        'hour_of_day': hour_of_day,
        'day_of_week': day_of_week,
        'weather': weather,
        'actual_travel_time': actual_travel_time
    })
    df.to_csv(os.path.join(DATA_DIR, 'eta_data.csv'), index=False)
    print("Generated ETA data")

def generate_anomaly_data(num_samples=5000):
    np.random.seed(42)
    # Moga center roughly 30.8165° N, 75.1716° E
    lat_base, lon_base = 30.8165, 75.1716
    
    # Normal points
    lat = lat_base + np.random.normal(0, 0.01, size=num_samples)
    lon = lon_base + np.random.normal(0, 0.01, size=num_samples)
    speed = np.random.normal(30, 10, size=num_samples)
    heading = np.random.uniform(0, 360, size=num_samples)
    
    # Inject anomalies (5% of data) - sudden high speeds, weird locations
    num_anomalies = int(num_samples * 0.05)
    anomaly_indices = np.random.choice(num_samples, num_anomalies, replace=False)
    
    lat[anomaly_indices] += np.random.normal(0, 0.1, size=num_anomalies) # Way off route
    speed[anomaly_indices] = np.random.uniform(80, 120, size=num_anomalies) # Impossible bus speed
    
    df = pd.DataFrame({
        'lat': lat,
        'lon': lon,
        'speed': speed,
        'heading': heading
    })
    df.to_csv(os.path.join(DATA_DIR, 'anomaly_data.csv'), index=False)
    print("Generated Anomaly data")

def generate_stop_data():
    np.random.seed(42)
    # Create clusters (informal stops)
    clusters = [
        (30.8170, 75.1720), # Market
        (30.8120, 75.1750), # Crossroad
        (30.8200, 75.1680)  # College
    ]
    
    data = []
    for lat, lon in clusters:
        for _ in range(50): # 50 stops at each informal stop
            data.append([
                lat + np.random.normal(0, 0.0005),
                lon + np.random.normal(0, 0.0005),
                np.random.uniform(15, 60) # Dwell time in seconds
            ])
            
    # Random stops (noise)
    for _ in range(30):
        data.append([
            30.8165 + np.random.normal(0, 0.01),
            75.1716 + np.random.normal(0, 0.01),
            np.random.uniform(5, 10)
        ])
        
    df = pd.DataFrame(data, columns=['lat', 'lon', 'dwell_time'])
    df.to_csv(os.path.join(DATA_DIR, 'stop_data.csv'), index=False)
    print("Generated Stop data")

def generate_occupancy_data(num_samples=2000):
    np.random.seed(42)
    # Actual passengers vs BLE detected devices
    actual_occupancy = np.random.randint(0, 60, size=num_samples)
    
    # Usually BLE devices are correlated with occupancy, but some don't have phones, some have multiple
    ble_count = actual_occupancy * np.random.uniform(0.6, 0.9, size=num_samples) + np.random.normal(0, 2, size=num_samples)
    ble_count = np.clip(ble_count, 0, None).astype(int)
    
    df = pd.DataFrame({
        'ble_count': ble_count,
        'actual_occupancy': actual_occupancy
    })
    df.to_csv(os.path.join(DATA_DIR, 'occupancy_data.csv'), index=False)
    print("Generated Occupancy data")

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    generate_eta_data()
    generate_anomaly_data()
    generate_stop_data()
    generate_occupancy_data()
    print("All synthetic data generated successfully.")
