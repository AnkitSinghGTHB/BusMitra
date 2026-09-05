import os
import pickle
import warnings
import numpy as np
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging

warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(title="BusMitra ML Microservice", description="Low-Latency Machine Learning Engine for BusMitra")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

models = {
    "eta": None,
    "anomaly": None,
    "stops": None,
    "occupancy": None
}

def load_models():
    logging.info(f"Loading ML models from {MODELS_DIR}...")
    try:
        eta_path = os.path.join(MODELS_DIR, "eta_model.pkl")
        if os.path.exists(eta_path):
            with open(eta_path, "rb") as f:
                models["eta"] = pickle.load(f)
            logging.info("ETA model (XGBoost) loaded.")
        else:
            logging.warning("ETA model not found. Using algorithmic fallback.")

        anomaly_path = os.path.join(MODELS_DIR, "anomaly_model.pkl")
        if os.path.exists(anomaly_path):
            with open(anomaly_path, "rb") as f:
                models["anomaly"] = pickle.load(f)
            logging.info("Anomaly detector (Isolation Forest) loaded.")
        else:
            logging.warning("Anomaly model not found.")

        stops_path = os.path.join(MODELS_DIR, "stop_centers.pkl")
        if os.path.exists(stops_path):
            with open(stops_path, "rb") as f:
                models["stops"] = pickle.load(f)
            logging.info(f"Loaded {len(models['stops'])} informal stops (DBSCAN).")
        else:
            logging.warning("Informal stops cluster data not found.")

        occupancy_path = os.path.join(MODELS_DIR, "occupancy_model.pkl")
        if os.path.exists(occupancy_path):
            with open(occupancy_path, "rb") as f:
                models["occupancy"] = pickle.load(f)
            logging.info("Occupancy model (BLE sensing) loaded.")
        else:
            logging.warning("Occupancy model not found.")

    except Exception as e:
        logging.error(f"Error loading models: {e}")

@app.on_event("startup")
def startup_event():
    load_models()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": {
            "eta": models["eta"] is not None,
            "anomaly": models["anomaly"] is not None,
            "stops": models["stops"] is not None,
            "occupancy": models["occupancy"] is not None
        }
    }

# 1. Segment-Based ETA Predictor
@app.get("/predict-eta")
def predict_eta(
    segment_id: Optional[str] = Query("M1_S1"),
    time_of_day: Optional[float] = Query(8.5),
    day_of_week: Optional[int] = Query(2),
    weather: Optional[str] = Query("clear"),
    cumulative_delay: Optional[float] = Query(0.0),
    bus_id: Optional[str] = Query("M1"),
    speed: Optional[float] = Query(25.0)
):
    # Parse segment numeric index
    seg_numeric = 5
    if segment_id:
        digits = [c for c in segment_id if c.isdigit()]
        if digits:
            seg_numeric = max(1, min(20, int("".join(digits))))
        else:
            seg_numeric = (abs(hash(segment_id)) % 15) + 1

    weather_code = 0
    w_lower = (weather or "clear").lower()
    if "rain" in w_lower:
        weather_code = 1
    elif "fog" in w_lower:
        weather_code = 2

    c_delay = max(0.0, float(cumulative_delay or 0.0))
    tod = float(time_of_day if time_of_day is not None else 8.5)
    dow = int(day_of_week if day_of_week is not None else 2)

    predicted_minutes = 10.0
    source = "algorithmic_fallback"

    if models["eta"] is not None and "model" in models["eta"]:
        try:
            # XGBoost vector: [segment_id, hour_of_day, day_of_week, weather, cumulative_delay]
            X = np.array([[seg_numeric, tod, dow, weather_code, c_delay]])
            pred = float(models["eta"]["model"].predict(X)[0])
            predicted_minutes = max(1.0, pred)
            source = "ml_xgboost"
        except Exception as e:
            logging.warning(f"Inference error in ETA model: {e}")
            predicted_minutes = max(1.0, seg_numeric * 1.5 + c_delay)
    else:
        predicted_minutes = max(1.0, seg_numeric * 1.5 + c_delay)

    # Calculate tight confidence bounds
    eta_min = max(1.0, round(predicted_minutes * 0.85, 1))
    eta_max = max(eta_min + 1.0, round(predicted_minutes * 1.25 + 1.0, 1))

    return {
        "bus_id": bus_id,
        "segment_id": segment_id,
        "predicted_eta_minutes": round(predicted_minutes, 1),
        "eta_min": eta_min,
        "eta_max": eta_max,
        "confidence": 0.92 if source == "ml_xgboost" else 0.75,
        "source": source
    }

# 2. Trajectory Anomaly & Route Deviation Detector
class AnomalyRequest(BaseModel):
    bus_id: str
    lat: float
    lon: float
    speed: float
    heading: Optional[float] = 0.0
    cross_track_distance: Optional[float] = 0.0
    timestamp: Optional[str] = None

@app.post("/detect-anomaly")
def detect_anomaly(req: AnomalyRequest):
    cross_track_km = float(req.cross_track_distance or 0.0)
    is_anomaly = False
    anomaly_score = 0.1
    reasons = []

    # Deterministic guardrails (corridor 50m tolerance, hard detour at > 150m)
    if cross_track_km > 0.15:  # > 150 meters off corridor
        is_anomaly = True
        anomaly_score = 0.95
        reasons.append(f"Cross-track detour: {int(cross_track_km * 1000)}m off route corridor")

    if req.speed > 75.0:  # Excessive speed for city transit
        is_anomaly = True
        anomaly_score = max(anomaly_score, 0.90)
        reasons.append(f"Excessive velocity: {round(req.speed, 1)} km/h")

    # Isolation Forest inference
    if models["anomaly"] is not None and "model" in models["anomaly"]:
        try:
            X = np.array([[req.lat, req.lon, req.speed, req.heading or 0.0, cross_track_km]])
            # IsolationForest: -1 is anomaly, 1 is inlier
            prediction = models["anomaly"]["model"].predict(X)[0]
            raw_score = float(models["anomaly"]["model"].score_samples(X)[0]) # lower is more abnormal
            
            if prediction == -1:
                is_anomaly = True
                anomaly_score = max(anomaly_score, round(min(1.0, abs(raw_score) * 2.0), 2))
                reasons.append("Spatio-temporal trajectory anomaly (Isolation Forest)")
        except Exception as e:
            logging.warning(f"Error in anomaly model: {e}")

    return {
        "bus_id": req.bus_id,
        "is_anomaly": is_anomaly,
        "anomaly_score": round(anomaly_score, 2),
        "reason": "; ".join(reasons) if reasons else "Normal trajectory"
    }

# 3. Informal Stop Discovery (DBSCAN)
@app.get("/extract-stops")
def extract_stops(route_id: Optional[str] = "M1"):
    if models["stops"] is not None:
        return {
            "route_id": route_id,
            "source": "dbscan_spatial_clustering",
            "extracted_stops": models["stops"]
        }
    
    # Fallback default stops
    return {
        "route_id": route_id,
        "source": "default_seed",
        "extracted_stops": [
            {"stop_id": "INF_1", "name": "Old Grain Market Chowk", "lat": 30.8175, "lng": 75.1705, "historical_pickups": 60, "avg_dwell_sec": 35},
            {"stop_id": "INF_2", "name": "GT Road Coaching Center", "lat": 30.8220, "lng": 75.1510, "historical_pickups": 55, "avg_dwell_sec": 28}
        ]
    }

# 4. Passive Occupancy Estimation (BLE Sensing)
@app.get("/predict-occupancy")
def predict_occupancy(ble_count: int = Query(..., ge=0), bus_id: Optional[str] = "M1"):
    slope = 1.25
    intercept = 1.0
    empty_max = 15
    seated_max = 38

    if models["occupancy"] is not None:
        slope = models["occupancy"].get("slope", 1.25)
        intercept = models["occupancy"].get("intercept", 1.0)
        thresholds = models["occupancy"].get("tier_thresholds", {})
        empty_max = thresholds.get("empty_max", 15)
        seated_max = thresholds.get("seated_max", 38)

    estimated_passengers = max(0, int(round(ble_count * slope + intercept)))

    if estimated_passengers < empty_max:
        occupancy_tier = "empty"
        percentage = round((estimated_passengers / 50.0) * 100)
    elif estimated_passengers <= seated_max:
        occupancy_tier = "seated"
        percentage = round((estimated_passengers / 50.0) * 100)
    else:
        occupancy_tier = "crowded"
        percentage = min(120, round((estimated_passengers / 50.0) * 100))

    return {
        "bus_id": bus_id,
        "ble_count": ble_count,
        "estimated_passengers": estimated_passengers,
        "occupancy_tier": occupancy_tier,
        "status": occupancy_tier,
        "capacity_percentage": min(100, percentage)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
