import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Stop, Warning, Trophy, ArrowLeft, Broadcast, Compass, WifiSlash, Lightning, Bluetooth, Crosshair } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useBusStore } from '@/store/useBusStore';
import { DEFAULT_POLYLINE } from '@/data/transitData';
import { useBluetooth } from '@/hooks/useBluetooth';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { activeBus, fetchBuses, initSocket, routes } = useBusStore();
  const [busId, setBusId] = useState('M1');
  const [tripActive, setTripActive] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  
  // Real GPS State
  const [useRealGps, setUseRealGps] = useState(false);
  const [realSpeed, setRealSpeed] = useState(0);
  const watchIdRef = useRef(null);

  // Simulation State
  const [polyIndex, setPolyIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(25);
  const [deadZoneActive, setDeadZoneActive] = useState(false);
  const [bufferedPoints, setBufferedPoints] = useState([]);

  // Bluetooth State
  const { isScanning, bleCount, startScanning, stopScanning, error: bleError } = useBluetooth();

  useEffect(() => {
    initSocket();
    fetchBuses();
  }, [initSocket, fetchBuses]);

  // Clean up GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const handleStartTrip = async () => {
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId,
          driverId: 'D1',
          routeId: busId,
          lat: DEFAULT_POLYLINE[0].lat,
          lng: DEFAULT_POLYLINE[0].lng
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTripActive(true);
        setPolyIndex(0);
        toast.success(`Trip started! Session: ${data.sessionId || 'active'}`);
        fetchBuses();
      } else {
        toast.info(data.message || 'Trip already active.');
        setTripActive(true);
      }
    } catch (e) {
      toast.error('Could not connect to backend');
    }
  };

  const handleEndTrip = async () => {
    try {
      await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId })
      });
      setTripActive(false);
      toast.success('Trip completed.');
      fetchBuses();
      if (useRealGps) toggleRealGps();
    } catch (e) {
      setTripActive(false);
    }
  };

  const sendLocationUpdate = async (lat, lng, spd, heading) => {
    const payload = {
      busId,
      lat,
      lng,
      speed: spd,
      heading,
      ble_count: bleCount, // Injects real Bluetooth crowd data
      timestamp: new Date().toISOString()
    };

    if (deadZoneActive && !useRealGps) {
      setBufferedPoints((prev) => [...prev, payload]);
      toast.info(`Offline buffer: ${bufferedPoints.length + 1} pings queued`);
      return;
    }

    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchBuses();
    } catch (e) {}
  };

  // --- Real GPS Handling ---
  const toggleRealGps = () => {
    if (useRealGps) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      setUseRealGps(false);
      toast.info('Switched back to manual step simulation.');
    } else {
      if (!('geolocation' in navigator)) {
        toast.error('Geolocation not supported by this browser.');
        return;
      }
      toast.success('Live GPS active. Sending telemetry...');
      setUseRealGps(true);
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading } = pos.coords;
          const spdKmh = speed ? Math.round(speed * 3.6) : 0;
          setRealSpeed(spdKmh);
          sendLocationUpdate(latitude, longitude, spdKmh, heading || 0);
        },
        (err) => toast.error(`GPS Error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  // --- Manual Simulation Handling ---
  const handleSendStepLocation = () => {
    if (useRealGps) return;
    const nextIdx = (polyIndex + 1) % DEFAULT_POLYLINE.length;
    setPolyIndex(nextIdx);
    const pt = DEFAULT_POLYLINE[nextIdx];
    sendLocationUpdate(pt.lat, pt.lng, simSpeed + Math.floor(Math.random() * 4 - 2), 220);
    if (!deadZoneActive) toast.success(`Simulated Point ${nextIdx + 1} sent`);
  };

  const handleFlushBatch = async () => {
    if (bufferedPoints.length === 0) return;
    try {
      const res = await fetch('/api/location/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, updates: bufferedPoints })
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`⚡ Reconnected! Flushed ${d.batch_processed} buffered points`);
        setBufferedPoints([]);
        setDeadZoneActive(false);
        fetchBuses();
      }
    } catch (e) {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans max-w-md mx-auto sm:border-x sm:border-gray-200 pb-20">
      <header className="px-4 py-4 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Driver Portal</h1>
            <p className="text-[11px] text-gray-500 font-medium">Zero Hardware Telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
            BUS {busId}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${activeBus.status === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Route Select & Start/Stop */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Select Route / Bus</label>
              <Select disabled={tripActive} value={busId} onValueChange={setBusId}>
                <SelectTrigger className="w-full h-10 text-sm bg-white">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.code}: {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStartTrip}
                disabled={tripActive}
                className="flex-1 h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play weight="fill" size={16} /> START TRIP
              </Button>
              <Button
                onClick={handleEndTrip}
                disabled={!tripActive}
                className="flex-1 h-11 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Stop weight="fill" size={16} /> END TRIP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Web Bluetooth Occupancy Scanner */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-800">
                <Bluetooth size={16} className="text-blue-500" /> Web Bluetooth Scanning
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isScanning ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                {isScanning ? 'SCANNING' : 'IDLE'}
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium">Nearby Devices</span>
                <span className="text-2xl font-black text-blue-700">{bleCount}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 font-medium">Est. Occupancy</span>
                <span className="text-sm font-bold text-gray-800 uppercase">
                  {bleCount < 15 ? '🪑 Empty' : bleCount <= 38 ? '🪑 Seated' : '👥 Crowded'}
                </span>
              </div>
            </div>

            <Button
              onClick={isScanning ? stopScanning : startScanning}
              className={`w-full h-10 text-xs font-bold flex items-center gap-2 ${isScanning ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <Bluetooth weight="bold" /> {isScanning ? 'Stop Scanning' : 'Start Crowd Detection'}
            </Button>
            {bleError && <div className="text-[10px] text-rose-500">{bleError}</div>}
          </CardContent>
        </Card>

        {/* Live GPS Toggle */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-3">
             <div className="flex justify-between items-center text-xs font-bold text-gray-800">
              <span className="flex items-center gap-1">
                <Crosshair size={16} className={useRealGps ? 'text-emerald-500' : 'text-gray-400'} /> 
                Live Smartphone GPS
              </span>
              <span className="text-gray-500 font-mono">
                {useRealGps ? `${realSpeed} km/h` : 'Disabled'}
              </span>
            </div>
            <Button
              onClick={toggleRealGps}
              variant={useRealGps ? 'default' : 'outline'}
              className={`w-full h-11 text-xs font-bold shadow-sm ${useRealGps ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-gray-300'}`}
            >
              {useRealGps ? 'Stop Live GPS' : 'Enable Live GPS Telemetry'}
            </Button>
          </CardContent>
        </Card>

        {/* Telemetry Stepper & Speed Controls (Simulation fallback) */}
        {!useRealGps && (
          <Card className="shadow-sm border-gray-200 bg-white opacity-70 hover:opacity-100 transition-opacity">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1">
                  <Broadcast size={16} className="text-primary" /> GPS Step Simulation
                </span>
                <span className="text-gray-500 font-mono">
                  {polyIndex + 1} / {DEFAULT_POLYLINE.length}
                </span>
              </div>

              <Button
                onClick={handleSendStepLocation}
                className="w-full h-11 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
              >
                📍 Send Next Mock Point
              </Button>

              <div className="flex justify-between items-center text-xs text-gray-600 pt-1">
                <span>Sim Speed: <b>{simSpeed} km/h</b></span>
                <input
                  type="range"
                  min="15"
                  max="50"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-28 accent-primary cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100">
                <Button
                  onClick={() => setDeadZoneActive((d) => !d)}
                  variant="outline"
                  className="h-10 text-[10px] font-bold border-gray-300"
                >
                  {deadZoneActive ? '📶 End Dead Zone' : '🚫 Cut Signal'}
                </Button>
                <Button
                  onClick={handleFlushBatch}
                  disabled={bufferedPoints.length === 0}
                  className="h-10 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1"
                >
                  <Lightning size={14} />
                  Flush ({bufferedPoints.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      <footer className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-sm">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl text-xs font-bold text-gray-600"
          onClick={() => setReportOpen(true)}
        >
          <Warning size={16} weight="bold" />
          Report Route Hazard
        </Button>
      </footer>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Report Route Hazard</DialogTitle>
            <DialogDescription>Submit road blockages, accidents, or railway crossings.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="e.g. Railway crossing gate closed at Bhagwan Chowk"
            className="text-sm min-h-[90px]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Report submitted'); setReportOpen(false); setIssueText(''); }}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
