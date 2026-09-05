import React from 'react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Bus } from '@phosphor-icons/react';

const statusColors = {
  live: '#059669', // success
  scheduled: '#6b7280', // danger/grey
  crowd_restored: '#d97706', // warning
};

export function getBusMarkerIcon(status, heading) {
  const color = statusColors[status] || statusColors.scheduled;
  
  const iconHtml = renderToString(
    <div style={{ transform: `rotate(${heading}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Bus size={32} weight="fill" color={color} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'bus-marker-icon bg-transparent border-none',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// For demo page visualization only
export default function BusMarker({ status, heading }) {
  const color = statusColors[status] || statusColors.scheduled;
  return (
    <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50 w-32 h-32">
      <div style={{ transform: `rotate(${heading}deg)` }}>
        <Bus size={48} weight="fill" color={color} />
      </div>
      <span className="text-xs text-gray-500 mt-2">{status}</span>
    </div>
  );
}
