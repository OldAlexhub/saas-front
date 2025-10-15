import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DriversList from './pages/drivers/DriversList';
import DriversCreate from './pages/drivers/DriversCreate';
import DriversEdit from './pages/drivers/DriversEdit';
import VehiclesList from './pages/vehicles/VehiclesList';
import VehiclesCreate from './pages/vehicles/VehiclesCreate';
import VehiclesEdit from './pages/vehicles/VehiclesEdit';
import ActivesList from './pages/actives/ActivesList';
import ActiveManage from './pages/actives/ActiveManage';
import BookingsList from './pages/bookings/BookingsList';
import BookingsCreate from './pages/bookings/BookingsCreate';
import BookingDetail from './pages/bookings/BookingDetail';
import AdminApprovals from './pages/admins/AdminApprovals';
import Fares from './pages/Fares';

function App() {
  const token = localStorage.getItem('token');

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* Protected routes */}
      <Route
        path="/"
        element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route
        path="/admins"
        element={token ? <AdminApprovals /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers"
        element={token ? <DriversList /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers/new"
        element={token ? <DriversCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers/:id"
        element={token ? <DriversEdit /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles"
        element={token ? <VehiclesList /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles/new"
        element={token ? <VehiclesCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles/:id"
        element={token ? <VehiclesEdit /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives"
        element={token ? <ActivesList /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives/new"
        element={token ? <ActiveManage /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives/:id"
        element={token ? <ActiveManage /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings"
        element={token ? <BookingsList /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings/new"
        element={token ? <BookingsCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings/:id"
        element={token ? <BookingDetail /> : <Navigate to="/login" replace />} />
      <Route
        path="/fares"
        element={token ? <Fares /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;