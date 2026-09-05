import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Warning, UsersThree } from '@phosphor-icons/react';

export default function SimulatorPanel() {
  const [buses, setBuses] = useState([]);

  const fetchSimulatorState = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sim/buses');
      if (res.ok) {
        const data = await res.json();
        setBuses(data);
      }
    } catch (e) {
      // Simulator might not be running
    }
  };

  useEffect(() => {
    fetchSimulatorState();
    const int = setInterval(fetchSimulatorState, 2000);
    return () => clearInterval(int);
  }, []);

  const handleControl = async (busId, action, value = null) => {
    try {
      await fetch('http://localhost:3001/api/sim/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, action, value })
      });
      fetchSimulatorState();
    } catch (e) {}
  };

  if (buses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50 text-sm">
        Simulator API not responding.<br/>Run <code>npm run sim</code> in the terminal to start the multi-bus edge simulator.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {buses.map((bus) => (
        <Card key={bus.busId} className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-black text-lg text-gray-900">{bus.busId}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bus.isPaused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {bus.isPaused ? 'PAUSED' : 'LIVE'}
              </span>
            </div>
            
            <div className="text-xs text-gray-500 font-mono">
              Speed: {bus.speed} km/h<br/>
              Progress: {bus.progress}
            </div>

            <div className="flex gap-2 mt-2">
              <Button 
                onClick={() => handleControl(bus.busId, bus.isPaused ? 'resume' : 'pause')}
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
              >
                {bus.isPaused ? <Play weight="fill" className="text-emerald-600 mr-1"/> : <Pause weight="fill" className="text-amber-600 mr-1"/>}
                {bus.isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button 
                onClick={() => handleControl(bus.busId, 'detour')}
                variant="outline" 
                size="sm" 
                className="w-8 px-0 h-8 text-rose-600 hover:bg-rose-50"
                title="Inject Detour"
              >
                <Warning weight="bold" />
              </Button>
            </div>

            <div className="flex justify-between items-center mt-1 pt-3 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                <UsersThree size={14}/> BLE Occupancy
              </span>
              <div className="flex gap-1">
                {[8, 24, 42].map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => handleControl(bus.busId, 'occupancy', lvl)}
                    className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${bus.bleCount === lvl ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
