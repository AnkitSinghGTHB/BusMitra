import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Static seed route fallback
const DEFAULT_POLYLINE = [
  { "lat": 30.8163, "lng": 75.1720 },
  { "lat": 30.8165, "lng": 75.1710 },
  { "lat": 30.8170, "lng": 75.1695 },
  { "lat": 30.8175, "lng": 75.1685 },
  { "lat": 30.8180, "lng": 75.1670 },
  { "lat": 30.8185, "lng": 75.1650 },
  { "lat": 30.8190, "lng": 75.1630 },
  { "lat": 30.8195, "lng": 75.1600 },
  { "lat": 30.8205, "lng": 75.1570 },
  { "lat": 30.8215, "lng": 75.1530 },
  { "lat": 30.8225, "lng": 75.1490 },
  { "lat": 30.8240, "lng": 75.1440 },
  { "lat": 30.8255, "lng": 75.1390 },
  { "lat": 30.8270, "lng": 75.1340 },
  { "lat": 30.8290, "lng": 75.1280 },
  { "lat": 30.8310, "lng": 75.1220 },
  { "lat": 30.8325, "lng": 75.1180 },
  { "lat": 30.8335, "lng": 75.1165 },
  { "lat": 30.8345, "lng": 75.1155 },
  { "lat": 30.8350, "lng": 75.1150 }
];

const DEFAULT_STOPS = [
  { "id": "S1", "name": "Moga Bus Stand", "lat": 30.8163, "lng": 75.1720, "order": 1 },
  { "id": "S2", "name": "Bhagwan Chowk", "lat": 30.8175, "lng": 75.1685, "order": 2 },
  { "id": "S3", "name": "Railway Station", "lat": 30.8190, "lng": 75.1630, "order": 3 },
  { "id": "S4", "name": "Civil Hospital", "lat": 30.8215, "lng": 75.1530, "order": 4 },
  { "id": "S5", "name": "Guru Nanak Chowk", "lat": 75.1440 ? 30.8240 : 30.8240, "lng": 75.1440, "order": 5 },
  { "id": "S6", "name": "Kot Ise Khan Road", "lat": 30.8270, "lng": 75.1340, "order": 6 },
  { "id": "S7", "name": "Dairy Complex", "lat": 30.8310, "lng": 75.1220, "order": 7 },
  { "id": "S8", "name": "Dagru Village", "lat": 30.8350, "lng": 75.1150, "order": 8 }
];

const DELAY_POINTS = [
  { id: 'd1', name: "Railway Crossing", lat: 30.8190, lng: 75.1630, delay: "+7 min" },
  { id: 'd2', name: "Bhagwan Chowk Chai Break", lat: 30.8175, lng: 75.1685, delay: "+5 min" }
];

const I18N = {
  en: {
    appName: "BusMitra",
    routeTag: "M1 • Moga ⇄ Dagru",
    live: "Live GPS",
    scheduled: "Scheduled",
    crowd: "Crowd-Restored",
    etaRange: "Arriving in",
    min: "min",
    confidence: "Confidence",
    freshness: "Updated",
    secAgo: "s ago",
    followBus: "Follow Bus",
    stops: "Stops",
    checkinBtn: "I'm on this bus",
    smsBtn: "SMS Alert",
    startTrip: "Start Trip",
    sendGps: "Next GPS Point",
    driverSim: "Driver Simulator",
    testDegrade: "Test 60s Drop",
    restoreGps: "Restore GPS",
    speed: "Speed",
    stopSelector: "Tap a stop to view ETA:",
    tabMap: "Commuter",
    tabDriver: "Driver & Test",
    tabDb: "Database",
    tabLogs: "Logs",
    dbOffline: "Database container offline",
    syncDb: "Sync to DB"
  },
  hi: {
    appName: "बस मित्र",
    routeTag: "M1 • मोगा ⇄ डगरू",
    live: "लाइव जीपीएस",
    scheduled: "समय सारणी",
    crowd: "क्राउड-सत्यापित",
    etaRange: "पहुंचने का समय",
    min: "मिनट",
    confidence: "सटीकता",
    freshness: "अपडेट",
    secAgo: "सेकंड पहले",
    followBus: "बस ट्रैक करें",
    stops: "स्टॉप",
    checkinBtn: "मैं इस बस में हूँ",
    smsBtn: "एसएमएस अलर्ट",
    startTrip: "ट्रिप शुरू करें",
    sendGps: "अगला जीपीएस पॉइंट",
    driverSim: "ड्राइवर सिम्युलेटर",
    testDegrade: "६० से. सिग्नल ड्रॉप टेस्ट",
    restoreGps: "जीपीएस रीस्टोर",
    speed: "गति",
    stopSelector: "ईटीए देखने के लिए स्टॉप चुनें:",
    tabMap: "यात्री मैप",
    tabDriver: "ड्राइवर टेस्ट",
    tabDb: "डेटाबेस",
    tabLogs: "लॉग्स",
    dbOffline: "डेटाबेस कंटेनर बंद है",
    syncDb: "डेटाबेस में सिंक करें"
  },
  pa: {
    appName: "ਬੱਸ ਮਿੱਤਰ",
    routeTag: "M1 • ਮੋਗਾ ⇄ ਡਗਰੂ",
    live: "ਲਾਈਵ ਜੀਪੀਐਸ",
    scheduled: "ਸਮਾਂ-ਸਾਰਣੀ",
    crowd: "ਮੁਸਾਫ਼ਿਰ ਸਹਿਮਤੀ",
    etaRange: "ਪਹੁੰਚਣ ਦਾ ਸਮਾਂ",
    min: "ਮਿੰਟ",
    confidence: "ਭਰੋਸਾ",
    freshness: "ਅੱਪਡੇਟ",
    secAgo: "ਸਕਿੰਟ ਪਹਿਲਾਂ",
    followBus: "ਬੱਸ ਫਾਲੋ ਕਰੋ",
    stops: "ਸਟਾਪ",
    checkinBtn: "ਮੈਂ ਇਸ ਬੱਸ 'ਚ ਹਾਂ",
    smsBtn: "ਐਸਐਮਐਸ ਅਲਰਟ",
    startTrip: "ਟ੍ਰਿਪ ਸ਼ੁਰੂ ਕਰੋ",
    sendGps: "ਅਗਲਾ ਜੀਪੀਐਸ",
    driverSim: "ਡਰਾਈਵਰ ਟੈਸਟ",
    testDegrade: "੬੦ ਸਕਿੰਟ ਟੈਸਟ",
    restoreGps: "ਜੀਪੀਐਸ ਮੁੜ ਚਾਲੂ",
    speed: "ਰਫ਼ਤਾਰ",
    stopSelector: "ਈਟੀਏ ਦੇਖਣ ਲਈ ਸਟਾਪ ਚੁਣੋ:",
    tabMap: "ਮੁਸਾਫ਼ਿਰ ਮੈਪ",
    tabDriver: "ਡਰਾਈਵਰ ਟੈਸਟ",
    tabDb: "ਡਾਟਾਬੇਸ",
    tabLogs: "ਲੌਗਸ",
    dbOffline: "ਡਾਟਾਬੇਸ ਬੰਦ ਹੈ",
    syncDb: "ਡਾਟਾਬੇਸ ਸਿੰਕ"
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'driver', 'db', 'logs'
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [followBus, setFollowBus] = useState(true);

  // Connectivity
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', activeBuses: 0 });
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [dbStatus, setDbStatus] = useState({ connected: false });
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Real-time bus & ETA
  const [activeBus, setActiveBus] = useState({
    busId: 'M1',
    routeId: 'M1',
    lat: 30.8163,
    lng: 75.1720,
    speed: 22,
    heading: 220,
    status: 'live'
  });
  const [selectedStopId, setSelectedStopId] = useState('S8');
  const [etaData, setEtaData] = useState({ min: 14, max: 24, confidence: 85, stopName: 'Dagru Village' });
  const [freshnessSec, setFreshnessSec] = useState(0);
  const [events, setEvents] = useState([]);

  // Testing & Simulator State
  const [polyIndex, setPolyIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(24);
  const [checkinAlert, setCheckinAlert] = useState('');
  const [checkinCount, setCheckinCount] = useState(0);

  // SMS Nokia Modal
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsInput, setSmsInput] = useState('BUS M1');
  const [smsReply, setSmsReply] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);

  // Database Explorer
  const [dbTable, setDbTable] = useState('routes');
  const [dbData, setDbData] = useState({ columns: [], rows: [], rowCount: 0 });
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSyncMsg, setDbSyncMsg] = useState('');

  // Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const followBusRef = useRef(followBus);
  followBusRef.current = followBus;

  const t = I18N[lang] || I18N.en;

  const logEvent = (source, message, data = null) => {
    setEvents(prev => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source,
        message,
        data: data ? JSON.stringify(data).slice(0, 80) : null
      },
      ...prev.slice(0, 39)
    ]);
  };

  // 1. Socket.io setup
  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setSocketStatus('connected');
      logEvent('Socket.io', `Connected (${socket.id?.slice(0, 6)})`);
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
      logEvent('Socket.io', 'Disconnected');
    });

    socket.on('bus_update', (bus) => {
      setActiveBus(bus);
      setFreshnessSec(0);
      logEvent('bus_update', `Bus ${bus.busId} • ${bus.status} • ${bus.speed || 0} km/h`);
    });

    socket.on('status_change', (change) => {
      setActiveBus(prev => ({ ...prev, status: change.status }));
      logEvent('status_change', `Status: ${change.status} (${change.source})`);
    });

    return () => socket.disconnect();
  }, []);

  // 2. Freshness timer
  useEffect(() => {
    const interval = setInterval(() => setFreshnessSec(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Periodic Pollers
  const fetchHealth = async () => {
    try {
      const res = await fetch('/health');
      if (res.ok) setBackendHealth(await res.json());
    } catch (e) {
      setBackendHealth({ status: 'offline', activeBuses: 0 });
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await fetch('/api/buses');
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          const m1 = list.find(b => b.busId === 'M1') || list[0];
          setActiveBus(m1);
        }
      }
    } catch (e) {}
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) setDbStatus(await res.json());
    } catch (e) {
      setDbStatus({ connected: false });
    }
  };

  const fetchEta = async (stopId) => {
    try {
      const res = await fetch(`/api/eta/M1?stopId=${stopId || selectedStopId}`);
      if (res.ok) {
        const data = await res.json();
        setEtaData(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHealth();
    fetchBuses();
    fetchDbStatus();
    fetchEta(selectedStopId);

    const interval = setInterval(() => {
      fetchHealth();
      fetchBuses();
      fetchDbStatus();
      fetchEta(selectedStopId);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedStopId]);

  // 4. Initialize Mobile Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.825, 75.148],
      zoom: 13,
      zoomControl: false, // Clean mobile full-screen view
      attributionControl: false
    });

<<<<<<< HEAD
    // Official OpenStreetMap tiles (100% free, zero API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
=======
    // Dark sleek mobile tiles (CartoDB Voyager or Dark)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
>>>>>>> 2d0efafd95a3d2863dad616c14ad9506a1250bea
    }).addTo(map);

    // Route M1 Polyline
    const latLngs = DEFAULT_POLYLINE.map(pt => [pt.lat, pt.lng]);
    L.polyline(latLngs, {
      color: '#2563eb',
      weight: 6,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(map);

    // Outer glow for route line
    L.polyline(latLngs, {
      color: '#60a5fa',
      weight: 12,
      opacity: 0.25,
      smoothFactor: 1
    }).addTo(map);

    // Numbered Stops
    DEFAULT_STOPS.forEach(stop => {
      const icon = L.divIcon({
        className: 'custom-stop-pin',
        html: `<div class="stop-pill-marker ${selectedStopId === stop.id ? 'active' : ''}">${stop.order}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
      marker.on('click', () => {
        setSelectedStopId(stop.id);
        fetchEta(stop.id);
        setSheetExpanded(true);
      });
    });

    // Known Delays
    DELAY_POINTS.forEach(d => {
      const icon = L.divIcon({
        className: 'custom-delay-pill',
        html: `<div class="bg-amber-500/90 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-amber-300 shadow flex items-center gap-0.5">⚠️ ${d.delay}</div>`,
        iconAnchor: [20, 10]
      });
      L.marker([d.lat, d.lng], { icon }).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 5. Update Animated Bus Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !activeBus) return;
    const map = mapInstanceRef.current;
    const lat = activeBus.lat || 30.8163;
    const lng = activeBus.lng || 75.1720;
    const status = activeBus.status || 'live';
    const heading = activeBus.heading || 0;

    const bgGradient = status === 'live'
      ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/40'
      : status === 'crowd_restored'
        ? 'from-amber-500 to-amber-600 shadow-amber-500/40'
        : 'from-slate-500 to-slate-600 shadow-slate-500/40';

    const pulseRing = status === 'live'
      ? '<div class="bus-pulse-ring bg-emerald-500/40"></div>'
      : '';

    const busHtml = `
      <div class="bus-marker-wrapper">
        ${pulseRing}
        <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${bgGradient} text-white flex items-center justify-center shadow-xl border-2 border-white transform transition-transform duration-300" style="transform: rotate(${heading}deg);">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'bus-marker-clean',
      html: busHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    } else {
      busMarkerRef.current.setLatLng([lat, lng]);
      busMarkerRef.current.setIcon(icon);
    }

    if (followBusRef.current) {
      map.panTo([lat, lng], { animate: true, duration: 0.8 });
    }
  }, [activeBus]);

  // Actions
  const handleStartTrip = async () => {
    const pt = DEFAULT_POLYLINE[0];
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId: 'M1', driverId: 'D1', routeId: 'M1', lat: pt.lat, lng: pt.lng })
      });
      const d = await res.json();
      if (res.ok) {
        logEvent('API /api/start', 'Trip started', d);
        fetchBuses();
      }
    } catch (e) {}
  };

  const handleSendNextLocation = async () => {
    const nextIdx = (polyIndex + 1) % DEFAULT_POLYLINE.length;
    const pt = DEFAULT_POLYLINE[nextIdx];
    setPolyIndex(nextIdx);

    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: 'M1',
          lat: pt.lat,
          lng: pt.lng,
          speed: simSpeed + Math.floor(Math.random() * 4 - 2),
          heading: 230
        })
      });
      fetchEta(selectedStopId);
    } catch (e) {}
  };

  const handlePassengerCheckin = async () => {
    const busLat = activeBus ? activeBus.lat : 30.8175;
    const busLng = activeBus ? activeBus.lng : 75.1685;
    const userId = 'usr_' + Math.floor(Math.random() * 9000 + 1000);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: 'M1',
          userId,
          lat: busLat + (Math.random() - 0.5) * 0.0008,
          lng: busLng + (Math.random() - 0.5) * 0.0008
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinCount(data.consensusCount || 1);
        setCheckinAlert(data.consensusReached ? '🎉 Bus crowd-restored via consensus!' : `Check-in accepted (${data.consensusCount || 1}/3 passengers)`);
        setTimeout(() => setCheckinAlert(''), 4000);
        logEvent('POST /api/checkin', `Checkin from ${userId}`, data);
        fetchBuses();
      }
    } catch (e) {}
  };

  const handleSendSms = async () => {
    if (!smsInput) return;
    setSmsLoading(true);
    setSmsReply('');
    try {
      const res = await fetch('/api/sms-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: '+919876543210', body: smsInput })
      });
      const data = await res.json();
      setSmsReply(data.reply || 'No response');
      logEvent('SMS Webhook', `Sent "${smsInput}"`, data);
    } catch (e) {
      setSmsReply('SMS network error');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleLoadDbTable = async (tName) => {
    setDbTable(tName);
    setDbLoading(true);
    try {
      const res = await fetch(`/api/db/table/${tName}?limit=30`);
      if (res.ok) setDbData(await res.json());
    } catch (e) {
      setDbData({ columns: [], rows: [], rowCount: 0 });
    } finally {
      setDbLoading(false);
    }
  };

  const handleSyncToDb = async () => {
    setDbSyncMsg('Syncing...');
    try {
      const res = await fetch('/api/db/sync', { method: 'POST' });
      const data = await res.json();
      setDbSyncMsg(data.message);
      fetchDbStatus();
      setTimeout(() => setDbSyncMsg(''), 3000);
    } catch (e) {
      setDbSyncMsg('Sync failed.');
    }
  };

  const busStatus = activeBus?.status || 'live';
  const statusColor = busStatus === 'live'
    ? 'bg-emerald-500 text-white'
    : busStatus === 'crowd_restored'
      ? 'bg-amber-500 text-white'
      : 'bg-slate-600 text-slate-200';

  const statusText = busStatus === 'live' ? t.live : busStatus === 'crowd_restored' ? t.crowd : t.scheduled;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">

      {/* ========================================================= */}
      {/* 1. TOP MOBILE APP BAR (Clean, Floating & Glassmorphic)    */}
      {/* ========================================================= */}
      <header className="z-30 pt-safe px-3 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-blue to-blue-500 flex items-center justify-center text-white shadow-md shadow-brand-blue/30 border border-blue-400/40">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-white">{t.appName}</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-[10px] font-semibold text-blue-400">{t.routeTag}</p>
          </div>
        </div>

        {/* Right Action Tools: Language + System Status */}
        <div className="flex items-center gap-1.5">
          {/* Status pill button */}
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-semibold text-slate-300 active:scale-95 transition-transform cursor-pointer"
            title="System Connection Diagnostics"
          >
            <span className={`w-2 h-2 rounded-full ${backendHealth.status === 'ok' ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            <span className="hidden xs:inline">System</span>
          </button>

          {/* Language Switcher */}
          <div className="flex bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            {['en', 'hi', 'pa'].map(c => (
              <button
                key={c}
                onClick={() => setLang(c)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${lang === c ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                {c === 'en' ? 'EN' : c === 'hi' ? 'हिं' : 'ਪੰ'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. TAB VIEW CONTAINER                                     */}
      {/* ========================================================= */}
      <main className="flex-1 relative overflow-hidden bg-slate-950">

        {/* ------------------------------------------------------- */}
        {/* TAB 1: COMMUTER (FLUID MOBILE MAP + BOTTOM SHEET)       */}
        {/* ------------------------------------------------------- */}
        <div className={`absolute inset-0 ${activeTab === 'map' ? 'block' : 'hidden'}`}>
          {/* Full-bleed Map */}
          <div ref={mapContainerRef} className="w-full h-full z-0"></div>

          {/* Floating Map Action Controls (Follow, Nokia SMS) */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setFollowBus(f => !f)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-xl backdrop-blur-md border transition-all active:scale-90 ${
                followBus
                  ? 'bg-brand-blue text-white border-blue-400 shadow-blue-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700'
              }`}
              title={t.followBus}
            >
              📍
            </button>

            <button
              onClick={() => setSmsModalOpen(true)}
              className="w-10 h-10 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs shadow-xl backdrop-blur-md active:scale-90 transition-all"
              title="Feature Phone SMS"
            >
              📱
            </button>
          </div>

          {/* Check-in Toast Alert */}
          {checkinAlert && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl animate-bounce flex items-center gap-1.5">
              <span>🙋</span>
              <span>{checkinAlert}</span>
            </div>
          )}

          {/* ===================================================== */}
          {/* EXPANDABLE MOBILE BOTTOM SHEET (Uber / Chalo Style)   */}
          {/* ===================================================== */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 rounded-t-3xl z-[1000] mobile-bottom-sheet flex flex-col ${
              sheetExpanded ? 'max-h-[82%]' : 'max-h-56'
            }`}
          >
            {/* Drag / Tap Handle */}
            <div
              onClick={() => setSheetExpanded(s => !s)}
              className="pt-2.5 pb-1 flex flex-col items-center justify-center cursor-pointer select-none active:opacity-75"
            >
              <div className="w-10 h-1 rounded-full bg-slate-600 mb-1"></div>
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <span>{sheetExpanded ? '▼ Swipe down to minimize' : '▲ Swipe up for stops & timetable'}</span>
              </div>
            </div>

            {/* Content Container with Scroll */}
            <div className="px-4 pb-4 overflow-y-auto flex-1">
              
              {/* Hero ETA Card */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 rounded-2xl p-3.5 mb-3 shadow-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {statusText}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400">
                    ⏱️ {t.freshness}: {freshnessSec}{t.secAgo}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.etaRange}
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
                      <span>{etaData ? `${etaData.min}-${etaData.max}` : '10-15'}</span>
                      <span className="text-sm font-bold text-slate-400">{t.min}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Next Major Stop
                    </div>
                    <div className="text-sm font-black text-blue-400 truncate max-w-[140px]">
                      {etaData?.stopName || 'Dagru Village'}
                    </div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-1">
                    <span>{t.confidence} Score</span>
                    <span className={
                      (etaData?.confidence || 0) >= 80 ? 'text-emerald-400' :
                      (etaData?.confidence || 0) >= 50 ? 'text-amber-400' : 'text-slate-400'
                    }>
                      {etaData?.confidence || 85}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        (etaData?.confidence || 0) >= 80 ? 'bg-emerald-500' :
                        (etaData?.confidence || 0) >= 50 ? 'bg-amber-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${etaData?.confidence || 85}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Primary Mobile Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={handlePassengerCheckin}
                  className="py-3 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform"
                >
                  <span className="text-base">🙋</span>
                  <span>{t.checkinBtn}</span>
                </button>

                <button
                  onClick={() => setSmsModalOpen(true)}
                  className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-emerald-500/40 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform"
                >
                  <span className="text-base">📱</span>
                  <span>{t.smsBtn}</span>
                </button>
              </div>

              {/* Expanded Stops Stepper */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t.stops} • Route M1
                </div>

                <div className="space-y-1.5">
                  {DEFAULT_STOPS.map(s => {
                    const isSelected = selectedStopId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedStopId(s.id);
                          fetchEta(s.id);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                          isSelected
                            ? 'bg-blue-900/40 border-blue-500 text-white shadow-md'
                            : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-brand-blue text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {s.order}
                          </span>
                          <span className="text-xs font-bold truncate">{s.name}</span>
                        </div>

                        <div className="text-[11px] font-bold text-blue-400 shrink-0">
                          {isSelected && etaData ? `${etaData.min}-${etaData.max} min` : 'View ETA'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* TAB 2: DRIVER & SIMULATOR TEST SUITE (Mobile Optimized) */}
        {/* ------------------------------------------------------- */}
        <div className={`p-4 h-full overflow-y-auto max-w-lg mx-auto ${activeTab === 'driver' ? 'block' : 'hidden'}`}>
          <div className="mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🎛️</span> {t.driverSim}
            </h2>
            <p className="text-xs text-slate-400">
              Zero hardware: Test driver tracking, fallback degradation, and consensus.
            </p>
          </div>

          <div className="space-y-4">
            {/* Driver GPS Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300">Driver Smartphone GPS</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                  {busStatus.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={handleStartTrip}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-transform"
                >
                  <span>🚀</span> {t.startTrip}
                </button>

                <button
                  onClick={handleSendNextLocation}
                  className="py-3 px-3 rounded-xl bg-brand-blue hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-transform"
                >
                  <span>📍</span> Step ({polyIndex + 1}/20)
                </button>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs flex justify-between items-center mb-3">
                <span className="text-slate-400">{t.speed}:</span>
                <span className="font-bold text-white">{simSpeed} km/h</span>
                <input
                  type="range"
                  min="15"
                  max="45"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-24 accent-brand-blue cursor-pointer"
                />
              </div>

              <div className="text-[10px] font-mono text-slate-500 text-center">
                Coords: {activeBus?.lat?.toFixed(4)}, {activeBus?.lng?.toFixed(4)}
              </div>
            </div>

            {/* Fallback Degradation Test */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="text-xs font-bold text-slate-300 mb-2">
                ⏳ Triple-Fallback Engine Test
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Stop updates for 60 seconds to observe graceful degradation to "Scheduled".
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3 flex justify-between items-center text-xs">
                <div>
                  <div className="text-slate-400 text-[10px]">Freshness</div>
                  <div className="font-black text-amber-400 text-base">{freshnessSec}s / 60s</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">State</div>
                  <div className="font-bold text-slate-200">{busStatus}</div>
                </div>
              </div>

              <button
                onClick={handleSendNextLocation}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
              >
                🔄 {t.restoreGps} (Send Instant Ping)
              </button>
            </div>

            {/* Quick Stop Jump */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="text-xs font-bold text-slate-300 mb-2">
                📍 Jump Bus to Specific Stop
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_STOPS.map(s => (
                  <button
                    key={s.id}
                    onClick={async () => {
                      await fetch('/api/location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ busId: 'M1', lat: s.lat, lng: s.lng, speed: 20, heading: 220 })
                      });
                      fetchEta(selectedStopId);
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-blue-600 hover:text-white border border-slate-700 text-left text-xs font-semibold truncate active:scale-95 transition-all"
                  >
                    #{s.order} {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* TAB 3: DATABASE EXPLORER (Mobile Friendly Cards)        */}
        {/* ------------------------------------------------------- */}
        <div className={`p-4 h-full overflow-y-auto max-w-lg mx-auto ${activeTab === 'db' ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>🗄️</span> Isolated PostgreSQL DB
              </h2>
              <p className="text-[11px] text-slate-400">PostGIS spatial engine at port 5432</p>
            </div>

            <button
              onClick={handleSyncToDb}
              className="px-3 py-1.5 rounded-xl bg-brand-blue hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow"
            >
              {t.syncDb}
            </button>
          </div>

          {dbSyncMsg && (
            <div className="mb-3 p-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center">
              {dbSyncMsg}
            </div>
          )}

          {/* Connection Pill */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md mb-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Status:</span>
              <span className={`font-bold flex items-center gap-1.5 ${dbStatus.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                {dbStatus.connected ? `Connected (${dbStatus.latencyMs || 2}ms)` : 'Offline'}
              </span>
            </div>

            <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              docker compose -f docker-compose.db.yml up -d
            </div>
          </div>

          {/* Table Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {['routes', 'stops', 'buses', 'drivers', 'checkins', 'gtfs_data'].map(table => (
              <button
                key={table}
                onClick={() => handleLoadDbTable(table)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                  dbTable === table
                    ? 'bg-brand-blue text-white border-blue-400 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {table}
              </button>
            ))}
          </div>

          {/* Rows */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md">
            <div className="text-xs font-bold text-slate-300 mb-2">
              Rows in <span className="text-blue-400 font-mono">{dbTable}</span> ({dbData.rowCount})
            </div>

            {dbLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading table...</div>
            ) : dbData.rows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {dbStatus.connected ? 'Table empty.' : 'DB container offline. Run docker-compose.db.yml.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dbData.rows.map((r, i) => (
                  <div key={i} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/70 text-[11px] font-mono">
                    <pre className="text-slate-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(r, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* TAB 4: REAL-TIME EVENT LOGS                             */}
        {/* ------------------------------------------------------- */}
        <div className={`p-4 h-full flex flex-col max-w-lg mx-auto ${activeTab === 'logs' ? 'block' : 'hidden'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>📜</span> {t.tabLogs}
            </h2>
            <button
              onClick={() => setEvents([])}
              className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 overflow-y-auto font-mono text-[11px] space-y-2">
            {events.length === 0 ? (
              <div className="py-12 text-center text-slate-600">No events yet. Listening...</div>
            ) : (
              events.map(e => (
                <div key={e.id} className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <div className="flex justify-between text-slate-500 text-[10px] mb-0.5">
                    <span>{e.source}</span>
                    <span>{e.time}</span>
                  </div>
                  <div className="text-slate-200">{e.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* ========================================================= */}
      {/* 3. THUMB-FRIENDLY BOTTOM NAVIGATION BAR                   */}
      {/* ========================================================= */}
      <nav className="z-30 pb-safe bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shrink-0">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'map' ? 'text-brand-blue font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] tracking-tight">{t.tabMap}</span>
        </button>

        <button
          onClick={() => setActiveTab('driver')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'driver' ? 'text-brand-blue font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">🎛️</span>
          <span className="text-[10px] tracking-tight">{t.tabDriver}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('db');
            handleLoadDbTable(dbTable);
          }}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'db' ? 'text-brand-blue font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">🗄️</span>
          <span className="text-[10px] tracking-tight">{t.tabDb}</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'logs' ? 'text-brand-blue font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">📜</span>
          <span className="text-[10px] tracking-tight">{t.tabLogs}</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* 4. NOKIA 3310 SMS SIMULATOR (MOBILE OPTIMIZED MODAL)      */}
      {/* ========================================================= */}
      {smsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="relative bg-gradient-to-b from-slate-700 to-slate-900 border-4 border-slate-600 rounded-[36px] p-5 shadow-2xl max-w-xs w-full text-slate-900 animate-scale-in">
            {/* Earpiece */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-3"></div>

            <div className="text-center text-slate-300 font-black tracking-widest text-[11px] mb-2.5">
              NOKIA 3310 • SMS
            </div>

            {/* Backlit Green Screen */}
            <div className="bg-[#9ebd38] border-4 border-[#7a9628] rounded-xl p-3 font-mono text-[11px] shadow-inner text-slate-950 space-y-2 min-h-[140px]">
              <div className="flex justify-between border-b border-[#7a9628]/60 pb-1 text-[9px] font-bold">
                <span>📶 AIRTEL 2G</span>
                <span>🔋 100%</span>
              </div>
              <div>
                <span className="font-bold">TO:</span> 77333
              </div>
              <div className="bg-[#8ca82e] p-1 rounded font-bold">
                "{smsInput}"
              </div>

              {smsLoading && (
                <div className="text-[10px] animate-pulse">Sending SMS...</div>
              )}

              {smsReply && (
                <div className="bg-[#94b132] border border-[#7a9628] p-1.5 rounded text-[10px] font-bold text-slate-950 mt-1">
                  📩 REPLY:<br />{smsReply}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 text-white border border-slate-600 text-xs font-mono"
                />
                <button
                  onClick={handleSendSms}
                  disabled={smsLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow active:scale-95"
                >
                  Send
                </button>
              </div>

              {/* Sample Chips */}
              <div className="flex gap-1">
                {['BUS M1', 'BUS M2', 'HELP'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => setSmsInput(chip)}
                    className="flex-1 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-bold hover:bg-slate-700"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSmsModalOpen(false)}
                className="w-full mt-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close Handset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SYSTEM HEALTH MODAL POPUP                              */}
      {/* ========================================================= */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-xs space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">System Diagnostics</span>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400">Backend API (:3000):</span>
                <span className="font-bold text-emerald-400">{backendHealth.status}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400">Socket.io Stream:</span>
                <span className="font-bold text-emerald-400">{socketStatus}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950">
                <span className="text-slate-400">PostgreSQL Container:</span>
                <span className={`font-bold ${dbStatus.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {dbStatus.connected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 pt-1">
              Tap anywhere outside to close.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
