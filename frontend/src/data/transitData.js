export const DEFAULT_POLYLINE = [
  { lat: 30.8163, lng: 75.1720 },
  { lat: 30.8165, lng: 75.1710 },
  { lat: 30.8170, lng: 75.1695 },
  { lat: 30.8175, lng: 75.1685 },
  { lat: 30.8180, lng: 75.1670 },
  { lat: 30.8185, lng: 75.1650 },
  { lat: 30.8190, lng: 75.1630 },
  { lat: 30.8195, lng: 75.1600 },
  { lat: 30.8205, lng: 75.1570 },
  { lat: 30.8215, lng: 75.1530 },
  { lat: 30.8225, lng: 75.1490 },
  { lat: 30.8240, lng: 75.1440 },
  { lat: 30.8255, lng: 75.1390 },
  { lat: 30.8270, lng: 75.1340 },
  { lat: 30.8290, lng: 75.1280 },
  { lat: 30.8310, lng: 75.1220 },
  { lat: 30.8325, lng: 75.1180 },
  { lat: 30.8335, lng: 75.1165 },
  { lat: 30.8345, lng: 75.1155 },
  { lat: 30.8350, lng: 75.1150 }
];

export const DEFAULT_STOPS = [
  { id: "S1", name: "Moga Bus Stand", lat: 30.8163, lng: 75.1720, order: 1, routeId: "M1" },
  { id: "S2", name: "Bhagwan Chowk", lat: 30.8175, lng: 75.1685, order: 2, routeId: "M1" },
  { id: "S3", name: "Railway Station", lat: 30.8190, lng: 75.1630, order: 3, routeId: "M1" },
  { id: "S4", name: "Civil Hospital", lat: 30.8215, lng: 75.1530, order: 4, routeId: "M1" },
  { id: "S5", name: "Guru Nanak Chowk", lat: 30.8240, lng: 75.1440, order: 5, routeId: "M1" },
  { id: "S6", name: "Kot Ise Khan Road", lat: 30.8270, lng: 75.1340, order: 6, routeId: "M1" },
  { id: "S7", name: "Dairy Complex", lat: 30.8310, lng: 75.1220, order: 7, routeId: "M1" },
  { id: "S8", name: "Dagru Village", lat: 30.8350, lng: 75.1150, order: 8, routeId: "M1" }
];

export const INITIAL_ROUTES = [
  {
    id: "r1",
    code: "M1",
    name: "Moga ⇄ Dagru",
    description: "Main city corridor from Moga Bus Stand to Dagru Village via GT Road",
    status: "live",
    etaMin: 6,
    etaMax: 11,
    confidence: 94
  },
  {
    id: "r2",
    code: "M2",
    name: "Moga ⇄ Kot Ise Khan",
    description: "Regional transit link via Zira Road",
    status: "scheduled",
    etaMin: 18,
    etaMax: 24,
    confidence: 40
  },
  {
    id: "r3",
    code: "M3",
    name: "Moga ⇄ Baghapurana",
    description: "Southern corridor connecting rural villages",
    status: "crowd_restored",
    etaMin: 12,
    etaMax: 17,
    confidence: 68
  }
];
