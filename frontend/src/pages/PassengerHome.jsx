import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusStore } from '@/store/useBusStore';
import { Bus, MapPin, NavigationArrow, ArrowsLeftRight, Circle, SteeringWheel, ChartBar, ChatCircleText, Crosshair } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import LanguageToggle from '@/components/shared/LanguageToggle';
import SMSModal from '@/components/shared/SMSModal';
import { useTranslation } from 'react-i18next';
import { geocodeSearch, localStopSearch } from '@/utils/geocoding';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

export default function PassengerHome() {
  const navigate = useNavigate();
  const {
    selectedLanguage,
    setLanguage,
    initSocket,
    planTrip,
    tripPlan,
    userLocation,
    setUserLocation
  } = useBusStore();
  
  const { t } = useTranslation();

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const fromDebounce = useRef(null);
  const toDebounce = useRef(null);

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const handleLocateMe = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setFromCoords({ lat: latitude, lng: longitude });
          setFromQuery('Current Location');
          setUserLocation({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation failed, using VIT Bhopal fallback:', err);
          // Fallback to VIT Bhopal
          const fallback = { lat: 23.0775, lng: 76.8513 };
          setFromCoords(fallback);
          setFromQuery('VIT Bhopal (Fallback)');
          setUserLocation(fallback);
          setIsLocating(false);
        },
        { timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromQuery(val);
    setFromCoords(null);
    if (fromDebounce.current) clearTimeout(fromDebounce.current);
    if (val.length > 2) {
      fromDebounce.current = setTimeout(async () => {
        const local = localStopSearch(val);
        const results = await geocodeSearch(val);
        // Combine and dedup by coordinates roughly
        setFromSuggestions([...local, ...results]);
      }, 500);
    } else {
      setFromSuggestions([]);
    }
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToQuery(val);
    setToCoords(null);
    if (toDebounce.current) clearTimeout(toDebounce.current);
    if (val.length > 2) {
      toDebounce.current = setTimeout(async () => {
        const local = localStopSearch(val);
        const results = await geocodeSearch(val);
        setToSuggestions([...local, ...results]);
      }, 500);
    } else {
      setToSuggestions([]);
    }
  };

  const selectFrom = (item) => {
    setFromQuery(item.name);
    setFromCoords({ lat: item.lat, lng: item.lng });
    setFromSuggestions([]);
  };

  const selectTo = (item) => {
    setToQuery(item.name);
    setToCoords({ lat: item.lat, lng: item.lng });
    setToSuggestions([]);
  };

  const handleSwap = () => {
    const tempQ = fromQuery;
    const tempC = fromCoords;
    setFromQuery(toQuery);
    setFromCoords(toCoords);
    setToQuery(tempQ);
    setToCoords(tempC);
  };

  const handlePlanTrip = async () => {
    if (!fromCoords || !toCoords) return;
    setIsSearching(true);
    await planTrip(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
    setIsSearching(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans mx-auto max-w-md sm:border-x sm:border-gray-200 relative">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
            <Bus size={22} weight="fill" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight">{t('app_title')}</h1>
            <p className="text-[10px] font-bold text-primary">Smart Trip Planner</p>
          </div>
        </div>
        <LanguageToggle currentLang={selectedLanguage} onChange={setLanguage} />
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5">
        
        {/* Trip Planner Card */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-4 flex flex-col gap-3 relative">
            <div className="flex items-start gap-3 relative">
              <div className="flex flex-col items-center mt-2 gap-1 w-6 shrink-0 z-10">
                <Circle size={14} className="text-blue-500" weight="bold" />
                <div className="w-0.5 h-10 bg-gray-200 rounded-full"></div>
                <MapPin size={16} className="text-rose-500" weight="fill" />
              </div>
              
              <div className="flex-1 flex flex-col gap-3 relative">
                <div className="relative">
                  <Input 
                    placeholder="Choose starting point..."
                    value={fromQuery}
                    onChange={handleFromChange}
                    className="h-11 rounded-lg text-sm bg-gray-50 border-transparent focus:border-primary pr-10"
                  />
                  <button 
                    onClick={handleLocateMe} 
                    disabled={isLocating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                  >
                    <Crosshair size={18} className={isLocating ? "animate-spin" : ""} />
                  </button>
                  {fromSuggestions.length > 0 && (
                    <div className="absolute top-12 left-0 right-0 bg-white border shadow-lg rounded-lg z-30 max-h-48 overflow-y-auto">
                      {fromSuggestions.map((s, i) => (
                        <div key={i} onClick={() => selectFrom(s)} className="p-2.5 text-xs border-b hover:bg-gray-50 cursor-pointer truncate">
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Input 
                    placeholder="Choose destination..."
                    value={toQuery}
                    onChange={handleToChange}
                    className="h-11 rounded-lg text-sm bg-gray-50 border-transparent focus:border-primary"
                  />
                  {toSuggestions.length > 0 && (
                    <div className="absolute top-12 left-0 right-0 bg-white border shadow-lg rounded-lg z-30 max-h-48 overflow-y-auto">
                      {toSuggestions.map((s, i) => (
                        <div key={i} onClick={() => selectTo(s)} className="p-2.5 text-xs border-b hover:bg-gray-50 cursor-pointer truncate">
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <button onClick={handleSwap} className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 shadow-sm z-20">
                <ArrowsLeftRight size={14} weight="bold" />
              </button>
            </div>
            
            <Button 
              onClick={handlePlanTrip} 
              disabled={!fromCoords || !toCoords || isSearching}
              className="w-full h-11 mt-2 font-bold text-sm bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
            >
              {isSearching ? 'Finding Routes...' : 'Search Routes'}
            </Button>

            {/* Demo Presets */}
            <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500 w-full mb-1 font-medium">Demo Routes:</span>
              <button 
                onClick={() => {
                  setFromQuery('Moga Bus Stand');
                  setFromCoords({ lat: 30.814317, lng: 75.173142 });
                  setToQuery('Dagru');
                  setToCoords({ lat: 30.851184, lng: 75.059876 });
                }}
                className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              >
                Moga → Dagru
              </button>
              <button 
                onClick={() => {
                  setFromQuery('Indore AICTSL');
                  setFromCoords({ lat: 22.7196, lng: 75.8577 });
                  setToQuery('Bhopal ISBT');
                  setToCoords({ lat: 23.2599, lng: 77.4126 });
                }}
                className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
              >
                Indore → Bhopal
              </button>
              <button 
                onClick={() => {
                  setFromQuery('Gorakhpur ISBT');
                  setFromCoords({ lat: 26.7606, lng: 83.3732 });
                  setToQuery('Kushinagar');
                  setToCoords({ lat: 26.7397, lng: 83.8906 });
                }}
                className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200"
              >
                Gorakhpur → Kushinagar
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {tripPlan && tripPlan.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-800">Suggested Routes ({tripPlan.length})</h2>
            {tripPlan.map((plan, idx) => (
              <Card 
                key={idx} 
                className="cursor-pointer hover:border-primary/50 transition-all shadow-sm bg-white active:scale-[0.99] border-gray-200"
                onClick={() => navigate(`/map/${plan.routeCode}`)}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {plan.routeCode}
                      </span>
                      <span className="text-gray-900 font-bold text-sm">{plan.routeName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-gray-900">{plan.totalDurationMin} min</div>
                      <div className="text-[10px] text-gray-500">Total Trip</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-1">
                      <NavigationArrow size={14} className="text-gray-400" />
                      {plan.walkToStopMin}m
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <Bus size={14} className="text-emerald-500" weight="fill" />
                      <span className="text-emerald-700">{plan.busRideMin}m</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <NavigationArrow size={14} className="text-gray-400" />
                      {plan.walkToDestMin}m
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-gray-100 pt-2">
                    <div>
                      <div className="text-[10px] text-gray-500">Boarding at {plan.boardingStopName}</div>
                      <div className="text-xs font-bold text-emerald-700">Bus arrives in {plan.busWaitMin} mins</div>
                    </div>
                    <div>
                      {plan.occupancy_tier === 'crowded' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">👥 Crowded</span>}
                      {plan.occupancy_tier === 'seated' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">🪑 Seated</span>}
                      {plan.occupancy_tier === 'empty' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">🪑 Empty</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tripPlan && tripPlan.length === 0 && fromCoords && toCoords && (
          <Card className="shadow-sm border-gray-200 bg-white overflow-hidden">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-2 text-orange-800">
              <NavigationArrow size={20} weight="fill" className="text-orange-500" />
              <div>
                <h3 className="font-bold text-sm">No direct bus available</h3>
                <p className="text-xs opacity-80">Showing walking route instead (approx {Math.round(
                  L.latLng(fromCoords.lat, fromCoords.lng).distanceTo(L.latLng(toCoords.lat, toCoords.lng)) / 80 // roughly 80m per min walking
                )} min)</p>
              </div>
            </div>
            <div className="h-64 relative z-0">
              <MapContainer 
                bounds={[
                  [fromCoords.lat, fromCoords.lng],
                  [toCoords.lat, toCoords.lng]
                ]} 
                zoomControl={false}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[fromCoords.lat, fromCoords.lng]} 
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [14, 14]
                  })} 
                />
                <Marker position={[toCoords.lat, toCoords.lng]} 
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="background-color: #f43f5e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [14, 14]
                  })} 
                />
                <Polyline 
                  positions={[
                    [fromCoords.lat, fromCoords.lng],
                    [toCoords.lat, toCoords.lng]
                  ]} 
                  pathOptions={{ color: '#f97316', weight: 4, dashArray: '8, 8', opacity: 0.8 }} 
                />
              </MapContainer>
            </div>
          </Card>
        )}

      </main>

      {/* Admin/Driver Links (Moved to bottom small text) */}
      <div className="px-4 py-4 flex justify-center gap-4 text-xs text-gray-400 font-medium">
        <button onClick={() => navigate('/driver/dashboard')} className="hover:text-gray-700 flex items-center gap-1">
          <SteeringWheel size={14}/> Driver
        </button>
        <button onClick={() => navigate('/admin')} className="hover:text-gray-700 flex items-center gap-1">
          <ChartBar size={14}/> Admin
        </button>
      </div>

      <footer className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between sticky bottom-0 z-10 shadow-sm">
        <Button
          variant="secondary"
          onClick={() => setSmsOpen(true)}
          className="w-full rounded-xl flex items-center justify-center gap-2 h-11 font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-800"
        >
          <ChatCircleText size={18} weight="bold" className="text-emerald-600" />
          {t('get_sms_alert')} (Feature Phone)
        </Button>
      </footer>

      <SMSModal open={smsOpen} onClose={() => setSmsOpen(false)} eta={{min: 12, max: 15}} stopName="Selected Stop" />
    </div>
  );
}
