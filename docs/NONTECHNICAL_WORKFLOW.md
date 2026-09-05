# BusMitra – Non-Technical Workflows

## User Journey: Commuter (Smartphone)

| Step | Action | User Experience |
|------|--------|-----------------|
| 1 | Opens browser | Types `busmitra.vercel.app` |
| 2 | Selects route | Clicks "M1: Moga → Dagru" |
| 3 | Views map | Sees live moving bus marker |
| 4 | Reads ETA | "Arriving in 8-13 min | 92% Confidence" |
| 5 | (Optional) Gets SMS | Clicks "Get SMS Alert" → sees mock reply |
| 6 | (Optional) Changes language | Toggles to Hindi → UI translates |
| 7 | (Optional) Follows bus | Toggles "Follow Bus" → map auto-centers |

## User Journey: Commuter (Feature Phone)

| Step | Action | User Experience |
|------|--------|-----------------|
| 1 | Dials number | Calls dedicated number |
| 2 | Hangs up | After 1 ring (free) |
| 3 | Receives callback | Auto-callback from system |
| 4 | Hears voice | "Bus M1, 8-13 minute mein aa rahi hai" |
| **OR** | Sends SMS | Texts "BUS M1" to 77333 |
| **OR** | Receives reply | "Bus M1 arriving at Bhagwan Chowk in 8-13 min" |

## User Journey: Driver

| Step | Action | User Experience |
|------|--------|-----------------|
| 1 | Opens driver app | Types `driver.busmitra.vercel.app` |
| 2 | Scans QR code | Scans QR pasted on dashboard (one-time) |
| 3 | Selects route | Chooses "M1: Moga → Dagru" from dropdown |
| 4 | Starts trip | Clicks "START TRIP" (green button) |
| 5 | Drives | Phone sends GPS automatically |
| 6 | Ends trip | Clicks "END TRIP" (red button) |
| 7 | Checks score | Views punctuality leaderboard |

## User Journey: Municipal Admin

| Step | Action | User Experience |
|------|--------|-----------------|
| 1 | Logs in | Opens `admin.busmitra.vercel.app` |
| 2 | Views fleet | Sees all active buses on map |
| 3 | Checks leaderboard | Reviews driver punctuality rankings |
| 4 | Analyzes routes | Views average delays per route |
| 5 | Exports data | Downloads GTFS-Realtime feed |

## Cross-User Interaction Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DRIVER     │────▶│   BACKEND    │────▶│  PASSENGER   │
│  (Starts     │     │  (Processes  │     │  (Receives   │
│   Trip)      │     │   Location)  │     │    ETA)      │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  ADMIN       │
                    │  (Monitors   │
                    │   Fleet)     │
                    └──────────────┘
```

## Feature-Phone Accessibility Flow

```
[Feature Phone User] 
    → Missed call to 77333 
    → System detects missed call 
    → Auto-callback with voice: "Bus M1, 8-13 minute mein"
    
    → OR: SMS "BUS M1" to 77333
    → System parses SMS
    → Auto-reply: "Bus M1 arriving in 8-13 min at Bhagwan Chowk"
```

## Revenue Model Workflow

| User Type | Revenue Stream | Value Proposition |
|-----------|---------------|-------------------|
| **Commuters (Free)** | Ad-supported | Basic tracking + SMS |
| **Commuters (Pro)** | ₹49/month | Delay insurance + Crowd prediction + SOS |
| **Municipalities** | ₹5,000/month | Admin dashboard + Analytics + GTFS-RT |
| **B2B (Brands)** | ₹10,000/month | Sponsored alerts + Promotions |
