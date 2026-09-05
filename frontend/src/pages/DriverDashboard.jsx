import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Stop, Warning, Trophy, ArrowLeft, Broadcast, Compass, WifiSlash, Lightning } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useBusStore } from '@/store/useBusStore';
import { DEFAULT_POLYLINE } from '@/data/transitData';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { activeBus, fetchBuses, initSocket } = useBusStore();
  const [busId, setBusId] = useState('M1');
  const [tripActive, setTripActive] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [polyIndex, setPolyIndex] = useState(0);
  const [speed, setSpeed] = useState(25);
  const [deadZoneActive, setDeadZoneActive] = useState(false);
  const [bufferedPoints, setBufferedPoints] = useState([]);

  useEffect(() => {
    initSocket();
    fetchBuses();
  }, [initSocket, fetchBuses]);

  const handleStartTrip = async () => {
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: 'M1',
          driverId: 'D1',
          routeId: 'M1',
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
        body: JSON.stringify({ busId: 'M1' })
      });
      setTripActive(false);
      toast.success('Trip completed.');
      fetchBuses();
    } catch (e) {
      setTripActive(false);
    }
  };

  const handleSendStepLocation = async () => {
    const nextIdx = (polyIndex + 1) % DEFAULT_POLYLINE.length;
    setPolyIndex(nextIdx);
    const pt = DEFAULT_POLYLINE[nextIdx];

    const payload = {
      busId: 'M1',
      lat: pt.lat,
      lng: pt.lng,
      speed: speed + Math.floor(Math.random() * 4 - 2),
      heading: 220,
      ble_count: 24,
      timestamp: new Date().toISOString()
    };

    if (deadZoneActive) {
      setBufferedPoints((prev) => [...prev, payload]);
      toast.info(`Offline buffer: ${bufferedPoints.length + 1} pings queued in RAM`);
      return;
    }

    try {
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`Point ${nextIdx + 1}/20 sent (${payload.speed} km/h)`);
        fetchBuses();
      }
    } catch (e) {}
  };

  const handleFlushBatch = async () => {
    if (bufferedPoints.length === 0) return;
    try {
      const res = await fetch('/api/location/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId: 'M1', updates: bufferedPoints })
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

  const handleInjectDetour = async () => {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: 'M1',
          lat: 30.8350,
          lng: 75.1320,
          speed: 38,
          heading: 90
        })
      });
      toast.warning('⚠️ 450m Detour sent! Off-route anomaly triggered.');
      fetchBuses();
    } catch (e) {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans max-w-md mx-auto sm:border-x sm:border-gray-200">
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
            BUS M1
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${activeBus.status === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Route Select & Start/Stop */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Select Route</label>
              <Select disabled={tripActive} defaultValue="m1">
                <SelectTrigger className="w-full h-10 text-sm bg-white">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m1">M1: Moga ⇄ Dagru</SelectItem>
                  <SelectItem value="m2">M2: Moga ⇄ Kot Ise Khan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStartTrip}
                className="flex-1 h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play weight="fill" size={16} />
                START TRIP
              </Button>
              <Button
                onClick={handleEndTrip}
                className="flex-1 h-11 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Stop weight="fill" size={16} />
                END TRIP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Telemetry Stepper & Speed Controls */}
        <Card className="shadow-sm border-gray-200 bg-white">
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
              📍 Send Next GPS Point ({DEFAULT_POLYLINE[polyIndex].lat.toFixed(4)}, {DEFAULT_POLYLINE[polyIndex].lng.toFixed(4)})
            </Button>

            <div className="flex justify-between items-center text-xs text-gray-600 pt-1">
              <span>Simulated Speed: <b>{speed} km/h</b></span>
              <input
                type="range"
                min="15"
                max="50"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-28 accent-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dead-Zone Store-and-Forward Buffer */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <WifiSlash size={16} className="text-amber-600" /> Dead-Zone Store & Forward
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${deadZoneActive ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                {deadZoneActive ? 'BUFFERING OFFLINE' : 'CELLULAR LIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setDeadZoneActive((d) => !d)}
                variant="outline"
                className="h-10 text-xs font-bold border-gray-300"
              >
                {deadZoneActive ? '📶 End Dead Zone' : '🚫 Cut Cell Signal'}
              </Button>
              <Button
                onClick={handleFlushBatch}
                disabled={bufferedPoints.length === 0}
                className="h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1"
              >
                <Lightning size={16} />
                Flush ({bufferedPoints.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Route Detour Anomaly */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-800">🧠 AI Trajectory Detour Test</span>
            <Button
              onClick={handleInjectDetour}
              variant="outline"
              className="h-10 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              ⚠️ Inject 450m Route Detour
            </Button>
          </CardContent>
        </Card>

        {/* Gamification Score Card */}
        <Card className="shadow-sm border-amber-100 bg-amber-50/50">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="bg-amber-100 p-2.5 rounded-full text-amber-600">
              <Trophy size={28} weight="fill" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">🏆 Your Score: 92 pts</h2>
              <p className="text-xs text-gray-600">Rank: #2 of 14 drivers in Moga</p>
            </div>
            <Button
              variant="outline"
              className="mt-1 text-xs border-amber-200 hover:bg-amber-100"
              onClick={() => navigate('/driver/leaderboard')}
            >
              View Leaderboard
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="p-4 bg-white border-t border-gray-200">
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
