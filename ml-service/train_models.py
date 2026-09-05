import os
import pandas as pd
import numpy as np
import pickle
import xgboost as xgb
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

DATA_DIR = r"D:\BusMitra\ml-service\data"
MODELS_DIR = r"D:\BusMitra\ml-service\models"

def train_eta_model():
    print("Training ETA Predictor...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'eta_data.csv'))
    X = df[['segment_id', 'hour_of_day', 'day_of_week', 'weather']]
    y = df['actual_travel_time']
    
    model = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    model.fit(X, y)
    
    with open(os.path.join(MODELS_DIR, 'eta_model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    print("Saved ETA model.")

def train_anomaly_model():
    print("Training Anomaly Detector...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'anomaly_data.csv'))
    X = df[['lat', 'lon', 'speed', 'heading']]
    
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)
    
    with open(os.path.join(MODELS_DIR, 'anomaly_model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    print("Saved Anomaly model.")

def train_stop_model():
    print("Training Stop Clustering Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'stop_data.csv'))
    # Filter points where bus was stopped for more than 15 seconds
    df_stopped = df[df['dwell_time'] >= 15]
    
    # 0.001 roughly 100m
    model = DBSCAN(eps=0.001, min_samples=10)
    model.fit(df_stopped[['lat', 'lon']])
    
    # Since DBSCAN is transductive, we typically save the cluster centers
    # For simplicity, we just save the fitted model or centers
    df_stopped['cluster'] = model.labels_
    centers = df_stopped[df_stopped['cluster'] != -1].groupby('cluster')[['lat', 'lon']].mean().values
    
    with open(os.path.join(MODELS_DIR, 'stop_centers.pkl'), 'wb') as f:
        pickle.dump(centers, f)
    print("Saved Informal Stops centers.")

def train_occupancy_model():
    print("Training Occupancy Predictor...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'occupancy_data.csv'))
    X = df[['ble_count']]
    y = df['actual_occupancy']
    
    model = make_pipeline(PolynomialFeatures(degree=2), LinearRegression())
    model.fit(X, y)
    
    with open(os.path.join(MODELS_DIR, 'occupancy_model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    print("Saved Occupancy model.")

if __name__ == "__main__":
    train_eta_model()
    train_anomaly_model()
    train_stop_model()
    train_occupancy_model()
    print("All models trained and saved successfully.")
