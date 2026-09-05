# BusMitra — Mobile-First Redesign & Walkthrough

The BusMitra UI has been redesigned from the ground up as a **mobile-first, app-like Progressive Web App (PWA)** tailored for daily commuters and drivers in Tier-2 and Tier-3 cities.

---

## 📱 What Was Changed & Improved

### 1. Mobile-First Layout & Ergonomics
- **Full-Bleed Map Experience**: The interactive Leaflet map now expands edge-to-edge behind the UI, removing cramped desktop sidebars.
- **Expandable Bottom Sheet (Chalo / Google Maps style)**:
  - **Peek State**: Displays the **Hero ETA Card** (large readable minutes, live status badge, confidence bar, freshness counter) and primary quick-action buttons.
  - **Expanded State**: Smoothly slides up when tapped to reveal the interactive **Stop Timeline** with individual stop arrival estimates and known delay warnings (`⚠️ Railway Crossing +7 min`, `⚠️ Chai Break +5 min`).
- **Touch-Friendly Bottom Navigation**:
  - 🗺️ **Commuter**: Full passenger transit app view.
  - 🎛️ **Driver & Test**: Mobile-optimized driver controls (Trip Start, GPS Step, Speed slider, 60s signal drop test).
  - 🗄️ **Database**: Card-based PostgreSQL + PostGIS inspector.
  - 📜 **Logs**: Real-time Socket.io packet stream.
- **Floating Glassmorphic Header**:
  - Compact header with live status pulse, route tag (`M1 • Moga ⇄ Dagru`), and one-tap language toggles (**EN | हिं | ਪੰ**).

---

## 🚀 How to Test on Mobile or Desktop

1. **Frontend:** Open **http://localhost:5173/** in any browser or mobile browser.
2. In Chrome / Edge DevTools, toggle **Device Toolbar** (`Ctrl+Shift+M` or `Cmd+Shift+M`) to view the mobile smartphone experience (e.g., iPhone 14/15, Pixel 7).
3. Tap **"▲ Swipe up for stops & timetable"** to test the bottom drawer.
4. Tap **"🙋 I'm on this bus"** to test crowd consensus.
5. Tap **"📱 SMS Alert"** to test feature phone accessibility.
