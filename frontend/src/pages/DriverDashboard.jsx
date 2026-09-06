import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Stop, Warning, ArrowLeft, Crosshair, Bluetooth, MapTrifold, MapPin } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useBusStore } from '@/store/useBusStore';
import { useBluetooth } from '@/hooks/useBluetooth';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Utility for fetching custom route from OSRM
const fetchOsrmRoute = async (startLat, startLng, endLat, endLng) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    }
  } catch (err) {
    console.error("OSRM Route error", err);
  }
  return null;
};

// Map click handler for origin/destination
function MapClickHandler({ origin, setOrigin, destination, setDestination }) {
  useMapEvents({
    click(e) {
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (!origin) {
        setOrigin(pt);
      } else if (!destination) {
        setDestination(pt);
      } else {
        setOrigin(pt);
        setDestination(null);
      }
    },
  });
  return null;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { activeBus, fetchBuses, initSocket, routes, driverCustomRoute, setDriverCustomRoute } = useBusStore();
  const [busId, setBusId] = useState('M1');
  const [tripActive, setTripActive] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  
  // Real GPS State
  const [gpsActive, setGpsActive] = useState(false);
  const [realSpeed, setRealSpeed] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsSignal, setGpsSignal] = useState('none');
  const [gpsAltitude, setGpsAltitude] = useState(null);
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const offlineBufferRef = useRef([]);

  // Bluetooth State
  const { isScanning, bleCount, scanMode, startScanning, stopScanning, error: bleError } = useBluetooth();

  // Route Planning State
  const [planningMode, setPlanningMode] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [previewPolyline, setPreviewPolyline] = useState([]);

  useEffect(() => {
    initSocket();
    fetchBuses();
  }, [initSocket, fetchBuses]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Update preview polyline when both origin and destination exist
  useEffect(() => {
    if (origin && destination) {
      fetchOsrmRoute(origin.lat, origin.lng, destination.lat, destination.lng).then(poly => {
        if (poly) setPreviewPolyline(poly);
      });
    } else {
      setPreviewPolyline([]);
    }
  }, [origin, destination]);

  const handleStartTrip = async () => {
    const polyline = driverCustomRoute ? driverCustomRoute.polyline : null;
    const startPoint = polyline && polyline.length > 0 ? polyline[0] : { lat: 30.8163, lng: 75.1720 };
    
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId,
          driverId: 'D1',
          routeId: busId,
          lat: startPoint.lat,
          lng: startPoint.lng,
          customPolyline: polyline
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTripActive(true);
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
      if (gpsActive) toggleGps();
    } catch (e) {
      setTripActive(false);
    }
  };

  const flushOfflineBuffer = async () => {
    if (offlineBufferRef.current.length === 0) return;
    try {
      const res = await fetch('/api/location/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, updates: offlineBufferRef.current })
      });
      if (res.ok) {
        toast.success(`⚡ Reconnected! Flushed ${offlineBufferRef.current.length} buffered points`);
        offlineBufferRef.current = [];
      }
    } catch (e) { /* Still offline, keep buffer */ }
  };

  const sendLocationUpdate = async (lat, lng, spd, heading) => {
    const payload = {
      busId,
      lat,
      lng,
      speed: spd,
      heading,
      ble_count: bleCount !== null ? bleCount : undefined, // No fake data
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchBuses();
        if (offlineBufferRef.current.length > 0) {
          await flushOfflineBuffer();
        }
      } else {
        offlineBufferRef.current.push(payload);
      }
    } catch (e) {
      offlineBufferRef.current.push(payload);
      toast.info(`Offline: ${offlineBufferRef.current.length} points buffered`);
    }
  };

  const classifyGpsSignal = (accuracy) => {
    if (accuracy === null || accuracy === undefined) return 'none';
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 30) return 'good';
    if (accuracy <= 100) return 'poor';
    return 'none';
  };

  const toggleGps = () => {
    if (gpsActive) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      setGpsActive(false);
      setGpsSignal('none');
      setGpsAccuracy(null);
      toast.info('Stopped live GPS.');
    } else {
      if (!('geolocation' in navigator)) {
        toast.error('Geolocation not supported by this browser.');
        return;
      }
      toast.success('Live GPS active. Sending telemetry...');
      setGpsActive(true);
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading, accuracy, altitude } = pos.coords;
          
          setGpsAccuracy(Math.round(accuracy));
          setGpsAltitude(altitude ? Math.round(altitude) : null);
          const signal = classifyGpsSignal(accuracy);
          setGpsSignal(signal);
          
          if (signal === 'none') {
            toast.warning(`GPS accuracy too low (${Math.round(accuracy)}m). Skipping update.`);
            return; 
          }
          
          const last = lastPositionRef.current;
          if (last && last.lat === latitude && last.lng === longitude) {
            return;
          }
          lastPositionRef.current = { lat: latitude, lng: longitude };
          
          const rawSpeedKmh = speed ? Math.round(speed * 3.6) : 0;
          const spdKmh = Math.min(rawSpeedKmh, 120);
          
          setRealSpeed(spdKmh);
          sendLocationUpdate(latitude, longitude, spdKmh, heading || 0);
        },
        (err) => {
          setGpsSignal('none');
          toast.error(`GPS Error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const confirmCustomRoute = () => {
    if (previewPolyline.length > 0) {
      setDriverCustomRoute({ polyline: previewPolyline, origin, destination });
      setPlanningMode(false);
      toast.success('Custom route saved!');
    } else {
      toast.error('Route not generated. Please set valid Origin and Destination.');
    }
  };

  const useCurrentLocationForOrigin = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error('Could not get current location.')
      );
    }
  };

  const clearCustomRoute = () => {
    setDriverCustomRoute(null);
    setOrigin(null);
    setDestination(null);
    setPreviewPolyline([]);
    toast.info('Reverted to predefined route.');
  };

  // Custom icon for marker
  const mapPinIcon = new L.DivIcon({
    html: `<div class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md font-bold text-xs">P</div>`,
    className: 'custom-pin-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

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
            
            {!driverCustomRoute ? (
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Select Predefined Route</label>
                <div className="flex gap-2">
                  <Select disabled={tripActive} value={busId} onValueChange={setBusId}>
                    <SelectTrigger className="w-full h-10 text-sm bg-white flex-1">
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.code}: {r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    className="px-3" 
                    onClick={() => setPlanningMode(!planningMode)}
                    title="Plan Custom Route"
                    disabled={tripActive}
                  >
                    <MapTrifold size={18} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1">
                    <MapTrifold size={16} /> Custom Route Active
                  </h3>
                  {!tripActive && (
                    <button onClick={clearCustomRoute} className="text-xs text-rose-600 font-semibold hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-blue-600 font-medium">
                  Routing using {driverCustomRoute.polyline.length} waypoints via OSRM.
                </p>
              </div>
            )}

            {/* Expandable Map Route Planner */}
            {planningMode && !driverCustomRoute && (
              <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700">Custom Route Planner</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1 text-[10px]" onClick={useCurrentLocationForOrigin}>
                    <MapPin size={12} className="mr-1" /> My Location (Origin)
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1 text-[10px]" onClick={() => { setOrigin(null); setDestination(null); }}>
                    Reset Map
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 italic">Tap map to set Origin (1st tap) and Destination (2nd tap).</p>
                
                <div className="h-48 w-full rounded-md border border-gray-300 overflow-hidden relative z-0">
                  <MapContainer center={[30.8163, 75.1720]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler origin={origin} setOrigin={setOrigin} destination={destination} setDestination={setDestination} />
                    {origin && <Marker position={origin} icon={mapPinIcon} />}
                    {destination && <Marker position={destination} icon={mapPinIcon} />}
                    {previewPolyline.length > 0 && <Polyline positions={previewPolyline} color="#1a56db" weight={4} />}
                  </MapContainer>
                </div>
                
                <Button 
                  onClick={confirmCustomRoute} 
                  disabled={previewPolyline.length === 0}
                  className="w-full h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Confirm & Use Route
                </Button>
              </div>
            )}

            <div className="flex gap-2 mt-2">
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
                <Bluetooth size={16} className="text-blue-500" /> Crowd Detection
              </span>
              
              {scanMode === 'real' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 animate-pulse">
                  🔵 REAL BLE ACTIVE
                </span>
              )}
              {scanMode === 'idle' && !bleError && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  IDLE
                </span>
              )}
              {scanMode === 'unsupported' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                  UNSUPPORTED
                </span>
              )}
            </div>

            {scanMode === 'idle' && !isScanning && (
              <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 leading-tight">
                💡 A Chrome permission dialog will appear — press <b>"Allow"</b> to start scanning nearby Bluetooth devices for crowd estimation.
              </div>
            )}

            {scanMode === 'real' && bleCount === 0 && (
              <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 leading-tight">
                📡 Scanning for BLE advertisements... Count updates every 5 seconds. Nearby devices must be Bluetooth-discoverable.
              </div>
            )}
            
            <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium">Nearby Devices</span>
                <span className="text-2xl font-black text-blue-700">
                  {bleCount !== null ? bleCount : '—'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 font-medium">Est. Occupancy</span>
                <span className="text-sm font-bold text-gray-800 uppercase">
                  {bleCount === null ? '—' : 
                   bleCount < 15 ? '🪑 Empty' : 
                   bleCount <= 38 ? '🪑 Seated' : '👥 Crowded'}
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

        {/* Live GPS Status */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-3">
             <div className="flex justify-between items-center text-xs font-bold text-gray-800">
              <span className="flex items-center gap-1">
                <Crosshair size={16} className={gpsActive ? 'text-emerald-500' : 'text-gray-400'} /> 
                Live Smartphone GPS
              </span>
              <span className="text-gray-500 font-mono">
                {gpsActive ? `${realSpeed} km/h` : 'Disabled'}
              </span>
            </div>

            {gpsActive && (
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    gpsSignal === 'excellent' ? 'bg-emerald-500' :
                    gpsSignal === 'good' ? 'bg-blue-500' :
                    gpsSignal === 'poor' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-[11px] font-bold text-gray-700 uppercase">{gpsSignal}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  ±{gpsAccuracy || '—'}m
                  {gpsAltitude !== null && ` · ${gpsAltitude}m alt`}
                </span>
              </div>
            )}

            <Button
              onClick={toggleGps}
              variant={gpsActive ? 'default' : 'outline'}
              className={`w-full h-11 text-xs font-bold shadow-sm ${gpsActive ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-gray-300'}`}
            >
              {gpsActive ? 'Stop Live GPS' : 'Enable Live GPS Telemetry'}
            </Button>
          </CardContent>
        </Card>

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
