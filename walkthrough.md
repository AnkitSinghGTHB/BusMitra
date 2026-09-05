# BusMitra — Mobile-First Redesign & ML Microservice Integration

The BusMitra UI has been redesigned from the ground up as a **mobile-first, app-like Progressive Web App (PWA)** tailored for daily commuters and drivers in Tier-2 and Tier-3 cities.

Most recently, we have supercharged the backend by introducing an advanced **Multi-Model Python ML Microservice**.

---

## 🤖 Machine Learning Features Added

### 1. Segment-Based ETA Predictor (LightGBM/XGBoost)
- **What it does**: Replaces the old distance/speed heuristic with a robust LightGBM gradient boosting model.
- **How it works**: The backend calls `/predict-eta`, passing `segment_id`, `time_of_day`, `day_of_week`, and `cumulative_delay`.
- **Offline Resilient**: If the ML microservice goes down, the Express backend automatically falls back to the original deterministic distance calculation.

### 2. Trajectory Anomaly & Route Deviation (Isolation Forest)
- **What it does**: Automatically detects unauthorized detours, breakdowns, or road closures.
- **How it works**: The Node.js backend continuously calculates `cross_track_distance` and pings `/detect-anomaly`. If 3 consecutive anomalies occur, the bus is flagged as `"off_route"`.
- **UI Update**: The frontend immediately replaces the ETA with a red ⚠️ **"Bus deviation detected"** warning and changes the map marker to a pulsing red circle.

### 3. Passive Occupancy Estimation (BLE Sensing)
- **What it does**: Predicts how crowded a bus is without computer vision.
- **How it works**: The driver's device simulates counting unique Bluetooth Low Energy (BLE) beacons. The regression model maps the raw `bleCount` into tiers: **Empty**, **Seated**, or **Crowded**.
- **UI Update**: The frontend now displays these occupancy tiers directly within the main ETA card.

### 4. Informal Stop Extraction (DBSCAN Clustering)
- **What it does**: Historically extracts dense passenger boarding zones outside of designated depots.
- **How it works**: Uses DBSCAN via `/extract-stops` to identify unmapped stops from synthetic driver dwell data.

---

## 🏗️ Architecture: Python ML Microservice
- **`ml-service/app.py`**: A high-performance FastAPI server managing the inference endpoints.
- **`ml-service/generate_data.py` & `train_models.py`**: Complete data engineering pipelines generating synthetic Moga transit data and fitting `.pkl` models.
- **Dockerization**: The entire ML service is containerized via a lightweight `Dockerfile` and orchestrated via `docker-compose.db.yml` as `busmitra-ml`, spinning up automatically alongside the PostGIS database.

---

## 🚀 How to Test the ML Features

1. **Start the Database & ML Service**:
   ```bash
   docker-compose -f docker-compose.db.yml up -d
   ```
2. **Start Backend & Frontend**: (Requires separate terminals)
   ```bash
   cd backend && npm install && npm run dev
   cd frontend && npm install && npm run dev
   ```
3. **Simulate BLE Crowding**: 
   - Open the app, click the **Driver & Test** tab (🎛️ icon).
   - Adjust the **BLE Scanner Count** slider up to > 25 devices.
   - Watch the primary commuter UI instantly switch from "Empty" to "Crowded".
4. **Trigger an Anomaly**:
   - (Advanced) Modify the `cross_track_distance` manually in the simulator code to send a massive distance deviation. The bus status badge will trigger the red "Off-Route" state after 3 pings.
