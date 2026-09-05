# BusMitra – File Structure

```
BusMitra/
│
├── backend/
│   ├── src/
│   │   ├── server.js                 # Main entry point (Express + Socket.io)
│   │   ├── api/
│   │   │   ├── start.js              # POST /start
│   │   │   ├── location.js           # POST /location
│   │   │   ├── checkin.js            # POST /checkin (consensus engine)
│   │   │   ├── buses.js              # GET /buses
│   │   │   └── eta.js                # GET /eta/:busId
│   │   ├── services/
│   │   │   ├── busCache.js           # In-memory store (Redis optional)
│   │   │   ├── consensus.js          # 3-user check-in validation
│   │   │   └── etaCalculator.js      # Distance/Historical Speed ETA
│   │   ├── utils/
│   │   │   ├── fallbackTimer.js      # Checks stale buses (60s → offline)
│   │   │   └── haversine.js          # Distance calculation
│   │   └── config/
│   │       └── index.js              # Environment variables
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json             # PWA manifest (install to home screen)
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── src/
│   │   ├── App.jsx                   # Main PWA entry
│   │   ├── main.jsx                  # ReactDOM.render
│   │   ├── components/
│   │   │   ├── Map.jsx               # Leaflet map with bus marker
│   │   │   ├── ETABox.jsx            # ETA display + Confidence + Freshness
│   │   │   ├── StatusBadge.jsx       # Live / Scheduled / Crowd indicator
│   │   │   ├── SMSMock.jsx           # Feature-phone SMS modal popup
│   │   │   ├── IVRMock.jsx           # Missed-call voice mock
│   │   │   ├── HindiToggle.jsx       # EN/HI/PA language switcher
│   │   │   ├── FollowButton.jsx      # Auto-center map on bus
│   │   │   └── CheckinButton.jsx     # "I'm on this bus" button
│   │   ├── hooks/
│   │   │   ├── useSocket.js          # Socket.io connection
│   │   │   └── useBusData.js         # GET /buses polling
│   │   ├── i18n/
│   │   │   ├── en.json               # English labels
│   │   │   ├── hi.json               # Hindi labels
│   │   │   └── pa.json               # Punjabi labels
│   │   ├── styles/
│   │   │   └── tailwind.css
│   │   └── utils/
│   │       └── api.js                # Axios/fetch wrapper
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── simulator/
│   ├── index.js                      # Standalone Node script
│   ├── routeM1.js                    # Hardcoded lat/lng array
│   └── pauseController.js            # Readline interface to Pause/Resume
│
├── data/
│   ├── routes.json                   # GTFS-style stop data
│   ├── stops.json                    # Stop coordinates
│   └── gtfs.json                     # Full GTFS schedule (fallback)
│
├── docs/
│   ├── presentation.pptx             # Final slide deck
│   └── screenshots/                  # Demo screenshots for PPT
│
├── scripts/
│   ├── test-api.sh                   # Curl commands for API testing
│   └── deploy.sh                     # Render + Vercel deployment
│
├── README.md
└── .gitignore
```

## Branch Strategy
```
main (protected)
├── dev/backend      # Backend King
├── dev/frontend     # Frontend Wizard
├── dev/simulator    # AI/ML Engineer
└── dev/data         # Newbie #1 (Data & Config)
```
