# BusMitra – UI/UX Design

## Design Philosophy

> *"Clean, Honest, and Accessible. The UI should make the user feel informed, not overwhelmed."*

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1a56db` | Primary buttons, header |
| Success Green | `#059669` | Live tracking status |
| Warning Yellow | `#d97706` | Crowd-restored status |
| Danger Grey | `#6b7280` | Scheduled/offline status |
| Background | `#f3f4f6` | Page background |
| Card White | `#ffffff` | Card backgrounds |

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Header | Inter | 24px | 700 |
| Subheader | Inter | 16px | 600 |
| ETA Range | Inter | 32px | 800 |
| Body | Inter | 14px | 400 |
| Small | Inter | 12px | 400 |

## Screen 1: Passenger Home

```
┌────────────────────────────────────┐
│  🚌 BusMitra                      │ ← Header
│  ──────────────────────────────── │
│  [🔍 Search route or stop...]      │ ← Search bar
│                                     │
│  ┌─────────────────────────────┐  │
│  │  M1  Moga → Dagru           │  │ ← Route card
│  │  🟢 Live  •  8-13 min       │  │
│  │  92% Confidence             │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  M2  Railway → Civil Lines  │  │
│  │  ⚪ Scheduled • 18-22 min   │  │
│  │  40% Confidence             │  │
│  └─────────────────────────────┘  │
│                                     │
│  [📱 Get SMS Alert] [🌐 Hindi]    │ ← Footer
└────────────────────────────────────┘
```

## Screen 2: Live Map (Passenger)

```
┌────────────────────────────────────┐
│  [← Back]  M1: Moga → Dagru   [🌐]│ ← Top bar
│  ──────────────────────────────── │
│                                     │
│   ┌─────────────────────────┐     │
│   │  🟢 Live               │     │ ← Status badge
│   │  8-13 min  |  92%      │     │ ← ETA Box
│   │  Updated 12s ago       │     │ ← Freshness timer
│   └─────────────────────────┘     │
│                                     │
│          🌳                         │
│        [Bus Icon]                   │ ← Map
│          🏫                         │
│          🏪                         │
│                                     │
│            [📍 Follow]              │ ← Follow toggle
│                                     │
│  ┌─────────────────────────────┐  │
│  │  📍 Bhagwan Chowk (8-13 min)│  │ ← Stop list
│  │  📍 Railway Station (14-18) │  │
│  │  📍 Dagru Village (20-25)   │  │
│  └─────────────────────────────┘  │
│                                     │
│  [I'm on this bus]  [📱 Get SMS]  │ ← Actions
└────────────────────────────────────┘
```

## Screen 3: SMS Mock Modal (Feature Phone)

```
┌────────────────────────────────────┐
│  ┌──────────────────────────┐     │
│  │  📱 FEATURE PHONE        │     │
│  │  ─────────────────────── │     │
│  │  To: 77333                │     │
│  │  Msg: "BUS M1"            │     │
│  │                           │     │
│  │  ┌────────────────────┐  │     │
│  │  │  REPLY:            │  │     │
│  │  │  Bus M1 arriving   │  │     │
│  │  │  in 8-13 min at    │  │     │
│  │  │  Bhagwan Chowk.    │  │     │
│  │  └────────────────────┘  │     │
│  │                           │     │
│  │  [ Close ]               │     │
│  └──────────────────────────┘     │
└────────────────────────────────────┘
```

## Screen 4: Driver Dashboard

```
┌────────────────────────────────────┐
│  🚌 Driver Dashboard              │
│  ──────────────────────────────── │
│  Driver: Rajesh Kumar              │
│  Bus: PB-29-M1-101                 │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  Route: M1 Moga → Dagru     │  │
│  │  [▼ Select Route]          │  │
│  │                             │  │
│  │  [  🟢 START TRIP  ]       │  │
│  │                             │  │
│  │  [  🔴 END TRIP    ]       │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  🏆 Your Score: 85 pts     │  │
│  │  Rank: #3 of 12 drivers    │  │
│  │  [View Leaderboard]        │  │
│  └─────────────────────────────┘  │
│                                     │
│  [📢 Report Issue]                 │
└────────────────────────────────────┘
```

## Screen 5: Admin Dashboard

```
┌────────────────────────────────────┐
│  📊 BusMitra Admin                 │
│  ──────────────────────────────── │
│  [Fleet] [Leaderboard] [Analytics] │ ← Tabs
│                                     │
│  ┌─────────────────────────────┐  │
│  │  Live Fleet Map             │  │
│  │  [Map with all buses]       │  │
│  │  🟢 12 buses online         │  │
│  │  ⚪ 3 buses offline         │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  Driver Leaderboard         │  │
│  │  1. Ramesh  - 95 pts 🥇    │  │
│  │  2. Suresh  - 88 pts 🥈    │  │
│  │  3. Rajesh  - 85 pts 🥉    │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  Route Analytics            │  │
│  │  M1: Avg delay 4.2 min     │  │
│  │  M2: Avg delay 6.8 min     │  │
│  └─────────────────────────────┘  │
└────────────────────────────────────┘
```

## Responsive Breakpoints

| Device | Breakpoint | Layout |
|--------|------------|--------|
| Mobile | < 640px | Single column, bottom sheet |
| Tablet | 640px - 1024px | Two column |
| Desktop | > 1024px | Full width with side panels |

## UI Component Library

| Component | Description | Props |
|-----------|-------------|-------|
| `ETABox` | Displays ETA range + confidence | `min`, `max`, `confidence`, `source` |
| `StatusBadge` | Live/Scheduled/Crowd status | `status` (live/scheduled/crowd) |
| `BusMarker` | Animated map marker | `lat`, `lng`, `heading`, `color` |
| `LanguageToggle` | EN/HI/PA buttons | `currentLang`, `onChange` |
| `SMSModal` | Feature-phone mock | `open`, `onClose`, `eta` |
| `FollowButton` | Map auto-center toggle | `active`, `onToggle` |
| `CheckinButton` | "I'm on this bus" | `busId`, `onCheckin` |

## Accessibility Considerations

| Feature | Implementation |
|---------|---------------|
| Screen Reader | ARIA labels on all interactive elements |
| Color Blindness | Status icons + text labels (not just color) |
| Touch Targets | Minimum 44px × 44px buttons |
| Font Size | Minimum 14px body text |
| Contrast Ratio | WCAG AA compliant (4.5:1) |
| Keyboard Navigation | Full tab flow through interface |
