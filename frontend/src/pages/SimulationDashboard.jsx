import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, Trash, Plus, PlusCircle, MapTrifold, Path,
  Gauge, Bus, CaretDown, CaretUp, ArrowsClockwise, X,
  GearSix, Stack, Eye
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SIM_API = '/api/simulation';

const stopMarkerIcon = (name) =>
  L.divIcon({
    className: 'custom-sim-stop',
    html: `<div style="background:#1e293b;color:white;border:2px solid #475569;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);">●</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

export default function SimulationDashboard() {
  // Routes and stops from backend
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [activeSims, setActiveSims] = useState([]);
  const [loading, setLoading] = useState(false);

  // Deploy form state
  const [deployOpen, setDeployOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [speedKmh, setSpeedKmh] = useState(25);
  const [dwellTimeSec, setDwellTimeSec] = useState(20);
  const [loopMode, setLoopMode] = useState(true);
  const [selectedStops, setSelectedStops] = useState([]);
  const [customBusId, setCustomBusId] = useState('');

  // Alternate routes
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAltIndex, setSelectedAltIndex] = useState(-1);
  const [altLoading, setAltLoading] = useState(false);

  // Fetch available routes
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(`${SIM_API}/routes`);
      if (res.ok) {
        const data = await res.json();
        setAvailableRoutes(data);
        if (data.length > 0 && !selectedRouteId) {
          setSelectedRouteId(data[0].id);
        }
      }
    } catch (e) {}
  }, [selectedRouteId]);

  // Fetch active simulated buses
  const fetchActiveSims = useCallback(async () => {
    try {
      const res = await fetch(`${SIM_API}/buses`);
      if (res.ok) {
        const data = await res.json();
        setActiveSims(data);
      }
    } catch (e) {}
  }, []);

  // Fetch route alternatives
  const fetchAlternatives = useCallback(async (routeId) => {
    if (!routeId) return;
    setAltLoading(true);
    setAlternatives([]);
    setSelectedAltIndex(-1);
    try {
      const res = await fetch(`${SIM_API}/routes/${routeId}/alternatives`);
      if (res.ok) {
        const data = await res.json();
        setAlternatives(data.alternatives || []);
      }
    } catch (e) {}
    setAltLoading(false);
  }, []);

  useEffect(() => {
    fetchRoutes();
    fetchActiveSims();
    const int = setInterval(fetchActiveSims, 2000);
    return () => clearInterval(int);
  }, [fetchRoutes, fetchActiveSims]);

  // When route changes, reset stops and fetch alternatives
  useEffect(() => {
    setSelectedStops([]);
    setAlternatives([]);
    setSelectedAltIndex(-1);
  }, [selectedRouteId]);

  const currentRoute = availableRoutes.find(r => r.id === selectedRouteId);

  // Deploy a new simulated bus
  const handleDeploy = async () => {
    setLoading(true);
    const body = {
      routeId: selectedRouteId,
      speedKmh,
      preferredStops: selectedStops,
      dwellTimeMs: dwellTimeSec * 1000,
      loopMode
    };
    if (customBusId.trim()) body.busId = customBusId.trim();

    // If an alternate route is selected, include its polyline
    if (selectedAltIndex >= 0 && alternatives[selectedAltIndex]) {
      body.polyline = alternatives[selectedAltIndex].polyline;
    }

    try {
      const res = await fetch(`${SIM_API}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Bus ${data.bus?.busId || ''} deployed!`);
        setCustomBusId('');
        fetchActiveSims();
      } else {
        toast.error(data.error || 'Deploy failed');
      }
    } catch (e) {
      toast.error('Connection error');
    }
    setLoading(false);
  };

  // Control actions
  const simControl = async (busId, action, method = 'POST', body = null) => {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);

      let url = `${SIM_API}/${busId}/${action}`;
      if (method === 'DELETE') url = `${SIM_API}/${busId}`;
      if (method === 'PUT') url = `${SIM_API}/${busId}/${action}`;

      const res = await fetch(url, opts);
      if (res.ok) {
        fetchActiveSims();
      }
    } catch (e) {}
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`${SIM_API}/clear/all`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('All simulations cleared');
        fetchActiveSims();
      }
    } catch (e) {}
  };

  const toggleStop = (stopId) => {
    setSelectedStops(prev =>
      prev.includes(stopId) ? prev.filter(s => s !== stopId) : [...prev, stopId]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Deploy New Bus Section ===== */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-0">
          <button
            onClick={() => setDeployOpen(!deployOpen)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <PlusCircle size={20} weight="bold" className="text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Deploy Simulated Bus</h3>
                <p className="text-[11px] text-gray-500">Configure route, speed, stops, and deploy a fake bus into the system</p>
              </div>
            </div>
            {deployOpen ? <CaretUp size={16} className="text-gray-400" /> : <CaretDown size={16} className="text-gray-400" />}
          </button>

          {deployOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex flex-col gap-4">
              {/* Route Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Route</label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger className="w-full h-9 text-sm bg-white">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.id}: {r.name} ({r.pointCount} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Bus ID */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Bus ID (optional)</label>
                <input
                  type="text"
                  value={customBusId}
                  onChange={e => setCustomBusId(e.target.value)}
                  placeholder="Auto-generated if empty (e.g. SIM-001)"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* Speed Slider */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Gauge size={14} /> Speed</span>
                  <span className="text-blue-600 font-mono">{speedKmh} km/h</span>
                </label>
                <Slider
                  value={[speedKmh]}
                  onValueChange={v => setSpeedKmh(v[0])}
                  min={5}
                  max={60}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>5 km/h (crawl)</span>
                  <span>60 km/h (max)</span>
                </div>
              </div>

              {/* Dwell Time */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Dwell Time at Stops</span>
                  <span className="text-blue-600 font-mono">{dwellTimeSec}s</span>
                </label>
                <Slider
                  value={[dwellTimeSec]}
                  onValueChange={v => setDwellTimeSec(v[0])}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Loop Mode */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loopMode}
                  onChange={e => setLoopMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-gray-700">Loop Mode</span>
                <span className="text-[10px] text-gray-400">(restart on route completion)</span>
              </label>

              {/* Preferred Stops */}
              {currentRoute && currentRoute.stops && currentRoute.stops.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                    Preferred Stops (bus will dwell here)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRoute.stops.map(stop => (
                      <button
                        key={stop.id}
                        onClick={() => toggleStop(stop.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                          selectedStops.includes(stop.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        #{stop.order} {stop.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternate Routes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Path size={14} /> Alternate Routes (OSRM)
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => fetchAlternatives(selectedRouteId)}
                    disabled={!selectedRouteId || altLoading}
                  >
                    {altLoading ? <ArrowsClockwise size={12} className="animate-spin" /> : <MapTrifold size={12} />}
                    {altLoading ? 'Loading...' : 'Find Alternatives'}
                  </Button>
                </div>

                {alternatives.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {alternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedAltIndex(selectedAltIndex === idx ? -1 : idx)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedAltIndex === idx
                              ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-gray-800">
                            Route {idx === 0 ? '(Default)' : `Alt ${idx}`}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {alt.distanceKm} km · {alt.durationMin} min · {alt.pointCount} pts
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Mini preview map for selected alternative */}
                    {selectedAltIndex >= 0 && alternatives[selectedAltIndex] && (
                      <div className="h-40 rounded-md border border-gray-200 overflow-hidden relative z-0">
                        <MapContainer
                          center={[
                            alternatives[selectedAltIndex].polyline[0]?.lat || 30.82,
                            alternatives[selectedAltIndex].polyline[0]?.lng || 75.15
                          ]}
                          zoom={12}
                          scrollWheelZoom={false}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          {alternatives.map((alt, idx) => (
                            <Polyline
                              key={idx}
                              positions={alt.polyline.map(p => [p.lat, p.lng])}
                              color={idx === selectedAltIndex ? '#1a56db' : '#cbd5e1'}
                              weight={idx === selectedAltIndex ? 4 : 2}
                              opacity={idx === selectedAltIndex ? 1 : 0.5}
                            />
                          ))}
                        </MapContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deploy Button */}
              <Button
                onClick={handleDeploy}
                disabled={!selectedRouteId || loading}
                className="w-full h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus weight="bold" size={16} />
                {loading ? 'Deploying...' : 'Deploy Simulated Bus'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Active Simulations Grid ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bus size={18} weight="bold" className="text-blue-600" />
            <h3 className="font-bold text-sm text-gray-900">
              Active Simulations ({activeSims.length})
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={fetchActiveSims}
            >
              <ArrowsClockwise size={12} /> Refresh
            </Button>
            {activeSims.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleClearAll}
              >
                <Trash size={12} /> Clear All
              </Button>
            )}
          </div>
        </div>

        {activeSims.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <Bus size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-medium">No simulated buses active</p>
            <p className="text-[10px] text-gray-400 mt-1">Deploy one above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSims.map(sim => (
              <SimBusCard
                key={sim.busId}
                sim={sim}
                onPause={() => simControl(sim.busId, 'pause')}
                onResume={() => simControl(sim.busId, 'resume')}
                onRemove={() => simControl(sim.busId, '', 'DELETE')}
                onSpeedChange={(speed) => simControl(sim.busId, 'speed', 'PUT', { speedKmh: speed })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Individual simulated bus control card */
function SimBusCard({ sim, onPause, onResume, onRemove, onSpeedChange }) {
  const [localSpeed, setLocalSpeed] = useState(sim.baseSpeedKmh);
  const [speedEditing, setSpeedEditing] = useState(false);

  useEffect(() => {
    if (!speedEditing) setLocalSpeed(sim.baseSpeedKmh);
  }, [sim.baseSpeedKmh, speedEditing]);

  const commitSpeed = () => {
    onSpeedChange(localSpeed);
    setSpeedEditing(false);
  };

  const statusColor = sim.isPaused
    ? 'bg-amber-100 text-amber-800'
    : sim.isDwelling
    ? 'bg-purple-100 text-purple-800'
    : 'bg-emerald-100 text-emerald-800';

  const statusText = sim.isPaused ? 'PAUSED' : sim.isDwelling ? 'DWELLING' : 'LIVE';

  return (
    <Card className="shadow-sm border-gray-200 bg-white overflow-hidden">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bus size={18} weight="bold" className="text-blue-600" />
            <span className="font-black text-base text-gray-900">{sim.busId}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Route & Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span className="font-medium">Route: <span className="text-gray-800 font-bold">{sim.routeId}</span></span>
            <span className="font-mono">{sim.progress}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${sim.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-gray-400 shrink-0" />
          <div className="flex-1">
            <Slider
              value={[localSpeed]}
              onValueChange={v => { setLocalSpeed(v[0]); setSpeedEditing(true); }}
              onPointerUp={commitSpeed}
              min={5}
              max={60}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-[10px] font-bold text-blue-600 font-mono w-12 text-right">
            {localSpeed} km/h
          </span>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          <span>Heading: {sim.heading}°</span>
          <span>Stops: {sim.preferredStops?.length || 0}</span>
          <span>{sim.loopMode ? '🔁 Loop' : '➡️ One-shot'}</span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={sim.isPaused ? onResume : onPause}
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
          >
            {sim.isPaused
              ? <><Play weight="fill" size={14} className="text-emerald-600 mr-1" /> Resume</>
              : <><Pause weight="fill" size={14} className="text-amber-600 mr-1" /> Pause</>
            }
          </Button>
          <Button
            onClick={onRemove}
            variant="outline"
            size="sm"
            className="w-8 px-0 h-8 text-rose-600 hover:bg-rose-50"
            title="Remove Bus"
          >
            <Trash weight="bold" size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
