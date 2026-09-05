import os
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

app = FastAPI(title="BusMitra ML Microservice", description="Machine Learning API for BusMitra")
logging.basicConfig(level=logging.INFO)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Mock models mapping
models = {
    "eta": None,
    "anomaly": None,
    "stops": None,
    "occupancy": None
}

def load_models():
    """Load models from the models directory."""
    logging.info(f"Loading models from {MODELS_DIR}...")
    try:
        # Example for Loading an ETA model
        eta_path = os.path.join(MODELS_DIR, "eta_model.pkl")
        if os.path.exists(eta_path):
            models["eta"] = joblib.load(eta_path)
            logging.info("ETA model loaded.")
        else:
            logging.warning("ETA model not found. Using mock fallback.")
            
        # Example for Loading Anomaly model
        anomaly_path = os.path.join(MODELS_DIR, "anomaly_model.pkl")
        if os.path.exists(anomaly_path):
            models["anomaly"] = joblib.load(anomaly_path)
            logging.info("Anomaly model loaded.")
        else:
            logging.warning("Anomaly model not found. Using mock fallback.")
            
    except Exception as e:
        logging.error(f"Error loading models: {e}")

@app.on_event("startup")
async def startup_event():
    load_models()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

class ETARequest(BaseModel):
    bus_id: str
    route_id: str
    current_lat: float
    current_lon: float
    speed: float

@app.get("/predict-eta")
def predict_eta(bus_id: str, route_id: str, current_lat: float, current_lon: float, speed: float):
    # Mock LightGBM/XGBoost inference
    if models["eta"] is not None:
        # prediction = models["eta"].predict([[current_lat, current_lon, speed]])
        pass
        
    return {
        "bus_id": bus_id,
        "predicted_eta_minutes": 15.5,
        "confidence": 0.85,
        "source": "ml_model"
    }

class AnomalyRequest(BaseModel):
    bus_id: str
    lat: float
    lon: float
    speed: float
    timestamp: str

@app.post("/detect-anomaly")
def detect_anomaly(req: AnomalyRequest):
    # Mock Isolation Forest inference
    if models["anomaly"] is not None:
        pass
        
    is_anomaly = req.speed > 80.0 # simple mock rule for demo
    
    return {
        "bus_id": req.bus_id,
        "is_anomaly": is_anomaly,
        "anomaly_score": 0.92 if is_anomaly else 0.12
    }

@app.get("/extract-stops")
def extract_stops(route_id: str):
    # Mock DBSCAN clustering to extract stops from historical GPS data
    return {
        "route_id": route_id,
        "extracted_stops": [
            {"lat": 30.8123, "lon": 75.1764, "cluster_size": 45},
            {"lat": 30.8251, "lon": 75.1632, "cluster_size": 32}
        ]
    }

@app.get("/predict-occupancy")
def predict_occupancy(bus_id: str, ble_device_count: int):
    # Mock Regression based on BLE count
    estimated_occupancy = int(ble_device_count * 1.5)
    return {
        "bus_id": bus_id,
        "ble_count": ble_device_count,
        "estimated_passengers": estimated_occupancy,
        "status": "crowded" if estimated_occupancy > 40 else "normal"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
