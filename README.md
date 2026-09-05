# BusMitra v2 — Smart Transit Platform

BusMitra is a real-time transit telemetry platform featuring a Google Maps-style trip planner, real-road routing via OSRM, crowdsourced Web Bluetooth occupancy estimation, and multi-bus simulation capabilities.

## Prerequisites

Before running the application, you must install:
1. **Node.js & npm**: Download and install from [nodejs.org](https://nodejs.org/). Make sure to check the box that says "Add to PATH" during installation.
2. **Python 3.8+**: For the ML microservice (optional for basic features, but required for ETA/Anomaly AI features).

*Note: If you just installed Node.js, you may need to close and reopen your terminal/VS Code for the `npm` command to be recognized.*

## How to Run Locally

You will need to open **four separate terminal windows** to run the complete stack.

### 1. Start the ML Service (Python)
*Open Terminal 1*
```bash
cd BusMitra/ml-service
pip install -r requirements.txt
python app.py
```
*(Runs on port 8000)*

### 2. Start the Backend API (Node.js)
*Open Terminal 2*
```bash
cd BusMitra/backend
npm install
npm start
```
*(Runs on port 3000)*

### 3. Start the Frontend (Vite/React)
*Open Terminal 3*
```bash
cd BusMitra/frontend
npm install
npm run dev
```
*(Runs on port 5173)*

### 4. Start the Multi-Bus Simulator (Node.js)
*Open Terminal 4*
```bash
cd BusMitra/simulator
npm install
node index.js
```
*(Runs on port 3001 and spawns 8 virtual buses)*

## Testing the App

Once all services are running, open your browser to **`http://localhost:5173`**.

1. **Passenger Trip Planner:** Try searching for routes (e.g., "Current Location" to "Dagru"). You'll see real-time ETAs and multi-route comparisons.
2. **Admin Dashboard:** Navigate to the Admin Dashboard to see the Live Fleet map and the new **Simulator Bots** tab.
3. **Driver Dashboard:** Navigate to the Driver Portal. Here you can start a trip, broadcast real smartphone GPS, or turn on Web Bluetooth to simulate crowd detection.

## Troubleshooting

- **`npm is not recognized`**: Node.js is either not installed or not in your system's PATH. Reinstall Node.js and restart your computer/editor.
- **`Module not found`**: Ensure you ran `npm install` inside the specific folder (`backend`, `frontend`, or `simulator`) before running the start command.
- **Port already in use**: If port 3000 or 5173 is taken, ensure you don't have another instance of the server running in the background.
