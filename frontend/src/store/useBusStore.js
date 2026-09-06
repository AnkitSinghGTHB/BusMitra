import { create } from 'zustand';
import { io } from 'socket.io-client';
import { DEFAULT_POLYLINE, DEFAULT_STOPS, INITIAL_ROUTES } from '@/data/transitData';

let socketInstance = null;
let freshnessInterval = null;

export const useBusStore = create((set, get) => ({
  selectedLanguage: 'en',
  setLanguage: (lang) => set({ selectedLanguage: lang }),

  routes: INITIAL_ROUTES,
  stops: DEFAULT_STOPS,
  polyline: DEFAULT_POLYLINE,
  activeRouteId: 'M1',
  informalStops: [],
  showInformalStops: true,
  toggleInformalStops: () => set((state) => ({ showInformalStops: !state.showInformalStops })),

  selectedStopId: 'S2',
  setSelectedStopId: (stopId) => {
    set({ selectedStopId: stopId });
    get().fetchEta(get().activeRouteId, stopId);
  },

  activeBus: {
    busId: 'M1',
    routeId: 'M1',
    lat: 30.8163,
    lng: 75.1720,
    speed: 22,
    heading: 220,
    status: 'live',
    snapped_to_corridor: true,
    occupancy_tier: 'seated'
  },

  etaData: {
    min: 8,
    max: 13,
    confidence: 94,
    source: 'ml_xgboost',
    stopName: 'Bhagwan Chowk'
  },

  freshnessSec: 0,
  checkinCount: 0,
  socketConnected: false,

  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  driverCustomRoute: null,
  setDriverCustomRoute: (route) => set({ driverCustomRoute: route }),

  tripPlan: null,
  planTrip: async (startLat, startLng, endLat, endLng) => {
    try {
      const res = await fetch('/api/trip-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startLat, startLng, endLat, endLng })
      });
      if (res.ok) {
        const data = await res.json();
        set({ tripPlan: data.routes });
      } else {
        set({ tripPlan: [] });
      }
    } catch (e) {
      set({ tripPlan: [] });
    }
  },

  // Initialize Real-time Socket & Pollers
  initSocket: () => {
    get().fetchRoutes();
    if (socketInstance) return;

    socketInstance = io(import.meta.env.VITE_BACKEND_URL || '/', { transports: ['websocket', 'polling'] });

    socketInstance.on('connect', () => {
      set({ socketConnected: true });
      get().fetchRoutes();
      get().fetchBuses();
      get().fetchInformalStops();
      get().fetchEta(get().activeRouteId, get().selectedStopId);
    });

    socketInstance.on('disconnect', () => {
      set({ socketConnected: false });
    });

    socketInstance.on('bus_update', (bus) => {
      if (bus && (bus.busId === get().activeRouteId || bus.routeId === get().activeRouteId || (get().activeRouteId === 'M1' && bus.busId === 'M1'))) {
        set((state) => {
          const updatedRoutes = state.routes.map((r) =>
            r.code === bus.routeId || r.id === bus.routeId || (bus.routeId === 'M1' && (r.code === 'M1' || r.id === 'r1'))
              ? { ...r, status: bus.status, etaMin: state.etaData.min, etaMax: state.etaData.max, confidence: state.etaData.confidence }
              : r
          );
          return {
            activeBus: { ...state.activeBus, ...bus },
            freshnessSec: 0,
            routes: updatedRoutes
          };
        });
        get().fetchEta(get().activeRouteId, get().selectedStopId);
      }
    });

    socketInstance.on('status_change', (change) => {
      set((state) => ({
        activeBus: { ...state.activeBus, status: change.status }
      }));
    });

    if (!freshnessInterval) {
      freshnessInterval = setInterval(() => {
        set((state) => ({ freshnessSec: state.freshnessSec + 1 }));
      }, 1000);
    }
  },

  // Fetch all 12 Indian regional routes from backend
  fetchRoutes: async () => {
    try {
      const res = await fetch('/api/routes');
      if (res.ok) {
        const serverRoutes = await res.json();
        if (serverRoutes && serverRoutes.length > 0) {
          set((state) => {
            const merged = serverRoutes.map((sr) => {
              const isM1 = sr.id === 'M1';
              const existing = state.routes.find((r) => r.code === sr.id || r.id === sr.id);
              return {
                id: sr.id,
                code: sr.id,
                name: sr.name,
                description: sr.description,
                color: sr.color,
                state: sr.state,
                stopCount: sr.stopCount,
                pointCount: sr.pointCount,
                startStop: sr.startStop,
                endStop: sr.endStop,
                status: isM1 ? state.activeBus.status : (existing?.status || 'scheduled'),
                etaMin: isM1 ? (state.etaData.min || 8) : (existing?.etaMin || 14),
                etaMax: isM1 ? (state.etaData.max || 13) : (existing?.etaMax || 22),
                confidence: isM1 ? (state.etaData.confidence || 94) : (existing?.confidence || 35)
              };
            });
            return { routes: merged };
          });
        }
      }
    } catch (e) {}
  },

  // Switch to a specific route corridor & load its polyline + stops
  loadRoute: async (routeId) => {
    const rId = routeId === 'r1' ? 'M1' : routeId;
    set({ activeRouteId: rId });

    try {
      const res = await fetch(`/api/routes/${rId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.polyline && data.polyline.length > 0) {
          const firstStop = data.stops?.[0];
          const secondStop = data.stops?.[1] || firstStop;

          set((state) => ({
            polyline: data.polyline,
            stops: data.stops || [],
            selectedStopId: secondStop ? secondStop.id : state.selectedStopId,
            activeBus: rId === 'M1' ? state.activeBus : {
              busId: rId,
              routeId: rId,
              lat: data.polyline[0].lat,
              lng: data.polyline[0].lng,
              speed: 0,
              heading: 0,
              status: 'scheduled',
              snapped_to_corridor: true,
              occupancy_tier: 'available'
            }
          }));

          if (secondStop) {
            get().fetchEta(rId, secondStop.id);
          }
        }
      }
    } catch (e) {}
  },

  fetchBuses: async () => {
    try {
      const res = await fetch('/api/buses');
      if (res.ok) {
        const list = await res.json();
        const currentRouteId = get().activeRouteId;
        const currentBus = list.find((b) => b.busId === currentRouteId || b.routeId === currentRouteId) || (currentRouteId === 'M1' ? list.find((b) => b.busId === 'M1') : null);
        
        if (currentBus) {
          set((state) => ({
            activeBus: { ...state.activeBus, ...currentBus },
            routes: state.routes.map((r) =>
              r.code === currentBus.routeId || r.id === currentBus.routeId || (currentBus.routeId === 'M1' && (r.code === 'M1' || r.id === 'r1'))
                ? { ...r, status: currentBus.status }
                : r
            )
          }));
        }
      }
    } catch (e) {}
  },

  fetchEta: async (busId = 'M1', stopId = 'S2') => {
    try {
      const res = await fetch(`/api/eta/${busId}?stopId=${stopId}`);
      if (res.ok) {
        const data = await res.json();
        const stop = get().stops.find((s) => s.id === stopId);
        set((state) => ({
          etaData: {
            ...data,
            stopName: stop ? stop.name : (data.stopName || 'Upcoming Stop')
          },
          routes: state.routes.map((r) =>
            r.code === busId || r.id === busId || (busId === 'M1' && (r.code === 'M1' || r.id === 'r1'))
              ? { ...r, etaMin: data.min, etaMax: data.max, confidence: data.confidence }
              : r
          )
        }));
      }
    } catch (e) {}
  },

  fetchInformalStops: async () => {
    try {
      const res = await fetch('/api/stops/informal');
      if (res.ok) {
        const data = await res.json();
        if (data.extracted_stops) {
          set({ informalStops: data.extracted_stops });
        }
      }
    } catch (e) {}
  },

  performCheckin: async () => {
    try {
      const bus = get().activeBus;
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: bus.busId || 'M1',
          lat: bus.lat,
          lng: bus.lng,
          userId: `commuter_${Math.random().toString(36).slice(2, 7)}`
        })
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({ checkinCount: (data.consensusCount || state.checkinCount + 1) }));
        get().fetchBuses();
        return { success: true, data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  sendSmsQuery: async (msg = 'BUS M1') => {
    try {
      const res = await fetch('/api/sms-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: msg, from: '+919876543210' })
      });
      if (res.ok) {
        const data = await res.json();
        return data.reply;
      }
      return 'SMS gateway error. Please try again.';
    } catch (e) {
      return 'Connection error. Offline buffer active.';
    }
  }
}));
