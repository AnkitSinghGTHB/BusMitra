import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.linear_model import LinearRegression

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

def train_eta_model():
    print("Training Segment-Based ETA Model (GradientBoosting)...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'eta_data.csv'))
    features = ['segment_id', 'hour_of_day', 'day_of_week', 'weather', 'cumulative_delay']
    X = df[features]
    y = df['actual_travel_time']
    
    model = GradientBoostingRegressor(
        n_estimators=80,
        max_depth=4,
        learning_rate=0.08,
        random_state=42
    )
    model.fit(X, y)
    
    model_payload = {
        "model": model,
        "features": features,
        "rmse": float(np.sqrt(np.mean((model.predict(X) - y) ** 2)))
    }
    
    with open(os.path.join(MODELS_DIR, 'eta_model.pkl'), 'wb') as f:
        pickle.dump(model_payload, f)
    print(f"Saved ETA model. Training RMSE: {model_payload['rmse']:.3f} min.")

def train_anomaly_model():
    print("Training Trajectory Anomaly Detector (Isolation Forest)...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'anomaly_data.csv'))
    features = ['lat', 'lon', 'speed', 'heading', 'cross_track_km']
    X = df[features]
    
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        max_samples='auto',
        random_state=42
    )
    model.fit(X)
    
    model_payload = {
        "model": model,
        "features": features
    }
    
    with open(os.path.join(MODELS_DIR, 'anomaly_model.pkl'), 'wb') as f:
        pickle.dump(model_payload, f)
    print("Saved Anomaly model.")

def train_stop_model():
    print("Extracting Informal Stops (DBSCAN Clustering)...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'stop_data.csv'))
    # Filter points where bus dwell time is >= 15 seconds outside terminal
    df_stopped = df[df['dwell_time'] >= 15.0].copy()
    
    # eps ~ 0.0007 is roughly 70-80 meters in lat/lng
    coords = df_stopped[['lat', 'lon']].values
    db = DBSCAN(eps=0.0007, min_samples=12, metric='euclidean')
    labels = db.fit_predict(coords)
    df_stopped['cluster'] = labels
    
    discovered_stops = []
    unique_clusters = [c for c in set(labels) if c != -1]
    
    for c_id in unique_clusters:
        cluster_pts = df_stopped[df_stopped['cluster'] == c_id]
        mean_lat = float(cluster_pts['lat'].mean())
        mean_lon = float(cluster_pts['lon'].mean())
        avg_dwell = float(cluster_pts['dwell_time'].mean())
        sample_count = int(len(cluster_pts))
        label_mode = cluster_pts['label'].mode()[0] if 'label' in cluster_pts else f"Informal Stop #{c_id + 1}"
        
        discovered_stops.append({
            "stop_id": f"INF_{c_id + 1}",
            "name": label_mode,
            "lat": round(mean_lat, 5),
            "lng": round(mean_lon, 5),
            "avg_dwell_sec": round(avg_dwell, 1),
            "historical_pickups": sample_count
        })
    
    with open(os.path.join(MODELS_DIR, 'stop_centers.pkl'), 'wb') as f:
        pickle.dump(discovered_stops, f)
    print(f"Saved {len(discovered_stops)} discovered informal stops.")

def train_occupancy_model():
    print("Training Passive Occupancy Model (BLE Sensing)...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'occupancy_data.csv'))
    X = df[['ble_count']].values
    y = df['actual_passengers'].values
    
    reg = LinearRegression()
    reg.fit(X, y)
    
    model_payload = {
        "slope": float(reg.coef_[0]),
        "intercept": float(reg.intercept_),
        "tier_thresholds": {
            "empty_max": 15,
            "seated_max": 38
        }
    }
    
    with open(os.path.join(MODELS_DIR, 'occupancy_model.pkl'), 'wb') as f:
        pickle.dump(model_payload, f)
    print(f"Saved Occupancy model (Multiplier: {model_payload['slope']:.2f}, Intercept: {model_payload['intercept']:.2f}).")

if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    train_eta_model()
    train_anomaly_model()
    train_stop_model()
    train_occupancy_model()
    print("All models trained and persisted successfully.")
