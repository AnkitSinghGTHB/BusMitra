import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusStore } from '@/store/useBusStore';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, ChatCircleText, PhoneCall, Sparkle, NavigationArrow } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/shared/LanguageToggle';
import ETABox from '@/components/shared/ETABox';
import StatusBadge from '@/components/shared/StatusBadge';
import CheckinButton from '@/components/shared/CheckinButton';
import FollowButton from '@/components/shared/FollowButton';
import SMSModal from '@/components/shared/SMSModal';
import IVRModal from '@/components/shared/IVRModal';
import FallbackBanner from '@/components/shared/FallbackBanner';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Helper component to auto-pan the Leaflet map when bus moves
function MapFollower({ center, active }) {
  const map = useMap();
  useEffect(() => {
    if (active && center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, active, map]);
  return null;
}

// Helper component to recenter map when corridor changes
function MapRouteRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 12, { animate: true });
    }
  }, [center, map]);
  return null;
}

const stopIcon = (order, isSelected) =>
  L.divIcon({
    className: 'custom-stop-pin',
    html: `<div style="background-color: ${isSelected ? '#1a56db' : '#1e293b'}; color: white; border: 2px solid ${isSelected ? '#60a5fa' : '#475569'}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">${order}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

const informalIcon = (name) =>
  L.divIcon({
    className: 'custom-informal-pin',
    html: `<div style="background-color: #581c87; color: #e9d5ff; border: 1px solid #c084fc; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">✨ ${name}</div>`,
    iconAnchor: [30, 10]
  });

const getBusIcon = (status, heading) => {
  const color =
    status === 'live'
      ? '#059669'
      : status === 'crowd_restored'
      ? '#d97706'
      : status === 'off_route'
      ? '#dc2626'
      : '#64748b';
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `<div style="transform: rotate(${heading || 0}deg); background: ${color}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
    </div>`,
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 6px rgba(0,0,0,0.2);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

export default function LiveMap() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    routes,
    loadRoute,
    activeBus,
    etaData,
    freshnessSec,
    stops,
    polyline,
    informalStops,
    showInformalStops,
    toggleInformalStops,
    selectedStopId,
    setSelectedStopId,
    selectedLanguage,
    setLanguage,
    initSocket,
    performCheckin,
    checkinCount,
    userLocation,
    setUserLocation
  } = useBusStore();

  const [following, setFollowing] = useState(true);
  const [smsOpen, setSmsOpen] = useState(false);
  const [ivrOpen, setIvrOpen] = useState(false);

  useEffect(() => {
    initSocket();
    if (routeId) {
      loadRoute(routeId);
    }
    
    // Watch user location for blue dot
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.log('Geolocation error:', err), { enableHighAccuracy: true });
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [routeId, initSocket, loadRoute, setUserLocation]);

  const currentRoute = routes.find((r) => r.code === routeId || r.id === routeId) || {
    code: routeId || 'M1',
    name: 'Transit Corridor',
    color: '#1a56db'
  };

  const midPoint = polyline.length > 0 ? polyline[Math.floor(polyline.length / 2)] : null;
  const defaultCenter = midPoint ? [midPoint.lat, midPoint.lng] : [30.8163, 75.1720];
  const busCenter = activeBus && activeBus.lat && (routeId === 'M1' || routeId === 'r1')
    ? [activeBus.lat, activeBus.lng]
    : defaultCenter;

  const polylinePositions = polyline.map((pt) => [pt.lat, pt.lng]);
  const selectedStop = stops.find((s) => s.id === selectedStopId) || stops[1] || stops[0];

  const handleCheckin = async () => {
    const res = await performCheckin();
    if (res.success) {
      toast.success(t('im_on_this_bus') + ' — Consensus verified!');
    } else {
      toast.error(res.error || 'Check-in already recorded');
    }
  };

  const handleInjectDetour = async () => {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: routeId || 'M1',
          lat: (busCenter[0] || 30.835) + 0.005,
          lng: (busCenter[1] || 75.132) + 0.005,
          speed: 38,
          heading: 90
        })
      });
      toast.warning('⚠️ 450m Detour sent! Isolation Forest anomaly triggered.');
    } catch (e) {}
  };

  const handleSendInstantPing = async () => {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: routeId || 'M1',
          lat: busCenter[0] || 30.8163,
          lng: busCenter[1] || 75.1720,
          speed: 22,
          heading: 220
        })
      });
      toast.success('Live GPS ping sent — Restored to Live status!');
    } catch (e) {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans max-w-md mx-auto sm:border-x sm:border-gray-200 pb-40">
      {/* Top Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm z-50 sticky top-0">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Go back">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-black text-gray-900 leading-tight">{currentRoute.code}</h1>
            {currentRoute.state && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {currentRoute.state}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-500 leading-tight">{currentRoute.name}</span>
        </div>
        <LanguageToggle currentLang={selectedLanguage} onChange={setLanguage} />
      </header>

      {/* Graceful Fallback Banner */}
      <FallbackBanner
        visible={activeBus.status === 'scheduled' || activeBus.status === 'crowd_restored' || activeBus.status === 'off_route'}
        mode={activeBus.status}
      />

      <main className="flex flex-col flex-1">
        {/* Status & Real-time ETA */}
        <section className="px-4 py-3 flex flex-col gap-2.5 bg-white z-10 shadow-sm relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">{t('current_status')}</h2>
            <div className="flex items-center gap-2">
              {activeBus.occupancy_tier === 'crowded' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">👥 Crowded</span>}
              {activeBus.occupancy_tier === 'seated' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🪑 Seated</span>}
              {activeBus.occupancy_tier === 'empty' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🪑 Empty</span>}
              <StatusBadge status={activeBus.status} />
            </div>
          </div>
          <ETABox
            min={etaData.min || 8}
            max={etaData.max || 13}
            confidence={etaData.confidence || 94}
            source="AI-Powered"
            lastUpdateSeconds={freshnessSec}
          />
        </section>

        {/* Live Leaflet Map Container */}
        <section className="relative w-full h-[380px] flex-shrink-0 z-0 bg-gray-200">
          {/* Floating Actions (Follow & AI Informal Stops) */}
          <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
            <button
              onClick={toggleInformalStops}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-md border transition-all ${
                showInformalStops ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30' : 'bg-white text-gray-600 border-gray-300'
              }`}
              title="Toggle Popular Boarding Points"
            >
              ✨
            </button>
            <FollowButton active={following} onToggle={() => setFollowing(!following)} />
          </div>

          <MapContainer
            center={busCenter}
            zoom={13}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapFollower center={busCenter} active={following} />
            <MapRouteRecenter center={defaultCenter} />

            {/* User Blue Dot Marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={1000}>
                <Popup>
                  <div className="text-xs font-bold">You are here</div>
                </Popup>
              </Marker>
            )}

            {/* Route Polyline with outer glow */}
            <Polyline positions={polylinePositions} color="#60a5fa" weight={10} opacity={0.3} />
            <Polyline positions={polylinePositions} color={currentRoute.color || "#1a56db"} weight={5} opacity={0.9} />

            {/* Formal Stops Pins */}
            {stops.map((s) => (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={stopIcon(s.order, selectedStopId === s.id)}
                eventHandlers={{
                  click: () => setSelectedStopId(s.id)
                }}
              >
                <Popup>
                  <div className="text-xs font-sans">
                    <b>#{s.order} {s.name}</b>
                    <div className="text-blue-600 font-bold mt-1">
                      {selectedStopId === s.id && etaData ? `Arriving in ${etaData.min}-${etaData.max} mins` : 'Click to view ETA'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* AI Informal Stops Pins (DBSCAN) */}
            {showInformalStops &&
              informalStops.map((inf) => (
                <Marker key={inf.stop_id} position={[inf.lat, inf.lng]} icon={informalIcon(inf.name)}>
                  <Popup>
                    <div className="text-xs font-sans">
                      <b>✨ {inf.name}</b>
                      <div className="text-purple-600 font-bold text-[10px]">Popular Boarding Point</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Real-time Moving Bus Marker */}
            <Marker position={busCenter} icon={getBusIcon(activeBus.status, activeBus.heading)}>
              <Popup>
                <div className="text-xs font-sans">
                  <b>Bus M1 • {activeBus.status?.toUpperCase()}</b>
                  <div>Speed: {activeBus.speed || 0} km/h</div>
                  <div>Occupancy: {activeBus.occupancy_tier || 'seated'}</div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </section>

        {/* Selected Stop & Upcoming Stops List */}
        <section className="px-4 py-4 z-10">
          <Card className="shadow-md bg-white border-none rounded-xl overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm">{t('upcoming_stops')}</h3>
                <span className="text-[10px] text-gray-400 font-medium">Tap any stop to select</span>
              </div>

              <div className="flex flex-col gap-2 relative">
                {stops.map((s) => {
                  const isSelected = selectedStopId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStopId(s.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {s.order}
                        </div>
                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                          {s.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500">
                        {isSelected && etaData ? `${etaData.min}-${etaData.max} min` : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Demo Controls removed from User View */}
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-3.5 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between gap-3">
        <CheckinButton busId="M1" onCheckin={handleCheckin} pendingCount={checkinCount} />

        <div className="flex flex-1 gap-2 h-12">
          <Button
            onClick={() => setSmsOpen(true)}
            variant="secondary"
            className="flex-1 rounded-xl flex items-center justify-center gap-2 h-full font-bold text-xs shadow-sm bg-gray-100 hover:bg-gray-200"
          >
            <ChatCircleText size={18} weight="bold" className="text-emerald-600" />
            {t('sms_alert')}
          </Button>
          <Button
            onClick={() => setIvrOpen(true)}
            variant="secondary"
            className="w-12 rounded-xl flex items-center justify-center h-full px-0 shadow-sm bg-gray-100 hover:bg-gray-200"
            aria-label="Listen to voice ETA"
          >
            <PhoneCall size={18} weight="bold" className="text-blue-600" />
          </Button>
        </div>
      </div>

      <SMSModal open={smsOpen} onClose={() => setSmsOpen(false)} eta={etaData} stopName={selectedStop.name} />
      <IVRModal open={ivrOpen} onClose={() => setIvrOpen(false)} eta={etaData} language={selectedLanguage} />
    </div>
  );
}
