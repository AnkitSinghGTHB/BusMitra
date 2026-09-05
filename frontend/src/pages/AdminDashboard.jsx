import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, TabGroup, TabList, Tab, TabPanels, TabPanel, Text, Metric, Grid } from '@tremor/react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Download, ArrowsClockwise, Bus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DEFAULT_POLYLINE, DEFAULT_STOPS } from '@/data/transitData';
import SimulatorPanel from './SimulatorPanel';

const getBusIcon = (status, heading) => {
  const color = status === 'live' ? '#059669' : status === 'crowd_restored' ? '#d97706' : '#64748b';
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `<div style="transform: rotate(${heading || 0}deg); background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const adminDrivers = [
  { rank: 1, name: 'Sandeep Singh', busId: 'M1', score: 1450, onTimePercent: 98 },
  { rank: 2, name: 'Rajesh Kumar', busId: 'M1', score: 1320, onTimePercent: 94 },
  { rank: 3, name: 'Gurpreet Kaur', busId: 'M2', score: 1150, onTimePercent: 88 },
  { rank: 4, name: 'Amit Sharma', busId: 'M3', score: 980, onTimePercent: 75 }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [health, setHealth] = useState({ status: 'ok', activeBuses: 1, uptime: 0 });

  const fetchLiveFleet = async () => {
    try {
      const [resBuses, resHealth] = await Promise.all([
        fetch('/api/buses').then((r) => r.json()),
        fetch('/health').then((r) => r.json())
      ]);
      setBuses(resBuses || []);
      setHealth(resHealth || { status: 'ok', activeBuses: 1 });
    } catch (e) {}
  };

  useEffect(() => {
    fetchLiveFleet();
    const interval = setInterval(fetchLiveFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  const mogaCenter = [30.825, 75.148];
  const polylinePositions = DEFAULT_POLYLINE.map((pt) => [pt.lat, pt.lng]);

  const activeBusesCount = buses.filter((b) => b.status === 'live' || b.status === 'crowd_restored').length || 1;
  const offlineBusesCount = buses.filter((b) => b.status === 'scheduled' || b.status === 'offline').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans sm:px-6 lg:px-8 pb-12">
      <header className="px-4 py-5 bg-white border-b border-gray-200 shadow-sm sm:rounded-b-lg mb-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Moga Municipal Fleet Dashboard</h1>
              <p className="text-xs text-gray-500 font-medium">Real-Time City Transport Monitoring & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLiveFleet} className="gap-1 text-xs">
              <ArrowsClockwise size={14} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.open('/api/gtfs-rt/vehicle-positions', '_blank');
              }}
              className="gap-1 text-xs bg-primary text-white"
            >
              <Download size={14} /> GTFS-RT Feed
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-0">
        <TabGroup>
          <TabList className="mb-6 bg-white p-1 rounded-lg border border-gray-200 w-max shadow-sm">
            <Tab className="px-6 py-2 rounded-md text-xs font-bold ui-selected:bg-primary ui-selected:text-white">Live Fleet</Tab>
            <Tab className="px-6 py-2 rounded-md text-xs font-bold ui-selected:bg-primary ui-selected:text-white">Simulator Bots</Tab>
            <Tab className="px-6 py-2 rounded-md text-xs font-bold ui-selected:bg-primary ui-selected:text-white">Driver Leaderboard</Tab>
            <Tab className="px-6 py-2 rounded-md text-xs font-bold ui-selected:bg-primary ui-selected:text-white">GTFS-RT Feeds</Tab>
          </TabList>

          <TabPanels>
            {/* Tab 1: Live Fleet */}
            <TabPanel>
              <div className="flex flex-col gap-6">
                <Card className="p-0 overflow-hidden shadow-sm border-gray-200 bg-white">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-sm font-bold text-gray-800">Live Corridor Map (Moga ⇄ Dagru)</h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ● Active Fleet: {buses.length || 1}
                    </span>
                  </div>
                  <div className="h-[420px] w-full bg-gray-100 relative z-0">
                    <MapContainer center={mogaCenter} zoom={13} scrollWheelZoom={false} className="w-full h-full z-0">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Polyline positions={polylinePositions} color="#1a56db" weight={5} opacity={0.8} />

                      {DEFAULT_STOPS.map((s) => (
                        <Marker key={s.id} position={[s.lat, s.lng]}>
                          <Popup>
                            <b>{s.name}</b> (Stop #{s.order})
                          </Popup>
                        </Marker>
                      ))}

                      {buses.map((bus) => (
                        <Marker key={bus.busId} position={[bus.lat, bus.lng]} icon={getBusIcon(bus.status, bus.heading)}>
                          <Popup>
                            <b>Bus {bus.busId}</b>
                            <div>Status: {bus.status}</div>
                            <div>Speed: {bus.speed} km/h</div>
                            <div>Occupancy: {bus.occupancy_tier || 'seated'}</div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </Card>

                <Grid numItemsSm={3} className="gap-4">
                  <Card decoration="top" decorationColor="emerald" className="shadow-sm bg-white">
                    <Text className="text-xs text-gray-500 font-bold uppercase">Buses Online</Text>
                    <Metric className="text-gray-900 font-black mt-1 text-2xl">{activeBusesCount}</Metric>
                  </Card>
                  <Card decoration="top" decorationColor="gray" className="shadow-sm bg-white">
                    <Text className="text-xs text-gray-500 font-bold uppercase">Buses Scheduled/Offline</Text>
                    <Metric className="text-gray-900 font-black mt-1 text-2xl">{offlineBusesCount}</Metric>
                  </Card>
                  <Card decoration="top" decorationColor="blue" className="shadow-sm bg-white">
                    <Text className="text-xs text-gray-500 font-bold uppercase">Corridors Monitored</Text>
                    <Metric className="text-gray-900 font-black mt-1 text-2xl">3 Routes</Metric>
                  </Card>
                </Grid>
              </div>
            </TabPanel>

            {/* Tab 2: Simulator Bots */}
            <TabPanel>
              <Card className="bg-white shadow-sm border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Multi-Bus Edge Simulator</h3>
                    <p className="text-xs text-gray-500">Control synthetic GPS, dead-zones, detours, and BLE beacons.</p>
                  </div>
                </div>
                <SimulatorPanel />
              </Card>
            </TabPanel>

            {/* Tab 3: Driver Leaderboard */}
            <TabPanel>
              <Card className="bg-white shadow-sm border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Monthly Driver Punctuality & Score</h3>
                <div className="divide-y divide-gray-100">
                  {adminDrivers.map((d) => (
                    <div key={d.rank} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs">
                          {d.rank === 1 ? '🥇' : d.rank === 2 ? '🥈' : `#${d.rank}`}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{d.name}</div>
                          <div className="text-xs text-gray-500">Route: {d.busId}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-emerald-600">{d.onTimePercent}% On-Time</div>
                        <div className="text-xs text-gray-400">{d.score} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabPanel>

            {/* Tab 3: GTFS-RT Feeds */}
            <TabPanel>
              <Card className="bg-white shadow-sm border-gray-200 flex flex-col gap-4">
                <h3 className="font-bold text-gray-900 text-sm">Open GTFS-Realtime v2.0 Endpoints</h3>
                <p className="text-xs text-gray-500">
                  Standardized feeds consumed by Google Maps, OpenTripPlanner, and municipal command centers.
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                    <span>GET /api/gtfs-rt/vehicle-positions</span>
                    <a href="/api/gtfs-rt/vehicle-positions" target="_blank" className="text-blue-600 font-bold">Open JSON</a>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                    <span>GET /api/gtfs-rt/trip-updates</span>
                    <a href="/api/gtfs-rt/trip-updates" target="_blank" className="text-blue-600 font-bold">Open JSON</a>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                    <span>GET /api/gtfs-rt/alerts</span>
                    <a href="/api/gtfs-rt/alerts" target="_blank" className="text-blue-600 font-bold">Open JSON</a>
                  </div>
                </div>
              </Card>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </main>
    </div>
  );
}
