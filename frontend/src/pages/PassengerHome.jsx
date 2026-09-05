import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusStore } from '@/store/useBusStore';
import { Bus, MagnifyingGlass, ChatCircleText, SteeringWheel, ChartBar, MapPin } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import LanguageToggle from '@/components/shared/LanguageToggle';
import SMSModal from '@/components/shared/SMSModal';
import { useTranslation } from 'react-i18next';

const STATES = ['All', 'Punjab', 'Rajasthan', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Bihar', 'Assam'];

export default function PassengerHome() {
  const navigate = useNavigate();
  const {
    routes,
    activeBus,
    etaData,
    selectedLanguage,
    setLanguage,
    initSocket
  } = useBusStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [smsOpen, setSmsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const filteredRoutes = routes.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.state && r.state.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q));

    const matchesState = selectedState === 'All' || r.state === selectedState;
    return matchesSearch && matchesState;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans mx-auto max-w-md sm:border-x sm:border-gray-200">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
            <Bus size={22} weight="fill" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight">{t('app_title')}</h1>
            <p className="text-[10px] font-bold text-primary">Zero-Hardware Tier-2/3 Transit</p>
          </div>
        </div>
        <LanguageToggle currentLang={selectedLanguage} onChange={setLanguage} />
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search by city, corridor, or state (e.g. Bikaner, Moga, Gorakhpur)..."
            className="pl-9 h-11 rounded-xl text-sm bg-white shadow-sm border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* State Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {STATES.map((state) => {
            const isSelected = selectedState === state;
            return (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition-colors ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>

        {/* Quick Portals Navigation Pill Banner */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/driver/dashboard')}
            className="h-10 text-xs font-bold border-gray-200 bg-white hover:bg-gray-50 shadow-sm flex items-center justify-center gap-1.5"
          >
            <SteeringWheel size={16} className="text-emerald-600" weight="bold" />
            Driver Portal
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="h-10 text-xs font-bold border-gray-200 bg-white hover:bg-gray-50 shadow-sm flex items-center justify-center gap-1.5"
          >
            <ChartBar size={16} className="text-blue-600" weight="bold" />
            Admin Dashboard
          </Button>
        </div>

        {/* Routes List */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {selectedState === 'All' ? '12 Active Corridors' : `${selectedState} Corridors`} ({filteredRoutes.length})
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry & GTFS
            </span>
          </div>

          {filteredRoutes.map((route) => {
            const isM1 = route.code === 'M1' || route.id === 'r1';
            const status = isM1 ? activeBus.status : route.status;
            const min = isM1 ? (etaData.min || route.etaMin) : route.etaMin;
            const max = isM1 ? (etaData.max || route.etaMax) : route.etaMax;
            const conf = isM1 ? (etaData.confidence || route.confidence) : route.confidence;

            return (
              <Card
                key={route.id}
                className="cursor-pointer hover:border-primary/50 transition-all shadow-sm bg-white active:scale-[0.99] border-gray-200"
                onClick={() => navigate(`/map/${route.code || route.id}`)}
              >
                <CardContent className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {route.code}
                      </span>
                      <span className="text-gray-900 font-bold text-sm">{route.name}</span>
                      {route.state && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {route.state}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {route.startStop && route.endStop && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{route.startStop} → {route.endStop}</span>
                      {route.stopCount && (
                        <span className="shrink-0 text-gray-400">({route.stopCount} stops)</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {status === 'live' ? 'Next Bus Arriving In:' : 'Scheduled Arrival:'}
                      </span>
                      <span className="text-2xl font-black text-gray-900 tracking-tight">
                        {t('min_range', { min, max })}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t('confidence_label', { confidence: conf })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredRoutes.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              {t('no_routes_found')}
            </div>
          )}
        </div>
      </main>

      {/* Sticky Bottom SMS Button */}
      <footer className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between sticky bottom-0 z-10 shadow-sm">
        <Button
          variant="secondary"
          onClick={() => setSmsOpen(true)}
          className="w-full rounded-xl flex items-center justify-center gap-2 h-11 font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-800"
        >
          <ChatCircleText size={18} weight="bold" className="text-emerald-600" />
          {t('get_sms_alert')} (Feature Phone Mock)
        </Button>
      </footer>

      <SMSModal open={smsOpen} onClose={() => setSmsOpen(false)} eta={etaData} stopName="Bhagwan Chowk" />
    </div>
  );
}
