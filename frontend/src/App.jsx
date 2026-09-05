import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PassengerHome from './pages/PassengerHome';
import LiveMap from './pages/LiveMap';
import { Toaster } from '@/components/ui/sonner';

const DriverOnboarding = React.lazy(() => import('./pages/DriverOnboarding'));
const DriverDashboard = React.lazy(() => import('./pages/DriverDashboard'));
const DriverLeaderboard = React.lazy(() => import('./pages/DriverLeaderboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const DesignSystem = React.lazy(() => import('./pages/DesignSystem'));
const ComponentsDemo = React.lazy(() => import('./pages/ComponentsDemo'));

// Simple fallback spinner for lazy loaded routes
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<PassengerHome />} />
          <Route path="/map/:routeId" element={<LiveMap />} />
          
          <Route path="/driver" element={<DriverOnboarding />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          <Route path="/driver/leaderboard" element={<DriverLeaderboard />} />
          
          <Route path="/admin" element={<AdminDashboard />} />
          
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="/components-demo" element={<ComponentsDemo />} />
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
