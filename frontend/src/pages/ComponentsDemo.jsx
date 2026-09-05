import React, { useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import ETABox from '@/components/shared/ETABox';
import BusMarker from '@/components/shared/BusMarker';
import LanguageToggle from '@/components/shared/LanguageToggle';
import FollowButton from '@/components/shared/FollowButton';
import CheckinButton from '@/components/shared/CheckinButton';

export default function ComponentsDemo() {
  const [lang, setLang] = useState('en');
  const [following, setFollowing] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-16 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Shared Components Demo</h1>
        <p className="text-gray-500">Visual QA for Phase 0 shared components</p>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">StatusBadge</h2>
        <div className="flex flex-wrap gap-4">
          <StatusBadge status="live" />
          <StatusBadge status="scheduled" />
          <StatusBadge status="crowd_restored" />
          <StatusBadge status="offline" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">ETABox</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ETABox min={4} max={6} confidence={92} source="Live GPS" lastUpdateSeconds={12} />
          <ETABox min={10} max={15} confidence={40} source="Passenger Relay" lastUpdateSeconds={85} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">BusMarker (Placeholder)</h2>
        <div className="flex flex-wrap gap-6">
          <BusMarker status="live" heading={45} />
          <BusMarker status="scheduled" heading={180} />
          <BusMarker status="crowd_restored" heading={270} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">LanguageToggle</h2>
        <div className="flex flex-wrap gap-4">
          <LanguageToggle currentLang={lang} onChange={setLang} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">FollowButton</h2>
        <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-200 rounded-lg relative">
          <span className="text-sm text-gray-500 mr-8">Map Background Simulation</span>
          <FollowButton active={following} onToggle={() => setFollowing(!following)} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">CheckinButton</h2>
        <div className="flex flex-wrap gap-12">
          <CheckinButton busId="bus-1" onCheckin={() => alert('Checked in!')} pendingCount={0} />
          <CheckinButton busId="bus-2" onCheckin={() => alert('Checked in!')} pendingCount={1} requiredCount={3} />
        </div>
      </section>
    </div>
  );
}
