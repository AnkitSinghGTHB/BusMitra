import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Text, Badge, ProgressBar } from '@tremor/react';
import { ArrowLeft } from '@phosphor-icons/react';

const mockDrivers = [
  { rank: 1, name: 'Sandeep Singh', busId: 'PB-10-A1', score: 1450, onTimePercent: 98 },
  { rank: 2, name: 'Gurpreet Kaur', busId: 'PB-08-B2', score: 1320, onTimePercent: 94 },
  { rank: 3, name: 'Rajesh Kumar', busId: 'PB-29-M1-101', score: 1150, onTimePercent: 88 },
  { rank: 4, name: 'Amit Sharma', busId: 'PB-04-C3', score: 980, onTimePercent: 75 },
  { rank: 5, name: 'Vikram Jit', busId: 'PB-11-D4', score: 850, onTimePercent: 60 },
];

export default function DriverLeaderboard() {
  const navigate = useNavigate();
  const currentDriverName = 'Rajesh Kumar';

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans max-w-md mx-auto sm:border-x sm:border-gray-200">
      <header className="px-5 py-4 bg-white border-b border-gray-100 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/driver/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Go back">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Driver Leaderboard</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Top Drivers this Month</h2>
          </div>
          <div className="overflow-x-auto w-full scrollbar-hide">
            <Table className="min-w-[400px]">
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-12 text-center text-xs">Rank</TableHeaderCell>
                  <TableHeaderCell className="text-xs">Driver</TableHeaderCell>
                  <TableHeaderCell className="text-xs">Score</TableHeaderCell>
                  <TableHeaderCell className="w-32 text-xs">On-Time %</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockDrivers.map((item) => {
                  const isCurrent = item.name === currentDriverName;
                  return (
                    <TableRow key={item.name} className={isCurrent ? "bg-primary/5" : ""}>
                      <TableCell className="text-center font-bold text-lg align-middle">
                        {getRankBadge(item.rank)}
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isCurrent ? 'text-primary' : 'text-gray-800'}`}>
                              {item.name}
                            </span>
                            {isCurrent && (
                              <Badge size="xs" color="blue" className="px-1.5 py-0">You</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 w-max px-1.5 py-0.5 rounded">
                            {item.busId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Text className="font-bold text-gray-700">{item.score}</Text>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={item.onTimePercent} color={item.onTimePercent >= 90 ? 'emerald' : item.onTimePercent >= 75 ? 'amber' : 'red'} className="w-full h-2" />
                          <span className="text-xs font-medium w-8 text-gray-600">{item.onTimePercent}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
